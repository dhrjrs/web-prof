import { doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

const createdAt = (name = 'created_at') => timestamp(name, { withTimezone: true, mode: 'date' }).notNull().defaultNow()
const nullableTimestamp = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<'pelanggan' | 'penjualan'>().notNull(),
  createdAt: createdAt(),
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
  createdAt: createdAt(),
})

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  nik: text('nik'),
  npwp: text('npwp'),
  email: text('email'),
  categoryId: integer('category_id'),
  createdAt: createdAt(),
})

export const salespeople = pgTable('salespeople', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  commissionPercent: doublePrecision('commission_percent').notNull().default(0),
  createdAt: createdAt(),
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
  shippedAt: nullableTimestamp('shipped_at'),
  invoicedAt: nullableTimestamp('invoiced_at'),
  createdAt: createdAt(),
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
  createdAt: createdAt(),
})

export const saleReturns = pgTable('sale_returns', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull(),
  saleItemId: integer('sale_item_id').notNull(),
  productId: integer('product_id').notNull(),
  qty: integer('qty').notNull(),
  amount: integer('amount').notNull().default(0),
  reason: text('reason'),
  createdAt: createdAt(),
})

export const salesTargets = pgTable('sales_targets', {
  id: serial('id').primaryKey(),
  period: text('period').notNull(),
  salespersonId: integer('salesperson_id'),
  amount: integer('amount').notNull(),
  createdAt: createdAt(),
})

export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  salespersonId: integer('salesperson_id').notNull(),
  customerId: integer('customer_id').notNull(),
  note: text('note'),
  createdAt: createdAt(),
})

export const gallonLoans = pgTable('gallon_loans', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull(),
  qty: integer('qty').notNull(),
  returnedQty: integer('returned_qty').notNull().default(0),
  deposit: integer('deposit').notNull().default(0),
  dueDate: text('due_date'),
  note: text('note'),
  borrowedAt: createdAt('borrowed_at'),
  returnedAt: nullableTimestamp('returned_at'),
})

export const gallonReturns = pgTable('gallon_returns', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id').notNull(),
  customerId: integer('customer_id').notNull(),
  qty: integer('qty').notNull(),
  note: text('note'),
  returnedAt: createdAt('returned_at'),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
