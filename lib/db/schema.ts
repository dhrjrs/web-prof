import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<'pelanggan' | 'penjualan'>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('pcs'),
  price: integer('price').notNull().default(0),
  discountPercent: integer('discount_percent').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  categoryId: integer('category_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  categoryId: integer('category_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const salespeople = pgTable('salespeople', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  commissionPercent: numeric('commission_percent', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SaleStage = 'penawaran' | 'pesanan' | 'dikirim' | 'faktur' | 'lunas' | 'batal'

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
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
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  invoicedAt: timestamp('invoiced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull(),
  productId: integer('product_id').notNull(),
  qty: integer('qty').notNull(),
  price: integer('price').notNull(),
  discountPercent: integer('discount_percent').notNull().default(0),
  returnedQty: integer('returned_qty').notNull().default(0),
})

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull(),
  kind: text('kind').$type<'uang_muka' | 'penerimaan'>().notNull(),
  amount: integer('amount').notNull(),
  method: text('method').notNull().default('tunai'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const saleReturns = pgTable('sale_returns', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull(),
  saleItemId: integer('sale_item_id').notNull(),
  productId: integer('product_id').notNull(),
  qty: integer('qty').notNull(),
  amount: integer('amount').notNull().default(0),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const salesTargets = pgTable('sales_targets', {
  id: serial('id').primaryKey(),
  period: text('period').notNull(),
  salespersonId: integer('salesperson_id'),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  salespersonId: integer('salesperson_id').notNull(),
  customerId: integer('customer_id').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const gallonLoans = pgTable('gallon_loans', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull(),
  qty: integer('qty').notNull(),
  returnedQty: integer('returned_qty').notNull().default(0),
  deposit: integer('deposit').notNull().default(0),
  dueDate: date('due_date'),
  note: text('note'),
  borrowedAt: timestamp('borrowed_at', { withTimezone: true }).notNull().defaultNow(),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
