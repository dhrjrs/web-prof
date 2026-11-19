import Link from 'next/link'
import { Plus, Settings2 } from 'lucide-react'
import { Field, SelectField, TextareaField } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader, Stat } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, rupiah } from '@/lib/format'
import { getGallonSummary, listCustomers, listGallonLoans } from '@/lib/queries'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function GallonPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const showHistory = tab === 'riwayat'
  const [summary, loans, customers] = await Promise.all([
    getGallonSummary(),
    listGallonLoans(!showHistory),
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
                <Field label="Jumlah galon" name="qty" type="number" min={1} max={Math.max(1, summary.available)} defaultValue={1} required />
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

      <nav aria-label="Tampilan" className="flex gap-1">
        {[
          { href: '/galon', label: 'Sedang dipinjam', active: !showHistory },
          { href: '/galon?tab=riwayat', label: 'Riwayat kembali', active: showHistory },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground',
              t.active && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="rounded-xl border bg-card">
        {loans.length === 0 ? (
          <Empty>{showHistory ? 'Belum ada galon yang dikembalikan.' : 'Tidak ada galon yang sedang dipinjam.'}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="text-right">Galon</TableHead>
                <TableHead className="hidden sm:table-cell">Pinjam</TableHead>
                <TableHead>{showHistory ? 'Kembali' : 'Jatuh tempo'}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Jaminan</TableHead>
                {showHistory ? null : (
                  <TableHead>
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map(({ loan, customerName, customerPhone }) => {
                const outstanding = loan.qty - loan.returnedQty
                const overdue = !showHistory && loan.dueDate !== null && loan.dueDate < today
                return (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <span className="block">{customerName}</span>
                      {customerPhone ? <span className="text-xs text-muted-foreground">{customerPhone}</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {showHistory ? loan.qty : `${outstanding} / ${loan.qty}`}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(loan.borrowedAt)}</TableCell>
                    <TableCell>
                      {showHistory ? (
                        formatDate(loan.returnedAt)
                      ) : (
                        <span className="flex items-center gap-2">
                          {formatDate(loan.dueDate)}
                          {overdue ? <Badge variant="destructive">Lewat</Badge> : null}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {loan.deposit ? rupiah(loan.deposit) : '-'}
                    </TableCell>
                    {showHistory ? null : (
                      <TableCell className="text-right">
                        <FormDialog
                          title={`Pengembalian dari ${customerName}`}
                          description={`${outstanding} galon belum kembali${loan.deposit ? ` · jaminan ${rupiah(loan.deposit)}` : ''}`}
                          trigger="Kembalikan"
                          triggerVariant="outline"
                          triggerSize="xs"
                          submitLabel="Catat pengembalian"
                          endpoint="/api/gallon-loans/:id/returns"
                        >
                          <input type="hidden" name="id" value={loan.id} />
                          <Field
                            label="Jumlah dikembalikan"
                            name="qty"
                            type="number"
                            min={1}
                            max={outstanding}
                            defaultValue={outstanding}
                            required
                          />
                        </FormDialog>
                      </TableCell>
                    )}
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
