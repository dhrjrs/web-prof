'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { gallonLoans, settings } from '@/lib/db/schema'
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
      await tx.execute(sql`select pg_advisory_xact_lock(4242)`)
      const [total] = await tx
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'gallon_total'))
      const [{ out }] = await tx
        .select({ out: sql<number>`coalesce(sum(${gallonLoans.qty} - ${gallonLoans.returnedQty}), 0)::int` })
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

    const updated = await db
      .update(gallonLoans)
      .set({
        returnedQty: sql`${gallonLoans.returnedQty} + ${qty}`,
        returnedAt: sql`case when ${gallonLoans.returnedQty} + ${qty} >= ${gallonLoans.qty} then now() else null end`,
      })
      .where(sql`${gallonLoans.id} = ${id} and ${gallonLoans.returnedQty} + ${qty} <= ${gallonLoans.qty}`)
      .returning({ id: gallonLoans.id })
    if (updated.length === 0) throw new ValidationError('Jumlah melebihi galon yang dipinjam')

    revalidatePath('/', 'layout')
    return `${qty} galon dikembalikan`
  })
}
