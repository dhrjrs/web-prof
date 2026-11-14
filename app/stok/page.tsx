import { ArrowDownUp, Pencil, Plus } from 'lucide-react'
import { adjustStock, saveProduct } from '@/app/actions/products'
import { Field, SelectField } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { products } from '@/lib/db/schema'
import { netPrice, rupiah } from '@/lib/format'
import { listProducts } from '@/lib/queries'

export const dynamic = 'force-dynamic'

type Product = typeof products.$inferSelect

function ProductFields({ product }: { product?: Product }) {
  return (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" name="sku" defaultValue={product?.sku} required maxLength={40} />
        <Field label="Satuan" name="unit" defaultValue={product?.unit ?? 'pcs'} maxLength={20} />
      </div>
      <Field label="Nama produk" name="name" defaultValue={product?.name} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Harga (Rp)" name="price" type="number" min={0} defaultValue={product?.price ?? 0} required />
        <Field
          label="Diskon (%)"
          name="discountPercent"
          type="number"
          min={0}
          max={100}
          defaultValue={product?.discountPercent ?? 0}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {product ? null : <Field label="Stok awal" name="stock" type="number" min={0} defaultValue={0} />}
        <Field label="Stok minimum" name="minStock" type="number" min={0} defaultValue={product?.minStock ?? 0} />
      </div>
    </>
  )
}

export default async function StockPage() {
  const rows = await listProducts()
  const stockValue = rows.reduce((sum, p) => sum + p.stock * p.price, 0)

  return (
    <>
      <PageHeader
        title="Stok & Harga"
        description={`${rows.length} produk · nilai stok ${rupiah(stockValue)}`}
        actions={
          <FormDialog
            title="Tambah produk"
            trigger={
              <>
                <Plus aria-hidden="true" />
                Produk
              </>
            }
            action={saveProduct}
          >
            <ProductFields />
          </FormDialog>
        }
      />

      <div className="rounded-xl border bg-card">
        {rows.length === 0 ? (
          <Empty>Belum ada produk.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const low = p.stock <= p.minStock
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="block">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={low ? 'text-destructive' : undefined}>
                        {p.stock} {p.unit}
                      </span>
                      {low ? <span className="sr-only"> (stok menipis)</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.discountPercent > 0 ? (
                        <span className="flex flex-col items-end">
                          <span>{rupiah(netPrice(p.price, p.discountPercent))}</span>
                          <Badge variant="outline" className="border-primary text-primary">
                            -{p.discountPercent}%
                          </Badge>
                        </span>
                      ) : (
                        rupiah(p.price)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <FormDialog
                          title={`Stok ${p.name}`}
                          description={`Stok saat ini ${p.stock} ${p.unit}`}
                          trigger={
                            <>
                              <ArrowDownUp aria-hidden="true" />
                              <span className="sr-only">Ubah stok {p.name}</span>
                            </>
                          }
                          triggerVariant="ghost"
                          triggerSize="xs"
                          action={adjustStock}
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <SelectField
                            label="Jenis"
                            name="mode"
                            options={[
                              { value: 'atur', label: 'Ubah stok menjadi' },
                              { value: 'masuk', label: 'Stok masuk (tambah)' },
                              { value: 'keluar', label: 'Stok keluar (kurangi)' },
                            ]}
                          />
                          <Field
                            label="Jumlah"
                            name="qty"
                            type="number"
                            min={0}
                            defaultValue={p.stock}
                            hint="Untuk 'Ubah stok menjadi', isi jumlah stok akhir yang benar."
                            required
                          />
                        </FormDialog>
                        <FormDialog
                          title="Ubah produk"
                          description="Termasuk penyesuaian harga dan diskon."
                          trigger={
                            <>
                              <Pencil aria-hidden="true" />
                              <span className="sr-only">Ubah {p.name}</span>
                            </>
                          }
                          triggerVariant="ghost"
                          triggerSize="xs"
                          action={saveProduct}
                        >
                          <ProductFields product={p} />
                        </FormDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}
