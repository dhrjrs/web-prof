import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Empty, PageHeader } from '@/components/page-header'
import { SaleForm } from '@/components/sale-form'
import { Button } from '@/components/ui/button'
import { listCategories, listCustomers, getNotaForEdit, listProducts } from '@/lib/queries'

export const dynamic = 'force-dynamic'

const jakartaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export default async function EditNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const notaId = Number(id)
  if (!Number.isInteger(notaId) || notaId < 1) notFound()

  const [nota, products, customers, categories] = await Promise.all([
    getNotaForEdit(notaId),
    listProducts(),
    listCustomers(),
    listCategories('penjualan'),
  ])
  if (!nota) notFound()

  return (
    <>
      <PageHeader
        title={`Ubah nota ${nota.sale.number}`}
        description="Harga barang yang sudah ada di nota tetap memakai harga saat transaksi. Stok disesuaikan otomatis bila barang sudah dikirim."
        actions={
          <Button variant="outline" size="sm" render={<Link href="/nota" />} nativeButton={false}>
            Kembali
          </Button>
        }
      />
      {nota.hasReturns ? (
        <div className="rounded-xl border bg-card">
          <Empty>Nota ini sudah memiliki retur sehingga tidak bisa diubah.</Empty>
        </div>
      ) : (
        <SaleForm
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            unit: p.unit,
            price: p.price,
            discountPercent: p.discountPercent,
            stock: p.stock,
          }))}
          customers={customers.map((c) => ({ value: c.id, label: c.name }))}
          categories={categories.map((c) => ({ value: c.id, label: c.name }))}
          initial={{
            id: nota.sale.id,
            customerId: nota.sale.customerId,
            categoryId: nota.sale.categoryId,
            discount: nota.sale.discount,
            notes: nota.sale.notes,
            date: jakartaDay.format(nota.sale.createdAt),
            items: nota.items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              price: i.price,
              discountPercent: i.discountPercent,
            })),
          }}
        />
      )}
    </>
  )
}
