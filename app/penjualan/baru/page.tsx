import { PageHeader } from '@/components/page-header'
import { SaleForm } from '@/components/sale-form'
import { listCategories, listCustomers, listProducts, listSalespeople } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function NewSalePage() {
  const [products, customers, salespeople, categories] = await Promise.all([
    listProducts(),
    listCustomers(),
    listSalespeople(),
    listCategories('penjualan'),
  ])

  return (
    <>
      <PageHeader
        title="Transaksi baru"
        description="Buat sebagai penawaran atau langsung jadi pesanan. Harga dan diskon diambil dari data produk."
      />
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
        salespeople={salespeople.map((s) => ({ value: s.id, label: s.name }))}
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
    </>
  )
}
