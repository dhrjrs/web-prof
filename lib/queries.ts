import 'server-only'

import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  categories,
  customers,
  gallonLoans,
  gallonReturns,
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
  sql`to_char(${sales.invoicedAt} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = ${period}`

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
  const outstanding = sql<number>`coalesce((select sum(${gallonLoans.qty} - ${gallonLoans.returnedQty})::int from ${gallonLoans} where ${gallonLoans.customerId} = ${customers.id}), 0)::int`
  return db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      address: customers.address,
      nik: customers.nik,
      npwp: customers.npwp,
      email: customers.email,
      categoryId: customers.categoryId,
      categoryName: categories.name,
      gallonsOut: outstanding,
    })
    .from(customers)
    .leftJoin(categories, eq(categories.id, customers.categoryId))
    .orderBy(asc(customers.name))
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

export type NotaFilter = { from?: string; to?: string; customerId?: number }

const jakartaDate = sql`(${sales.createdAt} AT TIME ZONE 'Asia/Jakarta')::date`

export async function listNotas({ from, to, customerId }: NotaFilter) {
  const itemSummary = sql<string>`coalesce((
    select string_agg(item_text, ', ' order by item_id)
    from (
      select ${products.name} || ' x' || ${saleItems.qty} as item_text, ${saleItems.id} as item_id
      from ${saleItems} left join ${products} on ${products.id} = ${saleItems.productId}
      where ${saleItems.saleId} = ${sales.id}
    ) item_rows
  ), '')`
  return db
    .select({
      id: sales.id,
      number: sales.number,
      stage: sales.stage,
      total: sales.total,
      paid: sales.paid,
      createdAt: sales.createdAt,
      customerId: sales.customerId,
      customerName: customers.name,
      items: itemSummary,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .where(
      and(
        from ? sql`${jakartaDate} >= ${from}::date` : undefined,
        to ? sql`${jakartaDate} <= ${to}::date` : undefined,
        customerId ? eq(sales.customerId, customerId) : undefined,
      ),
    )
    .orderBy(desc(sales.createdAt))
    .limit(500)
}

export async function getNotaForEdit(id: number) {
  const [sale] = await db.select().from(sales).where(eq(sales.id, id))
  if (!sale) return null
  const [items, [{ returnCount }]] = await Promise.all([
    db.select().from(saleItems).where(eq(saleItems.saleId, id)).orderBy(asc(saleItems.id)),
    db
      .select({ returnCount: sql<number>`count(*)::int` })
      .from(saleReturns)
      .where(eq(saleReturns.saleId, id)),
  ])
  return { sale, items, hasReturns: returnCount > 0 }
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
    .where(
      active
        ? sql`${gallonLoans.returnedQty} < ${gallonLoans.qty}`
        : sql`${gallonLoans.returnedQty} > 0`,
    )
    .orderBy(
      active ? asc(sql`case when ${gallonLoans.dueDate} is null then 1 else 0 end`) : desc(gallonLoans.returnedAt),
      ...(active ? [asc(gallonLoans.dueDate)] : []),
    )
    .limit(200)
}

export async function listGallonReturns() {
  return db
    .select({
      id: gallonReturns.id,
      loanId: gallonReturns.loanId,
      customerId: gallonReturns.customerId,
      qty: gallonReturns.qty,
      note: gallonReturns.note,
      returnedAt: gallonReturns.returnedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      totalLoanQty: gallonLoans.qty,
      currentReturnedQty: gallonLoans.returnedQty,
      borrowedAt: gallonLoans.borrowedAt,
      deposit: gallonLoans.deposit,
    })
    .from(gallonReturns)
    .leftJoin(gallonLoans, eq(gallonLoans.id, gallonReturns.loanId))
    .leftJoin(customers, eq(customers.id, gallonReturns.customerId))
    .orderBy(desc(gallonReturns.returnedAt))
    .limit(300)
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
        .where(and(sql`${gallonLoans.returnedQty} < ${gallonLoans.qty}`, lte(gallonLoans.dueDate, today)))
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

export type TaxSalesFilter = {
  from?: string
  to?: string
  stage?: SaleStage
  saleIds?: number[]
}

export async function listTaxSales(filter: TaxSalesFilter = {}) {
  const conditions = []
  if (filter.stage) {
    conditions.push(eq(sales.stage, filter.stage))
  }
  if (filter.from) {
    const fromMs = new Date(`${filter.from}T00:00:00+07:00`).getTime()
    conditions.push(gte(sales.createdAt, new Date(fromMs)))
  }
  if (filter.to) {
    const toMs = new Date(`${filter.to}T23:59:59+07:00`).getTime()
    conditions.push(lte(sales.createdAt, new Date(toMs)))
  }
  if (filter.saleIds && filter.saleIds.length > 0) {
    conditions.push(inArray(sales.id, filter.saleIds))
  }

  const salesRows = await db
    .select({
      id: sales.id,
      number: sales.number,
      stage: sales.stage,
      total: sales.total,
      paid: sales.paid,
      createdAt: sales.createdAt,
      invoicedAt: sales.invoicedAt,
      customer: {
        name: customers.name,
        address: customers.address,
        nik: customers.nik,
        npwp: customers.npwp,
        email: customers.email,
      },
    })
    .from(sales)
    .innerJoin(customers, eq(customers.id, sales.customerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(sales.createdAt))
    .limit(500)

  if (salesRows.length === 0) return []

  const ids = salesRows.map((s) => s.id)
  const itemRows = await db
    .select({
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      productName: products.name,
      unit: products.unit,
      qty: saleItems.qty,
      price: saleItems.price,
      discountPercent: saleItems.discountPercent,
    })
    .from(saleItems)
    .leftJoin(products, eq(products.id, saleItems.productId))
    .where(inArray(saleItems.saleId, ids))

  const itemsBySale = new Map<
    number,
    Array<{
      name: string
      qty: number
      price: number
      discountPercent?: number
      unit?: string
    }>
  >()

  for (const item of itemRows) {
    const list = itemsBySale.get(item.saleId) || []
    list.push({
      name: item.productName || 'Barang',
      qty: item.qty,
      price: item.price,
      discountPercent: item.discountPercent,
      unit: item.unit || 'UM.0018',
    })
    itemsBySale.set(item.saleId, list)
  }

  const jakartaDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return salesRows.map((s) => ({
    id: s.id,
    number: s.number,
    stage: s.stage,
    total: s.total,
    paid: s.paid,
    date: jakartaDay.format(new Date(s.invoicedAt || s.createdAt)),
    customer: s.customer,
    items: itemsBySale.get(s.id) || [],
  }))
}

