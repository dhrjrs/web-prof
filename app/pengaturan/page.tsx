import { Plus, X } from 'lucide-react'
import { deleteCategory, saveCategory, saveGallonTotal } from '@/app/actions/customers'
import { ActionButton } from '@/components/action-button'
import { Field } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader, Section } from '@/components/page-header'
import { getGallonSummary, listCategories } from '@/lib/queries'

export const dynamic = 'force-dynamic'

type Category = Awaited<ReturnType<typeof listCategories>>[number]

function CategoryList({ title, type, rows }: { title: string; type: 'pelanggan' | 'penjualan'; rows: Category[] }) {
  return (
    <Section
      title={title}
      actions={
        <FormDialog
          title={`Tambah ${title.toLowerCase()}`}
          trigger={
            <>
              <Plus aria-hidden="true" />
              Tambah
            </>
          }
          triggerVariant="outline"
          triggerSize="xs"
          action={saveCategory}
        >
          <input type="hidden" name="type" value={type} />
          <Field label="Nama kategori" name="name" required maxLength={60} />
        </FormDialog>
      }
    >
      {rows.length === 0 ? (
        <Empty>Belum ada kategori.</Empty>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-1.5">
              {c.name}
              <ActionButton
                action={deleteCategory}
                fields={{ id: c.id }}
                variant="ghost"
                size="icon-sm"
                confirm={`Hapus kategori ${c.name}?`}
                label={`Hapus ${c.name}`}
              >
                <X aria-hidden="true" />
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export default async function SettingsPage() {
  const [cats, gallons] = await Promise.all([listCategories(), getGallonSummary()])

  return (
    <>
      <PageHeader title="Pengaturan" description="Kategori dan inventaris galon." />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryList title="Kategori pelanggan" type="pelanggan" rows={cats.filter((c) => c.type === 'pelanggan')} />
        <CategoryList title="Kategori penjualan" type="penjualan" rows={cats.filter((c) => c.type === 'penjualan')} />
        <Section
          title="Inventaris galon"
          actions={
            <FormDialog
              title="Total galon milik toko"
              description={`${gallons.out} galon sedang dipinjam`}
              trigger="Ubah"
              triggerVariant="outline"
              triggerSize="xs"
              action={saveGallonTotal}
            >
              <Field label="Total galon" name="gallonTotal" type="number" min={gallons.out} defaultValue={gallons.total} required />
            </FormDialog>
          }
        >
          <p className="text-sm text-muted-foreground">
            Toko memiliki <span className="font-medium text-foreground tabular-nums">{gallons.total}</span> galon untuk
            dipinjamkan.
          </p>
        </Section>
      </div>
    </>
  )
}
