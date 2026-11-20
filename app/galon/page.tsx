import Link from 'next/link'
import { Plus, Settings2 } from 'lucide-react'
import { Field, SelectField, TextareaField } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader, Stat } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime, rupiah } from '@/lib/format'
import { getGallonSummary, listCustomers, listGallonLoans, listGallonReturns } from '@/lib/queries'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function GallonPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const showHistory = tab === 'riwayat'
  const [summary, loans, returns, customers] = await Promise.all([
    getGallonSummary(),
    listGallonLoans(true),
    listGallonReturns(),
    listCustomers(),
  ])
  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <PageHeader
        title="Pinjam Galon"
        description="Catat galon yang dipinjam pelanggan, pengembaliannya, dan kelola total stok galon toko."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FormDialog
              title="Atur total galon toko"
              description={`${summary.out} galon sedang dipinjam pelanggan`}
              trigger={
                <>
                  <Settings2 aria-hidden="true" className="size-4" />
                  Atur Total Galon
                </>
              }
              triggerVariant="outline"
              triggerSize="sm"
              endpoint="/api/settings/gallon-total"
            >
              <Field
                label="Total galon milik toko"
                name="gallonTotal"
                type="number"
                min={summary.out}
                defaultValue={summary.total}
                required
              />
            </FormDialog>

            <FormDialog
              title="Pinjamkan galon"
              description={`${summary.available} galon tersedia`}
              trigger={
                <>
                  <Plus aria-hidden="true" />
                  Pinjamkan
                </>
              }
              triggerSize="sm"
              endpoint="/api/gallon-loans"
            >
              <SelectField
                label="Pelanggan"
                name="customerId"
                placeholder="Pilih pelanggan"
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Jumlah galon"
                  name="qty"
                  type="number"
                  min={1}
                  max={Math.max(1, summary.available)}
                  defaultValue={1}
                  required
                />
                <Field label="Jaminan (Rp)" name="deposit" type="number" min={0} defaultValue={0} />
              </div>
              <Field label="Tanggal kembali" name="dueDate" type="date" min={today} />
              <TextareaField label="Catatan" name="note" maxLength={300} />
            </FormDialog>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total galon" value={String(summary.total)} />
        <Stat label="Dipinjam" value={String(summary.out)} />
        <Stat label="Tersedia" value={String(summary.available)} />
      </div>

      <nav aria-label="Tampilan" className="flex gap-2">
        <Link
          href="/galon"
          aria-current={!showHistory ? 'page' : undefined}
          className={cn(
            'rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
            !showHistory && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
          )}
        >
          Sedang dipinjam ({loans.length})
        </Link>
        <Link
          href="/galon?tab=riwayat"
          aria-current={showHistory ? 'page' : undefined}
          className={cn(
            'rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
            showHistory && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
          )}
        >
          Riwayat kembali ({returns.length})
        </Link>
      </nav>

      <div className="rounded-xl border bg-card">
        {showHistory ? (
          returns.length === 0 ? (
            <Empty>Belum ada riwayat pengembalian galon yang dicatat.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-right">Galon Kembali</TableHead>
                  <TableHead>Status Pinjaman</TableHead>
                  <TableHead>Waktu Pengembalian</TableHead>
                  <TableHead className="hidden sm:table-cell">Tgl Pinjam</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Jaminan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => {
                  const isComplete = (ret.currentReturnedQty ?? 0) >= (ret.totalLoanQty ?? 0)
                  const remaining = Math.max(0, (ret.totalLoanQty ?? 0) - (ret.currentReturnedQty ?? 0))
                  return (
                    <TableRow key={ret.id}>
                      <TableCell>
                        <span className="block font-medium">{ret.customerName}</span>
                        {ret.customerPhone ? (
                          <span className="text-xs text-muted-foreground">{ret.customerPhone}</span>
                        ) : null}
                        {ret.note ? (
                          <span className="mt-0.5 block text-xs italic text-muted-foreground">
                            Catatan: {ret.note}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-emerald-600">
                        +{ret.qty} galon
                      </TableCell>
                      <TableCell>
                        {isComplete ? (
                          <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                            Lunas ({ret.totalLoanQty} galon kembali)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-600">
                            Sebagian ({ret.currentReturnedQty}/{ret.totalLoanQty} · sisa {remaining})
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(ret.returnedAt)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {formatDate(ret.borrowedAt)}
                      </TableCell>
                      <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">
                        {ret.deposit ? rupiah(ret.deposit) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )
        ) : loans.length === 0 ? (
          <Empty>Tidak ada galon yang sedang dipinjam.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="text-right">Sisa / Total</TableHead>
                <TableHead className="hidden sm:table-cell">Pinjam</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Jaminan</TableHead>
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map(({ loan, customerName, customerPhone }) => {
                const outstanding = loan.qty - loan.returnedQty
                const overdue = loan.dueDate !== null && loan.dueDate < today
                const isPartial = loan.returnedQty > 0
                return (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <span className="block font-medium">{customerName}</span>
                      {customerPhone ? <span className="text-xs text-muted-foreground">{customerPhone}</span> : null}
                      {loan.note ? <span className="block text-xs text-muted-foreground">{loan.note}</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-semibold text-destructive">{outstanding}</span>
                      <span className="text-muted-foreground"> / {loan.qty}</span>
                      {isPartial ? (
                        <span className="block text-xs text-muted-foreground">({loan.returnedQty} sudah kembali)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatDate(loan.borrowedAt)}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {formatDate(loan.dueDate)}
                        {overdue ? <Badge variant="destructive">Lewat</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {loan.deposit ? rupiah(loan.deposit) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <FormDialog
                        title={`Pengembalian dari ${customerName}`}
                        description={`${outstanding} galon belum kembali (dari total ${loan.qty} galon)${loan.deposit ? ` · jaminan ${rupiah(loan.deposit)}` : ''}`}
                        trigger="Kembalikan"
                        triggerVariant="outline"
                        triggerSize="xs"
                        submitLabel="Catat pengembalian"
                        endpoint="/api/gallon-loans/:id/returns"
                      >
                        <input type="hidden" name="id" value={loan.id} />
                        <Field
                          label="Jumlah dikembalikan sekarang"
                          name="qty"
                          type="number"
                          min={1}
                          max={outstanding}
                          defaultValue={outstanding}
                          required
                        />
                        <TextareaField
                          label="Catatan pengembalian (opsional)"
                          name="note"
                          maxLength={300}
                          placeholder="Misal: dikembalikan 3 galon dulu..."
                        />
                      </FormDialog>
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
