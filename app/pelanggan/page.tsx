import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { Field, SelectField, TextareaField } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listCategories, listCustomers } from '@/lib/queries'

export const dynamic = 'force-dynamic'

type Customer = Awaited<ReturnType<typeof listCustomers>>[number]

function CustomerFields({ customer, categories }: { customer?: Customer; categories: { value: number; label: string }[] }) {
  return (
    <>
      {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
      <Field label="Nama" name="name" defaultValue={customer?.name} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="No. HP" name="phone" type="tel" defaultValue={customer?.phone ?? ''} maxLength={30} />
        <SelectField
          label="Kategori"
          name="categoryId"
          placeholder="Tanpa kategori"
          options={categories}
          defaultValue={customer?.categoryId ?? ''}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NIK (KTP 16 digit)" name="nik" defaultValue={customer?.nik ?? ''} maxLength={20} placeholder="6371..." />
        <Field label="NPWP (16 digit)" name="npwp" defaultValue={customer?.npwp ?? ''} maxLength={20} placeholder="0000..." />
      </div>
      <Field label="Email" name="email" type="email" defaultValue={customer?.email ?? ''} maxLength={100} placeholder="nama@email.com" />
      <TextareaField label="Alamat" name="address" defaultValue={customer?.address ?? ''} maxLength={300} />
    </>
  )
}

export default async function CustomersPage() {
  const [rows, cats] = await Promise.all([listCustomers(), listCategories('pelanggan')])
  const categories = cats.map((c) => ({ value: c.id, label: c.name }))

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description={`${rows.length} pelanggan terdaftar`}
        actions={
          <FormDialog
            title="Tambah pelanggan"
            trigger={
              <>
                <Plus aria-hidden="true" />
                Pelanggan
              </>
            }
            endpoint="/api/customers"
          >
            <CustomerFields categories={categories} />
          </FormDialog>
        }
      />

      <div className="rounded-xl border bg-card">
        {rows.length === 0 ? (
          <Empty>Belum ada pelanggan.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Kontak</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Galon dipinjam</TableHead>
                <TableHead className="w-20">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="block font-medium">{c.name}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {c.nik ? <span>NIK: {c.nik}</span> : null}
                      {c.npwp ? <span>NPWP: {c.npwp}</span> : null}
                      {c.address ? <span>{c.address}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{c.phone ?? '-'}</TableCell>
                  <TableCell>{c.categoryName ? <Badge variant="secondary">{c.categoryName}</Badge> : '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.gallonsOut}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                    <FormDialog
                      title="Ubah pelanggan"
                      trigger={
                        <>
                          <Pencil aria-hidden="true" />
                          <span className="sr-only">Ubah {c.name}</span>
                        </>
                      }
                      triggerVariant="ghost"
                      triggerSize="xs"
                      endpoint="/api/customers/:id"
                      method="PUT"
                    >
                      <CustomerFields customer={c} categories={categories} />
                    </FormDialog>
                    <ActionButton
                      endpoint="/api/customers/:id"
                      fields={{ id: c.id }}
                      variant="ghost"
                      size="xs"
                      confirm={`Hapus pelanggan ${c.name}?`}
                      label={`Hapus ${c.name}`}
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
