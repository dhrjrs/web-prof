import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const createdAt = (name = 'created_at') => integer(name, { mode: 'timestamp_ms' })
  .notNull()
  .default(sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000)`)

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').$type<'pelanggan' | 'penjualan'>().notNull(),
  createdAt: createdAt(),
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('pcs'),
  price: integer('price').notNull().default(0),
  discountPercent: integer('discount_percent').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  categoryId: integer('category_id'),
  createdAt: createdAt(),
})

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  nik: text('nik'),
  npwp: text('npwp'),
  email: text('email'),
  categoryId: integer('category_id'),
  createdAt: createdAt(),
})

export const salespeople = sqliteTable('salespeople', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  commissionPercent: real('commission_percent').notNull().default(0),
  createdAt: createdAt(),
})

export type SaleStage = 'penawaran' | 'pesanan' | 'dikirim' | 'faktur' | 'lunas' | 'batal'

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  number: text('number').notNull().unique(),
  stage: text('stage').$type<SaleStage>().notNull().default('penawaran'),
  customerId: integer('customer_id').notNull(),
  salespersonId: integer('salesperson_id'),
  categoryId: integer('category_id'),
  subtotal: integer('subtotal').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  total: integer('total').notNull().default(0),
  paid: integer('paid').notNull().default(0),
  notes: text('notes'),
  shippedAt: integer('shipped_at', { mode: 'timestamp_ms' }),
  invoicedAt: integer('invoiced_at', { mode: 'timestamp_ms' }),
  createdAt: createdAt(),
})

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull(),
  productId: integer('product_id').notNull(),
  qty: integer('qty').notNull(),
  price: integer('price').notNull(),
  discountPercent: integer('discount_percent').notNull().default(0),
  returnedQty: integer('returned_qty').notNull().default(0),
})

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull(),
  kind: text('kind').$type<'uang_muka' | 'penerimaan'>().notNull(),
  amount: integer('amount').notNull(),
  method: text('method').notNull().default('tunai'),
  note: text('note'),
  createdAt: createdAt(),
})

export const saleReturns = sqliteTable('sale_returns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull(),
  saleItemId: integer('sale_item_id').notNull(),
  productId: integer('product_id').notNull(),
  qty: integer('qty').notNull(),
  amount: integer('amount').notNull().default(0),
  reason: text('reason'),
  createdAt: createdAt(),
})

export const salesTargets = sqliteTable('sales_targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  period: text('period').notNull(),
  salespersonId: integer('salesperson_id'),
  amount: integer('amount').notNull(),
  createdAt: createdAt(),
})

export const checkIns = sqliteTable('check_ins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  salespersonId: integer('salesperson_id').notNull(),
  customerId: integer('customer_id').notNull(),
  note: text('note'),
  createdAt: createdAt(),
})

export const gallonLoans = sqliteTable('gallon_loans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').notNull(),
  qty: integer('qty').notNull(),
  returnedQty: integer('returned_qty').notNull().default(0),
  deposit: integer('deposit').notNull().default(0),
  dueDate: text('due_date'),
  note: text('note'),
  borrowedAt: createdAt('borrowed_at'),
  returnedAt: integer('returned_at', { mode: 'timestamp_ms' }),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
