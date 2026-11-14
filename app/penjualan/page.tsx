import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Empty, PageHeader } from '@/components/page-header'
import { StageBadge } from '@/components/stage-badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SaleStage } from '@/lib/db/schema'
import { formatDate, rupiah, stageLabels } from '@/lib/format'
import { listSales } from '@/lib/queries'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const filters: { value?: SaleStage; label: string }[] = [
  { label: 'Semua' },
  ...(['penawaran', 'pesanan', 'dikirim', 'faktur', 'lunas', 'batal'] as SaleStage[]).map((s) => ({
    value: s,
    label: stageLabels[s],
  })),
]

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ tahap?: string }> }) {
  const { tahap } = await searchParams
  const stage = filters.find((f) => f.value === tahap)?.value
  const rows = await listSales(stage)

  return (
    <>
      <PageHeader
        title="Penjualan"
        description="Penawaran, pesanan, pengiriman, faktur, dan pembayaran dalam satu alur."
        actions={
          <Button size="sm" render={<Link href="/penjualan/baru" />} nativeButton={false}>
            <Plus aria-hidden="true" />
            Transaksi baru
          </Button>
        }
      />

      <nav aria-label="Filter tahap" className="flex gap-1 overflow-x-auto">
        {filters.map((f) => {
          const active = f.value === stage
          return (
            <Link
              key={f.label}
              href={f.value ? `/penjualan?tahap=${f.value}` : '/penjualan'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground',
                active && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
              )}
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      <div className="rounded-xl border bg-card">
        {rows.length === 0 ? (
          <Empty>Belum ada transaksi di tahap ini.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Sisa</TableHead>
                <TableHead>Tahap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/penjualan/${s.id}`} className="font-mono text-xs hover:text-primary hover:underline">
                      {s.number}
                    </Link>
                  </TableCell>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(s.total)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {rupiah(Math.max(0, s.total - s.paid))}
                  </TableCell>
                  <TableCell>
                    <StageBadge stage={s.stage} />
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
