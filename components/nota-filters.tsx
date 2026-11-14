import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Field, SelectField } from '@/components/fields'
import { Button } from '@/components/ui/button'

type Option = { value: number; label: string }

export function NotaFilters({
  customers,
  from,
  to,
  customerId,
}: {
  customers: Option[]
  from?: string
  to?: string
  customerId?: number
}) {
  const active = Boolean(from || to || customerId)
  return (
    <form
      method="get"
      action="/nota"
      role="search"
      aria-label="Filter nota"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <Field label="Dari tanggal" name="dari" type="date" defaultValue={from ?? ''} className="sm:w-40" />
      <Field label="Sampai tanggal" name="sampai" type="date" defaultValue={to ?? ''} className="sm:w-40" />
      <SelectField
        label="Pelanggan"
        name="pelanggan"
        options={customers}
        placeholder="Semua pelanggan"
        defaultValue={customerId ?? ''}
        className="sm:min-w-48 sm:flex-1"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          <Search aria-hidden="true" />
          Terapkan
        </Button>
        {active ? (
          <Button variant="outline" size="sm" render={<Link href="/nota" />} nativeButton={false}>
            <X aria-hidden="true" />
            Reset
          </Button>
        ) : null}
      </div>
    </form>
  )
}
