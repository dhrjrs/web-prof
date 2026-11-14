import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check, Undo2 } from 'lucide-react'
import { addPayment, advanceSale, returnSaleItem } from '@/app/actions/sales'
import { ActionButton } from '@/components/action-button'
import { Field, SelectField } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader, Section } from '@/components/page-header'
import { StageBadge } from '@/components/stage-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SaleStage } from '@/lib/db/schema'
import { formatDateTime, netPrice, rupiah, stageLabels } from '@/lib/format'
import { getSale } from '@/lib/queries'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const flow: SaleStage[] = ['penawaran', 'pesanan', 'dikirim', 'faktur', 'lunas']

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const saleId = Number(id)
  if (!Number.isInteger(saleId) || saleId < 1) notFound()
  const data = await getSale(saleId)
  if (!data) notFound()

  const { sale } = data
  const remaining = Math.max(0, sale.total - sale.paid)
  const canPay = ['pesanan', 'dikirim', 'faktur'].includes(sale.stage) && remaining > 0
  const canReturn = ['dikirim', 'faktur', 'lunas'].includes(sale.stage)
  const currentIndex = flow.indexOf(sale.stage)

  return (
    <>
      <Link href="/penjualan" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali
      </Link>

      <PageHeader
        title={sale.number}
        description={`${data.customerName ?? '-'}${data.salespersonName ? ` · Penjual: ${data.salespersonName}` : ''}${data.categoryName ? ` · ${data.categoryName}` : ''}`}
        actions={
          <>
            {sale.stage === 'penawaran' ? (
              <ActionButton action={advanceSale} fields={{ id: sale.id, to: 'pesanan' }}>
                Jadikan pesanan
              </ActionButton>
            ) : null}
            {sale.stage === 'pesanan' ? (
              <ActionButton
                action={advanceSale}
                fields={{ id: sale.id, to: 'dikirim' }}
                confirm="Kirim pesanan? Stok akan dikurangi."
              >
                Kirim pesanan
              </ActionButton>
            ) : null}
            {sale.stage === 'dikirim' ? (
              <ActionButton action={advanceSale} fields={{ id: sale.id, to: 'faktur' }}>
                Buat faktur
              </ActionButton>
            ) : null}
            {canPay ? (
              <FormDialog
                title={sale.stage === 'faktur' ? 'Penerimaan penjualan' : 'Uang muka penjualan'}
                description={`Sisa tagihan ${rupiah(remaining)}`}
                trigger={sale.stage === 'faktur' ? 'Terima pembayaran' : 'Uang muka'}
                triggerVariant="outline"
                action={addPayment}
              >
                <input type="hidden" name="saleId" value={sale.id} />
                <Field label="Nominal (Rp)" name="amount" type="number" min={1} max={remaining} defaultValue={remaining} required />
                <SelectField
                  label="Metode"
                  name="method"
                  options={[
                    { value: 'tunai', label: 'Tunai' },
                    { value: 'transfer', label: 'Transfer' },
                  ]}
                />
                <Field label="Catatan" name="note" maxLength={300} />
              </FormDialog>
            ) : null}
            {sale.stage === 'penawaran' || sale.stage === 'pesanan' ? (
              <ActionButton
                action={advanceSale}
                fields={{ id: sale.id, to: 'batal' }}
                variant="ghost"
                confirm="Batalkan transaksi ini?"
              >
                Batalkan
              </ActionButton>
            ) : null}
          </>
        }
      />

      {sale.stage === 'batal' ? (
        <div>
          <StageBadge stage="batal" />
        </div>
      ) : (
        <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Tahap transaksi">
          {flow.map((stage, i) => (
            <li key={stage} className="flex items-center gap-2">
              <span
                aria-current={i === currentIndex ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-1',
                  i < currentIndex && 'border-primary/40 text-primary',
                  i === currentIndex && 'border-primary bg-primary text-primary-foreground',
                  i > currentIndex && 'text-muted-foreground',
                )}
              >
                {i < currentIndex ? <Check className="size-3" aria-hidden="true" /> : null}
                {stageLabels[stage]}
              </span>
              {i < flow.length - 1 ? <span className="h-px w-4 bg-border" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      )}

      <Section title="Barang">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Harga</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              {canReturn ? <TableHead className="w-10"><span className="sr-only">Retur</span></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map(({ item, productName, unit }) => {
              const unitNet = netPrice(item.price, item.discountPercent)
              const returnable = item.qty - item.returnedQty
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {productName}
                    {item.returnedQty > 0 ? (
                      <span className="block text-xs text-muted-foreground">{item.returnedQty} diretur</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.qty} {unit}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {rupiah(unitNet)}
                    {item.discountPercent > 0 ? (
                      <span className="block text-xs text-primary">-{item.discountPercent}%</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(unitNet * item.qty)}</TableCell>
                  {canReturn ? (
                    <TableCell>
                      {returnable > 0 ? (
                        <FormDialog
                          title={`Retur ${productName}`}
                          description={`Maksimal ${returnable} ${unit}. Stok akan bertambah kembali.`}
                          trigger={
                            <>
                              <Undo2 aria-hidden="true" />
                              <span className="sr-only">Retur {productName}</span>
                            </>
                          }
                          triggerVariant="ghost"
                          triggerSize="xs"
                          submitLabel="Catat retur"
                          action={returnSaleItem}
                        >
                          <input type="hidden" name="saleItemId" value={item.id} />
                          <Field label="Jumlah retur" name="qty" type="number" min={1} max={returnable} defaultValue={1} required />
                          <Field label="Alasan" name="reason" maxLength={300} placeholder="Rusak, salah kirim, ..." />
                        </FormDialog>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <dl className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{rupiah(sale.subtotal)}</dd>
          </div>
          {sale.discount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Potongan</dt>
              <dd className="tabular-nums">-{rupiah(sale.discount)}</dd>
            </div>
          ) : null}
          {data.returns.length > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Retur</dt>
              <dd className="tabular-nums">-{rupiah(data.returns.reduce((s, r) => s + r.ret.amount, 0))}</dd>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{rupiah(sale.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Dibayar</dt>
            <dd className="tabular-nums">{rupiah(sale.paid)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Sisa</dt>
            <dd className="tabular-nums">{rupiah(remaining)}</dd>
          </div>
        </dl>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Pembayaran">
          {data.payments.length === 0 ? (
            <Empty>Belum ada pembayaran.</Empty>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {data.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span className="flex flex-col">
                    <span>{p.kind === 'uang_muka' ? 'Uang muka' : 'Penerimaan'} · {p.method}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</span>
                  </span>
                  <span className="tabular-nums">{rupiah(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Riwayat">
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>Dibuat {formatDateTime(sale.createdAt)}</li>
            {sale.shippedAt ? <li>Dikirim {formatDateTime(sale.shippedAt)}</li> : null}
            {sale.invoicedAt ? <li>Difakturkan {formatDateTime(sale.invoicedAt)}</li> : null}
            {data.returns.map(({ ret, productName }) => (
              <li key={ret.id}>
                Retur {ret.qty} {productName} {ret.reason ? `(${ret.reason})` : ''} · {formatDateTime(ret.createdAt)}
              </li>
            ))}
            {sale.notes ? <li className="text-foreground">Catatan: {sale.notes}</li> : null}
          </ul>
        </Section>
      </div>
    </>
  )
}
