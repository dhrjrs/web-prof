import 'server-only'

import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  categories,
  checkIns,
  customers,
  gallonLoans,
  payments,
  products,
  saleItems,
  saleReturns,
  sales,
  salespeople,
  salesTargets,
  settings,
  type SaleStage,
} from '@/lib/db/schema'
import { currentPeriod } from '@/lib/format'

const invoicedStages: SaleStage[] = ['faktur', 'lunas']
const inPeriod = (period: string) =>
  sql`to_char(${sales.invoicedAt} at time zone 'Asia/Jakarta', 'YYYY-MM') = ${period}`

export async function listProducts() {
  return db.select().from(products).orderBy(asc(products.name))
}

export async function listCategories(type?: 'pelanggan' | 'penjualan') {
  return db
    .select()
    .from(categories)
    .where(type ? eq(categories.type, type) : undefined)
    .orderBy(asc(categories.name))
}

export async function listCustomers() {
  const outstanding = sql<number>`coalesce((select sum(${gallonLoans.qty} - ${gallonLoans.returnedQty}) from ${gallonLoans} where ${gallonLoans.customerId} = ${customers.id}), 0)::int`
  return db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      address: customers.address,
      categoryId: customers.categoryId,
      categoryName: categories.name,
      gallonsOut: outstanding,
    })
    .from(customers)
    .leftJoin(categories, eq(categories.id, customers.categoryId))
    .orderBy(asc(customers.name))
}

export async function listSalespeople() {
  return db.select().from(salespeople).orderBy(asc(salespeople.name))
}

export async function listSales(stage?: SaleStage) {
  return db
    .select({
      id: sales.id,
      number: sales.number,
      stage: sales.stage,
      total: sales.total,
      paid: sales.paid,
      createdAt: sales.createdAt,
      customerName: customers.name,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .where(stage ? eq(sales.stage, stage) : undefined)
    .orderBy(desc(sales.createdAt))
    .limit(200)
}

export async function getSale(id: number) {
  const [sale] = await db
    .select({
      sale: sales,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      salespersonName: salespeople.name,
      categoryName: categories.name,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .leftJoin(salespeople, eq(salespeople.id, sales.salespersonId))
    .leftJoin(categories, eq(categories.id, sales.categoryId))
    .where(eq(sales.id, id))
  if (!sale) return null

  const [items, paymentRows, returnRows] = await Promise.all([
    db
      .select({ item: saleItems, productName: products.name, unit: products.unit })
      .from(saleItems)
      .leftJoin(products, eq(products.id, saleItems.productId))
      .where(eq(saleItems.saleId, id))
      .orderBy(asc(saleItems.id)),
    db.select().from(payments).where(eq(payments.saleId, id)).orderBy(asc(payments.createdAt)),
    db
      .select({ ret: saleReturns, productName: products.name })
      .from(saleReturns)
      .leftJoin(products, eq(products.id, saleReturns.productId))
      .where(eq(saleReturns.saleId, id))
      .orderBy(asc(saleReturns.createdAt)),
  ])
  return { ...sale, items, payments: paymentRows, returns: returnRows }
}

export async function getGallonSummary() {
  const [[total], [{ out }]] = await Promise.all([
    db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'gallon_total')),
    db
      .select({ out: sql<number>`coalesce(sum(${gallonLoans.qty} - ${gallonLoans.returnedQty}), 0)::int` })
      .from(gallonLoans),
  ])
  const totalCount = Number(total?.value ?? 0)
  return { total: totalCount, out, available: totalCount - out }
}

export async function listGallonLoans(active: boolean) {
  return db
    .select({ loan: gallonLoans, customerName: customers.name, customerPhone: customers.phone })
    .from(gallonLoans)
    .leftJoin(customers, eq(customers.id, gallonLoans.customerId))
    .where(active ? isNull(gallonLoans.returnedAt) : sql`${gallonLoans.returnedAt} is not null`)
    .orderBy(active ? sql`${gallonLoans.dueDate} asc nulls last` : desc(gallonLoans.returnedAt))
    .limit(200)
}

export async function getTeamOverview() {
  const period = currentPeriod()
  const [people, monthSales, targets, recentCheckIns] = await Promise.all([
    listSalespeople(),
    db
      .select({
        salespersonId: sales.salespersonId,
        total: sql<number>`coalesce(sum(${sales.total}), 0)::int`,
      })
      .from(sales)
      .where(and(inArray(sales.stage, invoicedStages), inPeriod(period)))
      .groupBy(sales.salespersonId),
    db.select().from(salesTargets).where(eq(salesTargets.period, period)),
    db
      .select({
        checkIn: checkIns,
        salespersonName: salespeople.name,
        customerName: customers.name,
      })
      .from(checkIns)
      .leftJoin(salespeople, eq(salespeople.id, checkIns.salespersonId))
      .leftJoin(customers, eq(customers.id, checkIns.customerId))
      .orderBy(desc(checkIns.createdAt))
      .limit(20),
  ])

  const storeTotal = monthSales.reduce((sum, r) => sum + r.total, 0)
  const storeTarget = targets.find((t) => t.salespersonId === null)?.amount ?? 0
  const rows = people.map((p) => {
    const total = monthSales.find((s) => s.salespersonId === p.id)?.total ?? 0
    return {
      ...p,
      monthSales: total,
      commission: Math.round((total * Number(p.commissionPercent)) / 100),
      target: targets.find((t) => t.salespersonId === p.id)?.amount ?? 0,
    }
  })
  return { period, storeTotal, storeTarget, rows, recentCheckIns }
}

export async function getDashboard() {
  const period = currentPeriod()
  const today = new Date().toISOString().slice(0, 10)
  const [[month], [receivable], lowStock, gallons, dueLoans, recent, [target], [pending]] =
    await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${sales.total}), 0)::int`, count: sql<number>`count(*)::int` })
        .from(sales)
        .where(and(inArray(sales.stage, invoicedStages), inPeriod(period))),
      db
        .select({ total: sql<number>`coalesce(sum(${sales.total} - ${sales.paid}), 0)::int` })
        .from(sales)
        .where(eq(sales.stage, 'faktur')),
      db
        .select()
        .from(products)
        .where(lte(products.stock, products.minStock))
        .orderBy(asc(products.stock))
        .limit(6),
      getGallonSummary(),
      db
        .select({ loan: gallonLoans, customerName: customers.name })
        .from(gallonLoans)
        .leftJoin(customers, eq(customers.id, gallonLoans.customerId))
        .where(and(isNull(gallonLoans.returnedAt), lte(gallonLoans.dueDate, today)))
        .orderBy(asc(gallonLoans.dueDate))
        .limit(6),
      listSales().then((rows) => rows.slice(0, 6)),
      db
        .select({ amount: salesTargets.amount })
        .from(salesTargets)
        .where(and(eq(salesTargets.period, period), isNull(salesTargets.salespersonId))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(sales)
        .where(inArray(sales.stage, ['pesanan', 'dikirim'])),
    ])

  return {
    period,
    monthSales: month.total,
    invoiceCount: month.count,
    receivable: receivable.total,
    pendingOrders: pending.count,
    lowStock,
    gallons,
    dueLoans,
    recent,
    target: target?.amount ?? 0,
  }
}
