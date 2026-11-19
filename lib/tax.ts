export type TaxSettings = {
  sellerTin: string
  sellerIdtku: string
  trxCode: string
  vatRate: number
  useOtherTaxBase: boolean
  priceIncludesVat: boolean
  defaultUnit: string
}

export const defaultTaxSettings: TaxSettings = {
  sellerTin: '0761268432731000',
  sellerIdtku: '0761268432731000000000',
  trxCode: '04',
  vatRate: 12,
  useOtherTaxBase: true,
  priceIncludesVat: false,
  defaultUnit: 'UM.0018',
}

export function escapeXml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export type TaxableSaleItem = {
  name: string
  qty: number
  price: number
  discountPercent?: number
  unit?: string
}

export type TaxableSale = {
  id: number
  number: string
  date: string // YYYY-MM-DD
  stage?: string
  total?: number
  paid?: number
  customer: {
    name: string
    address?: string | null
    nik?: string | null
    npwp?: string | null
    email?: string | null
  }
  items: TaxableSaleItem[]
}

export type CalculatedItem = {
  opt: string
  code: string
  name: string
  unit: string
  price: number
  qty: number
  totalDiscount: number
  taxBase: number
  otherTaxBase: number
  vatRate: number
  vat: number
  stlgrate: number
  stlg: number
}

export function calculateItemTax(item: TaxableSaleItem, config: TaxSettings): CalculatedItem {
  const qty = Math.max(1, item.qty)
  const discountPercent = item.discountPercent ?? 0
  const vatRate = config.vatRate

  let unitPrice = item.price
  let totalDiscount = 0

  if (config.priceIncludesVat) {
    const effectiveVat = config.trxCode === '04' && config.useOtherTaxBase ? (11 / 12) * (vatRate / 100) : vatRate / 100
    const grossTotal = item.price * qty * (1 - discountPercent / 100)
    const netTotal = grossTotal / (1 + effectiveVat)
    unitPrice = netTotal / qty
  } else {
    if (discountPercent > 0) {
      totalDiscount = Math.round(((item.price * qty * discountPercent) / 100) * 100) / 100
    }
  }

  const taxBase = Math.round((unitPrice * qty - totalDiscount) * 100) / 100
  let otherTaxBase = taxBase

  if (config.trxCode === '04' && config.useOtherTaxBase) {
    otherTaxBase = Math.round(taxBase * (11 / 12) * 100) / 100
  }

  const vat = Math.round(otherTaxBase * (vatRate / 100) * 100) / 100

  return {
    opt: 'A',
    code: '000000',
    name: item.name,
    unit: item.unit || config.defaultUnit || 'UM.0018',
    price: Math.round(unitPrice * 100) / 100,
    qty,
    totalDiscount,
    taxBase,
    otherTaxBase,
    vatRate,
    vat,
    stlgrate: 0,
    stlg: 0,
  }
}

export function formatXmlNumber(num: number): string {
  return Number(num.toFixed(2)).toString()
}

export function generateCoretaxXml(sales: TaxableSale[], config: TaxSettings): string {
  const invoicesXml = sales
    .map((sale) => {
      let buyerTin = '0000000000000000'
      let buyerDoc = 'National ID'
      let buyerDocNum = '0000000000000000'

      if (sale.customer.npwp && sale.customer.npwp.replace(/\D/g, '').length >= 15) {
        const cleanNpwp = sale.customer.npwp.replace(/\D/g, '')
        buyerTin = cleanNpwp.length === 15 ? `${cleanNpwp}0` : cleanNpwp.padEnd(16, '0')
        buyerDoc = 'TIN'
        buyerDocNum = buyerTin
      } else if (sale.customer.nik && sale.customer.nik.replace(/\D/g, '').length >= 16) {
        buyerDocNum = sale.customer.nik.replace(/\D/g, '').slice(0, 16)
        buyerDoc = 'National ID'
        buyerTin = '0000000000000000'
      }

      const calculatedItems = sale.items.map((i) => calculateItemTax(i, config))

      const itemsXml = calculatedItems
        .map(
          (ci) => `        <GoodService>
          <Opt>${escapeXml(ci.opt)}</Opt>
          <Code>${escapeXml(ci.code)}</Code>
          <Name>${escapeXml(ci.name)}</Name>
          <Unit>${escapeXml(ci.unit)}</Unit>
          <Price>${formatXmlNumber(ci.price)}</Price>
          <Qty>${ci.qty}</Qty>
          <TotalDiscount>${formatXmlNumber(ci.totalDiscount)}</TotalDiscount>
          <TaxBase>${formatXmlNumber(ci.taxBase)}</TaxBase>
          <OtherTaxBase>${formatXmlNumber(ci.otherTaxBase)}</OtherTaxBase>
          <VATRate>${ci.vatRate}</VATRate>
          <VAT>${formatXmlNumber(ci.vat)}</VAT>
          <STLGRate>${ci.stlgrate}</STLGRate>
          <STLG>${ci.stlg}</STLG>
        </GoodService>`,
        )
        .join('\n')

      return `    <TaxInvoice>
      <TaxInvoiceDate>${sale.date}</TaxInvoiceDate>
      <TaxInvoiceOpt>Normal</TaxInvoiceOpt>
      <TrxCode>${escapeXml(config.trxCode)}</TrxCode>
      <AddInfo></AddInfo>
      <CustomDoc></CustomDoc>
      <RefDesc>${escapeXml(sale.number)}</RefDesc>
      <FacilityStamp></FacilityStamp>
      <SellerIDTKU>${escapeXml(config.sellerIdtku)}</SellerIDTKU>
      <BuyerTin>${escapeXml(buyerTin)}</BuyerTin>
      <BuyerDocument>${escapeXml(buyerDoc)}</BuyerDocument>
      <BuyerCountry>IDN</BuyerCountry>
      <BuyerDocumentNumber>${escapeXml(buyerDocNum)}</BuyerDocumentNumber>
      <BuyerName>${escapeXml(sale.customer.name)}</BuyerName>
      <BuyerAdress>${escapeXml(sale.customer.address || '-')}</BuyerAdress>
      <BuyerEmail>${escapeXml(sale.customer.email || '')}</BuyerEmail>
      <BuyerIDTKU></BuyerIDTKU>
      <ListOfGoodService>
${itemsXml}
      </ListOfGoodService>
    </TaxInvoice>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<TaxInvoiceBulk xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="TaxInvoice.xsd">
  <TIN>${escapeXml(config.sellerTin)}</TIN>
  <ListOfTaxInvoice>
${invoicesXml}
  </ListOfTaxInvoice>
</TaxInvoiceBulk>
`
}
