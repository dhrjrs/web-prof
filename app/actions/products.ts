'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { int, run, text, ValidationError } from '@/lib/validation'

export async function saveProduct(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { required: false, min: 1 })
    const values = {
      sku: text(fd, 'sku', { required: true, max: 40 })!.toUpperCase(),
      name: text(fd, 'name', { required: true })!,
      unit: text(fd, 'unit', { max: 20 }) ?? 'pcs',
      price: int(fd, 'price', { label: 'Harga' })!,
      discountPercent: int(fd, 'discountPercent', { max: 100, label: 'Diskon' }) ?? 0,
      minStock: int(fd, 'minStock', { label: 'Stok minimum' }) ?? 0,
    }

    const [dup] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, values.sku))
    if (dup && dup.id !== id) throw new ValidationError('SKU sudah dipakai produk lain')

    if (id) {
      await db.update(products).set(values).where(eq(products.id, id))
    } else {
      const stock = int(fd, 'stock', { label: 'Stok awal' }) ?? 0
      await db.insert(products).values({ ...values, stock })
    }
    revalidatePath('/', 'layout')
    return id ? 'Produk diperbarui' : 'Produk ditambahkan'
  })
}

export async function adjustStock(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    const mode = fd.get('mode') === 'keluar' ? -1 : 1
    const qty = int(fd, 'qty', { min: 1, max: 100_000, label: 'Jumlah' })!
    const delta = qty * mode

    const updated = await db
      .update(products)
      .set({ stock: sql`${products.stock} + ${delta}` })
      .where(sql`${products.id} = ${id} and ${products.stock} + ${delta} >= 0`)
      .returning({ id: products.id })
    if (updated.length === 0) throw new ValidationError('Stok tidak mencukupi')

    revalidatePath('/', 'layout')
    return mode > 0 ? 'Stok masuk dicatat' : 'Stok keluar dicatat'
  })
}

export async function deleteProduct(fd: FormData) {
  return run(async () => {
    const id = int(fd, 'id', { min: 1 })!
    await db.delete(products).where(eq(products.id, id))
    revalidatePath('/', 'layout')
    return 'Produk dihapus'
  })
}
