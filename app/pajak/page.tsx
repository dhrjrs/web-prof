import { listTaxSales } from '@/lib/queries'
import { getTaxSettings } from '@/lib/tax-server'
import { TaxExportClient } from '@/components/tax-export-client'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{
    from?: string
    to?: string
    stage?: string
  }>
}

export default async function TaxPage({ searchParams }: PageProps) {
  const { from, to, stage } = await searchParams

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const defaultFrom = `${year}-${month}-01`
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const defaultTo = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  const effectiveFrom = from || defaultFrom
  const effectiveTo = to || defaultTo
  const effectiveStage = stage && stage !== 'semua' ? (stage as any) : undefined

  const [sales, config] = await Promise.all([
    listTaxSales({
      from: effectiveFrom,
      to: effectiveTo,
      stage: effectiveStage,
    }),
    getTaxSettings(),
  ])

  return (
    <TaxExportClient
      sales={sales}
      config={config}
      initialFrom={effectiveFrom}
      initialTo={effectiveTo}
      initialStage={stage || 'semua'}
    />
  )
}
