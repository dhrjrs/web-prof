'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { categories, customers, gallonLoans, sales, settings } from '@/lib/db/schema'
import { int, run, text, ValidationError } from '@/lib/validation'

export async function saveCustomer(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { required: false, min: 1 })
    const values = {
      name: text(fd, 'name', { required: true })!,
      phone: text(fd, 'phone', { max: 30 }),
      address: text(fd, 'address', { max: 300 }),
      nik: text(fd, 'nik', { max: 30 }),
      npwp: text(fd, 'npwp', { max: 30 }),
      email: text(fd, 'email', { max: 100 }),
      categoryId: int(fd, 'categoryId', { required: false, min: 1 }),
    }
    if (id) await db.update(customers).set(values).where(eq(customers.id, id))
    else await db.insert(customers).values(values)
    revalidatePath('/', 'layout')
    return id ? 'Pelanggan diperbarui' : 'Pelanggan ditambahkan'
  })
}

export async function deleteCustomer(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    await db.transaction(async (tx) => {
      const [{ gallonsOut }] = await tx
        .select({ gallonsOut: sql<number>`coalesce(sum(${gallonLoans.qty} - ${gallonLoans.returnedQty}), 0)::int` })
        .from(gallonLoans)
        .where(eq(gallonLoans.customerId, id))
      if (gallonsOut > 0) {
        throw new ValidationError(`Pelanggan masih meminjam ${gallonsOut} galon. Catat pengembalian dulu.`)
      }
      const [{ notaCount }] = await tx
        .select({ notaCount: sql<number>`count(*)::int` })
        .from(sales)
        .where(eq(sales.customerId, id))
      if (notaCount > 0) {
        throw new ValidationError(`Pelanggan masih memiliki ${notaCount} nota. Hapus notanya dulu.`)
      }
      await tx.delete(gallonLoans).where(eq(gallonLoans.customerId, id))
      const deleted = await tx.delete(customers).where(eq(customers.id, id)).returning({ id: customers.id })
      if (deleted.length === 0) throw new ValidationError('Pelanggan tidak ditemukan')
    })
    revalidatePath('/', 'layout')
    return 'Pelanggan dihapus'
  })
}

export async function saveCategory(fd: FormData) {
  return run(async () => {
    const type = fd.get('type')
    if (type !== 'pelanggan' && type !== 'penjualan') throw new ValidationError('Tipe tidak valid')
    const name = text(fd, 'name', { required: true, max: 60 })!
    await db.insert(categories).values({ name, type })
    revalidatePath('/', 'layout')
    return 'Kategori ditambahkan'
  })
}

export async function deleteCategory(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    await db.delete(categories).where(eq(categories.id, id))
    revalidatePath('/', 'layout')
    return 'Kategori dihapus'
  })
}

export async function saveGallonTotal(fd: FormData) {
  return run(async () => {
    const value = int(fd, 'gallonTotal', { max: 100_000, label: 'Total galon' })!
    const [{ out }] = await db
      .select({ out: sql<number>`coalesce(sum(${gallonLoans.qty} - ${gallonLoans.returnedQty}), 0)::int` })
      .from(gallonLoans)
    if (value < out) throw new ValidationError(`Total tidak boleh kurang dari ${out} galon yang sedang dipinjam`)
    await db
      .insert(settings)
      .values({ key: 'gallon_total', value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } })
    revalidatePath('/', 'layout')
    return 'Total galon diperbarui'
  })
}
