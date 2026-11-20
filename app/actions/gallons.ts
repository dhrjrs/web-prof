'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { gallonLoans, gallonReturns, settings } from '@/lib/db/schema'
import { int, run, text, ValidationError } from '@/lib/validation'

export async function borrowGallon(fd: FormData) {
  return run(async () => {
    const customerId = int(fd, 'customerId', { min: 1, label: 'Pelanggan' })!
    const qty = int(fd, 'qty', { min: 1, max: 1000, label: 'Jumlah galon' })!
    const deposit = int(fd, 'deposit', { label: 'Jaminan' }) ?? 0
    const dueDate = text(fd, 'dueDate', { max: 10 })
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new ValidationError('Tanggal kembali tidak valid')
    }

    await db.transaction(async (tx) => {
      const [total] = await tx
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'gallon_total'))
      const [{ out }] = await tx
        .select({ out: sql<number>`coalesce(sum(${gallonLoans.qty} - ${gallonLoans.returnedQty}), 0)` })
        .from(gallonLoans)
      const available = Number(total?.value ?? 0) - out
      if (qty > available) throw new ValidationError(`Galon tersedia hanya ${available}`)

      await tx.insert(gallonLoans).values({
        customerId,
        qty,
        deposit,
        dueDate,
        note: text(fd, 'note', { max: 300 }),
      })
    })

    revalidatePath('/', 'layout')
    return `${qty} galon dipinjamkan`
  })
}

export async function returnGallon(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    const qty = int(fd, 'qty', { min: 1, max: 1000, label: 'Jumlah kembali' })!
    const note = text(fd, 'note', { max: 300 })

    await db.transaction(async (tx) => {
      const [loan] = await tx
        .select({
          id: gallonLoans.id,
          customerId: gallonLoans.customerId,
          qty: gallonLoans.qty,
          returnedQty: gallonLoans.returnedQty,
        })
        .from(gallonLoans)
        .where(eq(gallonLoans.id, id))

      if (!loan) throw new ValidationError('Data pinjaman galon tidak ditemukan')
      const remaining = loan.qty - loan.returnedQty
      if (qty > remaining) {
        throw new ValidationError(`Jumlah melebihi sisa galon yang dipinjam (${remaining} galon)`)
      }

      const newReturnedQty = loan.returnedQty + qty
      const isFullyReturned = newReturnedQty >= loan.qty

      await tx
        .update(gallonLoans)
        .set({
          returnedQty: newReturnedQty,
          returnedAt: isFullyReturned ? new Date() : null,
        })
        .where(eq(gallonLoans.id, id))

      // Catat log setiap kejadian pengembalian (walaupun sebagian)
      await tx.insert(gallonReturns).values({
        loanId: id,
        customerId: loan.customerId,
        qty,
        note,
      })
    })

    revalidatePath('/', 'layout')
    return `${qty} galon dikembalikan`
  })
}
