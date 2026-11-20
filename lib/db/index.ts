import 'server-only'

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

mkdirSync(resolve(process.cwd(), 'data'), { recursive: true })

const globalForDb = globalThis as typeof globalThis & { libsqlClient?: Client }

export const client =
  globalForDb.libsqlClient ?? createClient({ url: 'file:./data/web-prof.sqlite' })

if (process.env.NODE_ENV !== 'production') globalForDb.libsqlClient = client

export const db = drizzle(client, { schema })

await client.execute('PRAGMA busy_timeout = 10000')
const existingTables = await client.execute(`
  SELECT COUNT(*) AS count FROM sqlite_master
  WHERE type = 'table' AND name IN (
    'categories', 'products', 'customers', 'salespeople', 'sales', 'sale_items',
    'payments', 'sale_returns', 'sales_targets', 'check_ins', 'gallon_loans', 'settings'
  )
`)

if (Number(existingTables.rows[0]?.count ?? 0) < 12) {
  await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'pcs',
    price INTEGER NOT NULL DEFAULT 0,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    category_id INTEGER,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS salespeople (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    commission_percent REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    stage TEXT NOT NULL DEFAULT 'penawaran',
    customer_id INTEGER NOT NULL,
    salesperson_id INTEGER,
    category_id INTEGER,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    paid INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    shipped_at INTEGER,
    invoiced_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    price INTEGER NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    returned_qty INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL DEFAULT 'tunai',
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS sale_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    sale_item_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS sales_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    salesperson_id INTEGER,
    amount INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salesperson_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS gallon_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    returned_qty INTEGER NOT NULL DEFAULT 0,
    deposit INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    note TEXT,
    borrowed_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    returned_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS gallon_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    note TEXT,
    returned_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('gallon_total', '0');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_seller_tin', '0761268432731000');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_seller_idtku', '0761268432731000000000');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_trx_code', '04');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_vat_rate', '12');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_use_other_tax_base', 'true');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_price_includes_vat', 'false');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_default_unit', 'UM.0018');
`)
}

// Ensure customer columns exist for tax/e-faktur
for (const col of ['nik TEXT', 'npwp TEXT', 'email TEXT']) {
  try {
    await client.execute(`ALTER TABLE customers ADD COLUMN ${col}`)
  } catch {
    // column already exists
  }
}

// Ensure gallon_returns table exists
await client.execute(`
  CREATE TABLE IF NOT EXISTS gallon_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    note TEXT,
    returned_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
`)

// Backfill any previous returns into gallon_returns if not already present
await client.execute(`
  INSERT INTO gallon_returns (loan_id, customer_id, qty, returned_at)
  SELECT id, customer_id, returned_qty, coalesce(returned_at, borrowed_at)
  FROM gallon_loans
  WHERE returned_qty > 0 AND NOT EXISTS (
    SELECT 1 FROM gallon_returns WHERE gallon_returns.loan_id = gallon_loans.id
  );
`)

