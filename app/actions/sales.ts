'use server'

import { and, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  payments,
  products,
  saleItems,
  saleReturns,
  sales,
  type SaleStage,
} from '@/lib/db/schema'
import { netPrice } from '@/lib/format'
import { int, run, text, ValidationError } from '@/lib/validation'

const MAX_QTY_PER_PRODUCT = 10_000

function parseItems(raw: FormDataEntryValue | null) {
  let parsed: unknown
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '[]')
  } catch {
    throw new ValidationError('Daftar barang tidak valid')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new ValidationError('Tambahkan minimal 1 barang')
  if (parsed.length > 50) throw new ValidationError('Maksimal 50 baris barang')

  const merged = new Map<number, number>()
  for (const item of parsed) {
    const productId = Number(item?.productId)
    const qty = Number(item?.qty)
    if (!Number.isInteger(productId) || productId < 1) throw new ValidationError('Barang tidak valid')
    if (!Number.isInteger(qty) || qty < 1) throw new ValidationError('Jumlah barang harus bilangan bulat positif')
    merged.set(productId, (merged.get(productId) ?? 0) + qty)
  }
  for (const qty of merged.values()) {
    if (qty > MAX_QTY_PER_PRODUCT) throw new ValidationError(`Jumlah per barang maksimal ${MAX_QTY_PER_PRODUCT}`)
  }
  return merged
}

export async function createSale(fd: FormData) {
  return run(async () => {
    const customerId = int(fd, 'customerId', { min: 1, label: 'Pelanggan' })!
    const salespersonId = int(fd, 'salespersonId', { required: false, min: 1 })
    const categoryId = int(fd, 'categoryId', { required: false, min: 1 })
    const stage: SaleStage = fd.get('stage') === 'pesanan' ? 'pesanan' : 'penawaran'
    const discount = int(fd, 'discount', { required: false, label: 'Potongan' }) ?? 0
    const items = parseItems(fd.get('items'))

    const rows = await db
      .select()
      .from(products)
      .where(inArray(products.id, [...items.keys()]))
    if (rows.length !== items.size) throw new ValidationError('Ada barang yang tidak ditemukan')

    const lines = rows.map((p) => ({
      productId: p.id,
      qty: items.get(p.id)!,
      price: p.price,
      discountPercent: p.discountPercent,
    }))
    const subtotal = lines.reduce((sum, l) => sum + netPrice(l.price, l.discountPercent) * l.qty, 0)
    if (discount > subtotal) throw new ValidationError('Potongan melebihi subtotal')

    const number = `PJ-${Date.now().toString(36).toUpperCase()}`
    await db.transaction(async (tx) => {
      const [sale] = await tx
        .insert(sales)
        .values({
          number,
          stage,
          customerId,
          salespersonId,
          categoryId,
          subtotal,
          discount,
          total: subtotal - discount,
          notes: text(fd, 'notes', { max: 500 }),
        })
        .returning({ id: sales.id })
      await tx.insert(saleItems).values(lines.map((l) => ({ ...l, saleId: sale.id })))
    })

    revalidatePath('/', 'layout')
    return `${stage === 'pesanan' ? 'Pesanan' : 'Penawaran'} ${number} dibuat`
  })
}

const stockDeductedStages: SaleStage[] = ['dikirim', 'faktur', 'lunas']

function parseNotaDate(fd: FormData) {
  const raw = fd.get('date')
  if (raw === null || raw === '') return null
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new ValidationError('Tanggal nota tidak valid')
  const date = new Date(`${raw}T12:00:00+07:00`)
  if (Number.isNaN(date.getTime())) throw new ValidationError('Tanggal nota tidak valid')
  return date
}

export async function updateSale(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    const customerId = int(fd, 'customerId', { min: 1, label: 'Pelanggan' })!
    const categoryId = int(fd, 'categoryId', { required: false, min: 1 })
    const discount = int(fd, 'discount', { required: false, label: 'Potongan' }) ?? 0
    const notes = text(fd, 'notes', { max: 500 })
    const createdAt = parseNotaDate(fd)
    const items = parseItems(fd.get('items'))

    let number = ''
    await db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).for('update')
      if (!sale) throw new ValidationError('Nota tidak ditemukan')
      number = sale.number

      const [{ returnCount }] = await tx
        .select({ returnCount: sql<number>`count(*)::int` })
        .from(saleReturns)
        .where(eq(saleReturns.saleId, id))
      if (returnCount > 0) throw new ValidationError('Nota yang sudah ada retur tidak bisa diubah')

      const oldItems = await tx.select().from(saleItems).where(eq(saleItems.saleId, id))
      const productRows = await tx
        .select()
        .from(products)
        .where(inArray(products.id, [...items.keys()]))
      if (productRows.length !== items.size) throw new ValidationError('Ada barang yang tidak ditemukan')

      const lines = productRows.map((p) => {
        const previous = oldItems.find((i) => i.productId === p.id)
        return {
          productId: p.id,
          qty: items.get(p.id)!,
          price: previous?.price ?? p.price,
          discountPercent: previous?.discountPercent ?? p.discountPercent,
        }
      })
      const subtotal = lines.reduce((sum, l) => sum + netPrice(l.price, l.discountPercent) * l.qty, 0)
      if (discount > subtotal) throw new ValidationError('Potongan melebihi subtotal')
      const total = subtotal - discount
      if (total < sale.paid) throw new ValidationError('Total nota tidak boleh kurang dari yang sudah dibayar')

      if (stockDeductedStages.includes(sale.stage)) {
        const deltas = new Map<number, number>()
        for (const item of oldItems) deltas.set(item.productId, (deltas.get(item.productId) ?? 0) - item.qty)
        for (const line of lines) deltas.set(line.productId, (deltas.get(line.productId) ?? 0) + line.qty)
        for (const [productId, extra] of deltas) {
          if (extra === 0) continue
          const updated = await tx
            .update(products)
            .set({ stock: sql`${products.stock} - ${extra}` })
            .where(and(eq(products.id, productId), sql`${products.stock} - ${extra} >= 0`))
            .returning({ id: products.id })
          if (updated.length === 0) throw new ValidationError('Stok tidak cukup untuk perubahan nota')
        }
      }

      await tx.delete(saleItems).where(eq(saleItems.saleId, id))
      await tx.insert(saleItems).values(lines.map((l) => ({ ...l, saleId: id })))

      const stage: SaleStage =
        sale.stage === 'faktur' || sale.stage === 'lunas' ? (sale.paid >= total ? 'lunas' : 'faktur') : sale.stage
      await tx
        .update(sales)
        .set({
          customerId,
          categoryId,
          subtotal,
          discount,
          total,
          notes,
          stage,
          ...(createdAt ? { createdAt } : {}),
        })
        .where(eq(sales.id, id))
    })

    revalidatePath('/', 'layout')
    return `Nota ${number} diperbarui`
  })
}

export async function deleteSale(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    let number = ''
    await db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).for('update')
      if (!sale) throw new ValidationError('Nota tidak ditemukan')
      number = sale.number

      if (stockDeductedStages.includes(sale.stage)) {
        const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, id))
        for (const item of items) {
          const remaining = item.qty - item.returnedQty
          if (remaining <= 0) continue
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} + ${remaining}` })
            .where(eq(products.id, item.productId))
        }
      }

      await tx.delete(payments).where(eq(payments.saleId, id))
      await tx.delete(saleReturns).where(eq(saleReturns.saleId, id))
      await tx.delete(saleItems).where(eq(saleItems.saleId, id))
      await tx.delete(sales).where(eq(sales.id, id))
    })

    revalidatePath('/', 'layout')
    return `Nota ${number} dihapus`
  })
}

const transitions: Record<string, SaleStage[]> = {
  pesanan: ['penawaran'],
  dikirim: ['pesanan'],
  faktur: ['dikirim'],
  batal: ['penawaran', 'pesanan'],
}

export async function advanceSale(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    const to = String(fd.get('to')) as SaleStage
    const allowedFrom = transitions[to]
    if (!allowedFrom) throw new ValidationError('Tahap tidak valid')

    await db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).for('update')
      if (!sale) throw new ValidationError('Transaksi tidak ditemukan')
      if (!allowedFrom.includes(sale.stage)) throw new ValidationError('Tahap transaksi tidak sesuai')

      if (to === 'dikirim') {
        const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, id))
        for (const item of items) {
          const updated = await tx
            .update(products)
            .set({ stock: sql`${products.stock} - ${item.qty}` })
            .where(and(eq(products.id, item.productId), sql`${products.stock} >= ${item.qty}`))
            .returning({ id: products.id })
          if (updated.length === 0) throw new ValidationError('Stok tidak cukup untuk dikirim')
        }
      }

      const stage: SaleStage = to === 'faktur' && sale.paid >= sale.total ? 'lunas' : to
      await tx
        .update(sales)
        .set({
          stage,
          shippedAt: to === 'dikirim' ? new Date() : sale.shippedAt,
          invoicedAt: to === 'faktur' ? new Date() : sale.invoicedAt,
        })
        .where(eq(sales.id, id))
    })

    revalidatePath('/', 'layout')
    return 'Tahap transaksi diperbarui'
  })
}

export async function addPayment(fd: FormData) {
  return run(async () => {
    const saleId = int(fd, 'saleId', { min: 1 })!
    const amount = int(fd, 'amount', { min: 1, label: 'Nominal' })!
    const method = fd.get('method') === 'transfer' ? 'transfer' : 'tunai'

    let kind = 'penerimaan' as 'uang_muka' | 'penerimaan'
    await db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId)).for('update')
      if (!sale) throw new ValidationError('Transaksi tidak ditemukan')
      if (sale.stage === 'pesanan' || sale.stage === 'dikirim') kind = 'uang_muka'
      else if (sale.stage !== 'faktur') throw new ValidationError('Pembayaran tidak bisa dicatat pada tahap ini')

      const remaining = sale.total - sale.paid
      if (amount > remaining) throw new ValidationError(`Sisa tagihan hanya ${remaining}`)

      await tx.insert(payments).values({ saleId, kind, amount, method, note: text(fd, 'note', { max: 300 }) })
      const paid = sale.paid + amount
      await tx
        .update(sales)
        .set({ paid, stage: sale.stage === 'faktur' && paid >= sale.total ? 'lunas' : sale.stage })
        .where(eq(sales.id, saleId))
    })

    revalidatePath('/', 'layout')
    return kind === 'uang_muka' ? 'Uang muka dicatat' : 'Penerimaan dicatat'
  })
}

export async function returnSaleItem(fd: FormData) {
  return run(async () => {
    const saleItemId = int(fd, 'saleItemId', { min: 1 })!
    const qty = int(fd, 'qty', { min: 1, max: MAX_QTY_PER_PRODUCT, label: 'Jumlah retur' })!

    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(saleItems).where(eq(saleItems.id, saleItemId)).for('update')
      if (!item) throw new ValidationError('Barang tidak ditemukan')
      const [sale] = await tx.select().from(sales).where(eq(sales.id, item.saleId)).for('update')
      if (!sale || !['dikirim', 'faktur', 'lunas'].includes(sale.stage)) {
        throw new ValidationError('Retur hanya untuk barang yang sudah dikirim')
      }
      if (qty > item.qty - item.returnedQty) throw new ValidationError('Jumlah retur melebihi barang terjual')

      const lineNet = netPrice(item.price, item.discountPercent) * qty
      const amount = Math.max(0, Math.min(lineNet, sale.total))

      await tx.insert(saleReturns).values({
        saleId: sale.id,
        saleItemId,
        productId: item.productId,
        qty,
        amount,
        reason: text(fd, 'reason', { max: 300 }),
      })
      await tx
        .update(saleItems)
        .set({ returnedQty: item.returnedQty + qty })
        .where(eq(saleItems.id, saleItemId))
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${qty}` })
        .where(eq(products.id, item.productId))

      const total = sale.total - amount
      await tx
        .update(sales)
        .set({ total, stage: sale.stage === 'faktur' && sale.paid >= total ? 'lunas' : sale.stage })
        .where(eq(sales.id, sale.id))
    })

    revalidatePath('/', 'layout')
    return 'Retur dicatat, stok dikembalikan'
  })
}
