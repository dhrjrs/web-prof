import { NextResponse, type NextRequest } from 'next/server'
import { listTaxSales, type TaxSalesFilter } from '@/lib/queries'
import { generateCoretaxXml } from '@/lib/tax'
import { getTaxSettings } from '@/lib/tax-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined
    const stage = searchParams.get('stage') as any
    const rawIds = searchParams.get('ids')

    const saleIds = rawIds
      ? rawIds
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => Number.isInteger(id) && id > 0)
      : undefined

    const filter: TaxSalesFilter = {
      from,
      to,
      stage: stage || undefined,
      saleIds,
    }

    const [sales, config] = await Promise.all([listTaxSales(filter), getTaxSettings()])
    const xml = generateCoretaxXml(sales, config)

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `TaxInvoiceBulk_${dateStr}.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[tax/xml] error generating xml', error)
    return NextResponse.json({ error: 'Gagal membuat file XML pajak' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { from, to, stage, ids } = body

    const saleIds = Array.isArray(ids)
      ? ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
      : undefined

    const filter: TaxSalesFilter = {
      from: from || undefined,
      to: to || undefined,
      stage: stage || undefined,
      saleIds,
    }

    const [sales, config] = await Promise.all([listTaxSales(filter), getTaxSettings()])
    const xml = generateCoretaxXml(sales, config)

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `TaxInvoiceBulk_${dateStr}.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[tax/xml] error generating xml', error)
    return NextResponse.json({ error: 'Gagal membuat file XML pajak' }, { status: 500 })
  }
}
