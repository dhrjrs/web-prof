'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Field, NativeSelect, SelectField, TextareaField } from '@/components/fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { netPrice, rupiah } from '@/lib/format'
import { submitFormApiAction } from '@/lib/api-client'
import type { ActionResult } from '@/lib/validation'

type Product = { id: number; name: string; unit: string; price: number; discountPercent: number; stock: number }
type Option = { value: number; label: string }
type Line = { key: number; productId: string; qty: string }

export type SaleFormInitial = {
  id: number
  customerId: number
  categoryId: number | null
  discount: number
  notes: string | null
  date: string
  items: { productId: number; qty: number; price: number; discountPercent: number }[]
}

export function SaleForm({
  products,
  customers,
  categories,
  initial,
}: {
  products: Product[]
  customers: Option[]
  categories: Option[]
  initial?: SaleFormInitial
}) {
  const router = useRouter()
  const isEdit = Boolean(initial)
  const [lines, setLines] = useState<Line[]>(
    initial?.items.length
      ? initial.items.map((item, i) => ({ key: i + 1, productId: String(item.productId), qty: String(item.qty) }))
      : [{ key: 1, productId: '', qty: '1' }],
  )
  const [discount, setDiscount] = useState(String(initial?.discount ?? 0))

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (_prev, fd) => {
    const result = await submitFormApiAction(isEdit ? '/api/sales/:id' : '/api/sales', isEdit ? 'PUT' : 'POST', fd)
    if (result.ok) {
      toast.success(result.message)
      router.push(isEdit ? '/nota' : '/penjualan')
    }
    return result
  }, {})

  function priceOf(productId: string) {
    const kept = initial?.items.find((i) => String(i.productId) === productId)
    if (kept) return netPrice(kept.price, kept.discountPercent)
    const p = products.find((x) => String(x.id) === productId)
    return p ? netPrice(p.price, p.discountPercent) : null
  }

  const subtotal = lines.reduce((sum, l) => {
    const unit = priceOf(l.productId)
    const qty = Number(l.qty)
    return unit !== null && Number.isInteger(qty) && qty > 0 ? sum + unit * qty : sum
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
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <SelectField
          label="Pelanggan"
          name="customerId"
          options={customers}
          placeholder="Pilih pelanggan"
          defaultValue={initial?.customerId ?? ''}
          required
        />
        <SelectField
          label="Kategori penjualan"
          name="categoryId"
          options={categories}
          placeholder="Tanpa kategori"
          defaultValue={initial?.categoryId ?? ''}
        />
        {initial ? (
          <Field label="Tanggal nota" name="date" type="date" defaultValue={initial.date} required />
        ) : (
          <SelectField
            label="Simpan sebagai"
            name="stage"
            options={[
              { value: 'penawaran', label: 'Penawaran' },
              { value: 'pesanan', label: 'Pesanan' },
            ]}
            defaultValue="pesanan"
          />
        )}
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
            const unit = priceOf(line.productId)
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
                  {p && unit !== null ? (
                    <>
                      <span>{rupiah(unit * (Number(line.qty) || 0))}</span>
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
        <TextareaField label="Catatan" name="notes" maxLength={500} defaultValue={initial?.notes ?? ''} />
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
          {pending ? 'Menyimpan...' : isEdit ? 'Simpan perubahan nota' : 'Simpan transaksi'}
        </Button>
      </div>
    </form>
  )
}
