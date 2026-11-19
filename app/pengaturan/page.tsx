import Link from 'next/link'
import { ArrowRight, FileCode2, KeyRound, Plus, X } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { Field } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader, Section } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { listCategories } from '@/lib/queries'

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
          endpoint="/api/categories"
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
                endpoint="/api/categories/:id"
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
  const cats = await listCategories()

  return (
    <>
      <PageHeader title="Pengaturan" description="Kategori pelanggan & penjualan, serta keamanan akun admin." />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryList title="Kategori pelanggan" type="pelanggan" rows={cats.filter((c) => c.type === 'pelanggan')} />
        <CategoryList title="Kategori penjualan" type="penjualan" rows={cats.filter((c) => c.type === 'penjualan')} />
        <Section
          title="Keamanan Admin"
          actions={
            <FormDialog
              title="Ganti Kata Sandi Admin"
              description="Ubah kata sandi untuk masuk ke sistem admin."
              trigger="Ganti Sandi"
              triggerVariant="outline"
              triggerSize="xs"
              endpoint="/api/settings/password"
            >
              <Field
                label="Kata Sandi Saat Ini"
                name="currentPassword"
                type="password"
                required
                placeholder="••••••••"
              />
              <Field
                label="Kata Sandi Baru"
                name="newPassword"
                type="password"
                required
                placeholder="Minimal 5 karakter"
                minLength={5}
              />
              <Field
                label="Konfirmasi Kata Sandi Baru"
                name="confirmPassword"
                type="password"
                required
                placeholder="Ulangi kata sandi baru"
                minLength={5}
              />
            </FormDialog>
          }
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="size-4 text-primary" />
            <span>Username: <strong className="text-foreground">admin</strong> (Sesi login berlaku 7 hari)</span>
          </div>
        </Section>

        <Section
          title="Faktur Pajak Coretax XML"
          actions={
            <Button size="xs" variant="outline" render={<Link href="/pajak" />} nativeButton={false}>
              Buka Pajak
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCode2 className="size-4 text-primary" />
            <span>Ekspor data penjualan ke XML format resmi DJP Coretax (&lt;TaxInvoiceBulk&gt;).</span>
          </div>
        </Section>
      </div>
    </>
  )
}
