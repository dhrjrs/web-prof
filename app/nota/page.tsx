import Link from 'next/link'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { NotaFilters } from '@/components/nota-filters'
import { Empty, PageHeader, Stat } from '@/components/page-header'
import { StageBadge } from '@/components/stage-badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, rupiah } from '@/lib/format'
import { listCustomers, listNotas } from '@/lib/queries'

export const dynamic = 'force-dynamic'

const isoDate = /^\d{4}-\d{2}-\d{2}$/

export default async function NotaPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string; pelanggan?: string }>
}) {
  const params = await searchParams
  const from = params.dari && isoDate.test(params.dari) ? params.dari : undefined
  const to = params.sampai && isoDate.test(params.sampai) ? params.sampai : undefined
  const customerNum = Number(params.pelanggan)
  const customerId = Number.isInteger(customerNum) && customerNum > 0 ? customerNum : undefined

  const [rows, customers] = await Promise.all([listNotas({ from, to, customerId }), listCustomers()])
  const total = rows.reduce((sum, r) => sum + r.total, 0)
  const unpaid = rows.reduce((sum, r) => sum + (r.stage === 'batal' ? 0 : Math.max(0, r.total - r.paid)), 0)
  const filtered = Boolean(from || to || customerId)

  return (
    <>
      <PageHeader
        title="Nota"
        description="Setiap penjualan otomatis tercatat sebagai nota. Filter berdasarkan tanggal dan pelanggan."
      />

      <NotaFilters
        customers={customers.map((c) => ({ value: c.id, label: c.name }))}
        from={from}
        to={to}
        customerId={customerId}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Jumlah nota" value={String(rows.length)} hint={filtered ? 'Sesuai filter' : 'Semua nota'} />
        <Stat label="Total nilai nota" value={rupiah(total)} />
        <Stat label="Belum dibayar" value={rupiah(unpaid)} />
      </div>

      <div className="rounded-xl border bg-card">
        {rows.length === 0 ? (
          <Empty>{filtered ? 'Tidak ada nota yang cocok dengan filter.' : 'Belum ada nota.'}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. nota</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="hidden md:table-cell">Barang</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-28">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <span className="block font-mono text-xs">{n.number}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
                  </TableCell>
                  <TableCell>{n.customerName ?? '-'}</TableCell>
                  <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell" title={n.items}>
                    {n.items || '-'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(n.total)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StageBadge stage={n.stage} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="xs" render={<Link href={`/penjualan/${n.id}`} />} nativeButton={false}>
                        <Eye aria-hidden="true" />
                        <span className="sr-only">Lihat nota {n.number}</span>
                      </Button>
                      <Button variant="ghost" size="xs" render={<Link href={`/nota/${n.id}/ubah`} />} nativeButton={false}>
                        <Pencil aria-hidden="true" />
                        <span className="sr-only">Ubah nota {n.number}</span>
                      </Button>
                      <ActionButton
                        endpoint="/api/sales/:id"
                        fields={{ id: n.id }}
                        variant="ghost"
                        size="xs"
                        confirm={`Hapus nota ${n.number}? Stok barang yang sudah dikirim akan dikembalikan.`}
                        label={`Hapus nota ${n.number}`}
                      >
                        <Trash2 aria-hidden="true" className="text-destructive" />
                      </ActionButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}
