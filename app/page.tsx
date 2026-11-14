import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Empty, PageHeader, Section, Stat } from '@/components/page-header'
import { StageBadge } from '@/components/stage-badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatDate, periodLabel, rupiah } from '@/lib/format'
import { getDashboard } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const d = await getDashboard()
  const targetPct = d.target ? Math.min(100, Math.round((d.monthSales / d.target) * 100)) : 0

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan ${periodLabel(d.period)}`}
        actions={
          <Button size="sm" render={<Link href="/penjualan/baru" />} nativeButton={false}>
            <Plus aria-hidden="true" />
            Transaksi baru
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Penjualan bulan ini" value={rupiah(d.monthSales)} hint={`${d.invoiceCount} faktur`} />
        <Stat label="Piutang" value={rupiah(d.receivable)} hint="Faktur belum lunas" />
        <Stat label="Pesanan berjalan" value={String(d.pendingOrders)} hint="Belum difakturkan" />
        <Stat
          label="Galon tersedia"
          value={`${d.gallons.available} / ${d.gallons.total}`}
          hint={`${d.gallons.out} sedang dipinjam`}
        />
      </div>

      {d.target ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Target penjualan</span>
            <span className="tabular-nums text-muted-foreground">
              {rupiah(d.monthSales)} / {rupiah(d.target)}
            </span>
          </div>
          <Progress value={targetPct} aria-label={`Target tercapai ${targetPct}%`} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Stok menipis"
          actions={
            <Link href="/stok" className="text-xs text-muted-foreground hover:text-foreground">
              Lihat stok
            </Link>
          }
        >
          {d.lowStock.length === 0 ? (
            <Empty>Semua stok aman.</Empty>
          ) : (
            <ul className="flex flex-col divide-y">
              {d.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  <span className="tabular-nums text-destructive">
                    {p.stock} {p.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Galon jatuh tempo"
          actions={
            <Link href="/galon" className="text-xs text-muted-foreground hover:text-foreground">
              Kelola galon
            </Link>
          }
        >
          {d.dueLoans.length === 0 ? (
            <Empty>Tidak ada galon yang lewat tempo.</Empty>
          ) : (
            <ul className="flex flex-col divide-y">
              {d.dueLoans.map(({ loan, customerName }) => (
                <li key={loan.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{customerName}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {loan.qty - loan.returnedQty} galon · {formatDate(loan.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section
        title="Transaksi terbaru"
        actions={
          <Link href="/penjualan" className="text-xs text-muted-foreground hover:text-foreground">
            Semua transaksi
          </Link>
        }
      >
        {d.recent.length === 0 ? (
          <Empty>Belum ada transaksi.</Empty>
        ) : (
          <ul className="flex flex-col divide-y">
            {d.recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/penjualan/${s.id}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{s.customerName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{s.number}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{rupiah(s.total)}</span>
                    <StageBadge stage={s.stage} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
