'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { checkIns, salespeople, salesTargets } from '@/lib/db/schema'
import { int, run, text, ValidationError } from '@/lib/validation'

export async function saveSalesperson(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { required: false, min: 1 })
    const commission = Number(fd.get('commissionPercent'))
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      throw new ValidationError('Komisi harus antara 0 dan 100 persen')
    }
    const values = {
      name: text(fd, 'name', { required: true })!,
      phone: text(fd, 'phone', { max: 30 }),
      commissionPercent: commission.toFixed(2),
    }
    if (id) await db.update(salespeople).set(values).where(eq(salespeople.id, id))
    else await db.insert(salespeople).values(values)
    revalidatePath('/', 'layout')
    return id ? 'Penjual diperbarui' : 'Penjual ditambahkan'
  })
}

export async function saveTarget(fd: FormData) {
  return run(async () => {
    const period = text(fd, 'period', { required: true, max: 7 })!
    if (!/^\d{4}-\d{2}$/.test(period)) throw new ValidationError('Periode tidak valid')
    const salespersonId = int(fd, 'salespersonId', { required: false, min: 1 })
    const amount = int(fd, 'amount', { min: 1, label: 'Target' })!

    const scope = and(
      eq(salesTargets.period, period),
      salespersonId ? eq(salesTargets.salespersonId, salespersonId) : isNull(salesTargets.salespersonId),
    )
    const [existing] = await db.select({ id: salesTargets.id }).from(salesTargets).where(scope)
    if (existing) await db.update(salesTargets).set({ amount }).where(eq(salesTargets.id, existing.id))
    else await db.insert(salesTargets).values({ period, salespersonId, amount })

    revalidatePath('/', 'layout')
    return 'Target disimpan'
  })
}

export async function addCheckIn(fd: FormData) {
  return run(async () => {
    await db.insert(checkIns).values({
      salespersonId: int(fd, 'salespersonId', { min: 1, label: 'Penjual' })!,
      customerId: int(fd, 'customerId', { min: 1, label: 'Pelanggan' })!,
      note: text(fd, 'note', { max: 500 }),
    })
    revalidatePath('/', 'layout')
    return 'Check in dicatat'
  })
}
