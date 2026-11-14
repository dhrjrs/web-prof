'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createSale } from '@/app/actions/sales'
import { Field, NativeSelect, SelectField, TextareaField } from '@/components/fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { netPrice, rupiah } from '@/lib/format'
import type { ActionResult } from '@/lib/validation'

type Product = { id: number; name: string; unit: string; price: number; discountPercent: number; stock: number }
type Option = { value: number; label: string }
type Line = { key: number; productId: string; qty: string }

export function SaleForm({
  products,
  customers,
  salespeople,
  categories,
}: {
  products: Product[]
  customers: Option[]
  salespeople: Option[]
  categories: Option[]
}) {
  const router = useRouter()
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: '', qty: '1' }])
  const [discount, setDiscount] = useState('0')

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (_prev, fd) => {
    const result = await createSale(fd)
    if (result.ok) {
      toast.success(result.message)
      router.push('/penjualan')
    }
    return result
  }, {})

  const subtotal = lines.reduce((sum, l) => {
    const p = products.find((x) => String(x.id) === l.productId)
    const qty = Number(l.qty)
    return p && Number.isInteger(qty) && qty > 0 ? sum + netPrice(p.price, p.discountPercent) * qty : sum
  }, 0)
  const total = Math.max(0, subtotal - (Number(discount) || 0))
  const items = lines
    .filter((l) => l.productId)
    .map((l) => ({ productId: Number(l.productId), qty: Number(l.qty) }))

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <SelectField label="Pelanggan" name="customerId" options={customers} placeholder="Pilih pelanggan" required />
        <SelectField label="Penjual" name="salespersonId" options={salespeople} placeholder="Tanpa penjual" />
        <SelectField label="Kategori penjualan" name="categoryId" options={categories} placeholder="Tanpa kategori" />
        <SelectField
          label="Simpan sebagai"
          name="stage"
          options={[
            { value: 'penawaran', label: 'Penawaran' },
            { value: 'pesanan', label: 'Pesanan' },
          ]}
          defaultValue="pesanan"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Barang</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, { key: Date.now(), productId: '', qty: '1' }])}
          >
            <Plus aria-hidden="true" />
            Tambah baris
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line, index) => {
            const p = products.find((x) => String(x.id) === line.productId)
            return (
              <div key={line.key} className="flex flex-wrap items-end gap-2 border-b pb-3 last:border-b-0 last:pb-0">
                <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                  <Label htmlFor={`product-${line.key}`}>Produk {index + 1}</Label>
                  <NativeSelect
                    id={`product-${line.key}`}
                    value={line.productId}
                    onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                  >
                    <option value="">Pilih produk</option>
                    {products.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} (stok {x.stock})
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex w-24 flex-col gap-1.5">
                  <Label htmlFor={`qty-${line.key}`}>Jumlah</Label>
                  <Input
                    id={`qty-${line.key}`}
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    value={line.qty}
                    onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                  />
                </div>
                <div className="flex w-32 flex-col items-end gap-1 pb-1.5 text-sm tabular-nums">
                  {p ? (
                    <>
                      <span>{rupiah(netPrice(p.price, p.discountPercent) * (Number(line.qty) || 0))}</span>
                      {p.discountPercent > 0 ? (
                        <span className="text-xs text-primary">diskon {p.discountPercent}%</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus baris ${index + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <Field
          label="Potongan (Rp)"
          name="discount"
          type="number"
          min={0}
          step={1}
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
        <TextareaField label="Catatan" name="notes" maxLength={500} />
        <dl className="flex flex-col gap-1 text-sm sm:col-span-2">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{rupiah(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{rupiah(total)}</dd>
          </div>
        </dl>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan transaksi'}
        </Button>
      </div>
    </form>
  )
}
