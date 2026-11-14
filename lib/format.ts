const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
})

export function rupiah(value: number) {
  return rupiahFormatter.format(value)
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return '-'
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '-'
  return dateTimeFormatter.format(new Date(value))
}

export function currentPeriod() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  return `${year}-${month}`
}

export function periodLabel(period: string) {
  const [y, m] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  )
}

export function netPrice(price: number, discountPercent: number) {
  return Math.round((price * (100 - discountPercent)) / 100)
}

export const stageLabels = {
  penawaran: 'Penawaran',
  pesanan: 'Pesanan',
  dikirim: 'Dikirim',
  faktur: 'Faktur',
  lunas: 'Lunas',
  batal: 'Batal',
} as const
