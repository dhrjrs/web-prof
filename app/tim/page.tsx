import { MapPin, Pencil, Plus, Target } from 'lucide-react'
import { addCheckIn, saveSalesperson, saveTarget } from '@/app/actions/team'
import { Field, SelectField, TextareaField } from '@/components/fields'
import { FormDialog } from '@/components/form-dialog'
import { Empty, PageHeader, Section } from '@/components/page-header'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime, periodLabel, rupiah } from '@/lib/format'
import { getTeamOverview, listCustomers } from '@/lib/queries'

export const dynamic = 'force-dynamic'

function pct(value: number, target: number) {
  return target ? Math.min(100, Math.round((value / target) * 100)) : 0
}

export default async function TeamPage() {
  const [team, customers] = await Promise.all([getTeamOverview(), listCustomers()])
  const people = team.rows.map((p) => ({ value: p.id, label: p.name }))

  return (
    <>
      <PageHeader
        title="Tim Penjual"
        description={`Komisi, target, dan check in · ${periodLabel(team.period)}`}
        actions={
          <>
            <FormDialog
              title="Check in kunjungan"
              trigger={
                <>
                  <MapPin aria-hidden="true" />
                  Check in
                </>
              }
              triggerVariant="outline"
              action={addCheckIn}
            >
              <SelectField label="Penjual" name="salespersonId" placeholder="Pilih penjual" options={people} required />
              <SelectField
                label="Pelanggan"
                name="customerId"
                placeholder="Pilih pelanggan"
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
                required
              />
              <TextareaField label="Catatan" name="note" maxLength={500} />
            </FormDialog>
            <FormDialog
              title="Atur target penjualan"
              description="Kosongkan penjual untuk target toko."
              trigger={
                <>
                  <Target aria-hidden="true" />
                  Target
                </>
              }
              triggerVariant="outline"
              action={saveTarget}
            >
              <Field label="Periode" name="period" type="month" defaultValue={team.period} required />
              <SelectField label="Penjual" name="salespersonId" placeholder="Seluruh toko" options={people} />
              <Field label="Target (Rp)" name="amount" type="number" min={1} required />
            </FormDialog>
            <FormDialog
              title="Tambah penjual"
              trigger={
                <>
                  <Plus aria-hidden="true" />
                  Penjual
                </>
              }
              action={saveSalesperson}
            >
              <Field label="Nama" name="name" required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="No. HP" name="phone" type="tel" maxLength={30} />
                <Field label="Komisi (%)" name="commissionPercent" type="number" min={0} max={100} step="0.01" defaultValue={0} />
              </div>
            </FormDialog>
          </>
        }
      />

      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Target toko</span>
          <span className="tabular-nums text-muted-foreground">
            {rupiah(team.storeTotal)} / {team.storeTarget ? rupiah(team.storeTarget) : 'belum diatur'}
          </span>
        </div>
        <Progress value={pct(team.storeTotal, team.storeTarget)} aria-label="Pencapaian target toko" />
      </div>

      <Section title="Komisi penjual">
        {team.rows.length === 0 ? (
          <Empty>Belum ada penjual.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Penjual</TableHead>
                <TableHead className="text-right">Penjualan</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                <TableHead className="hidden w-40 sm:table-cell">Target</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="block">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{Number(p.commissionPercent)}% komisi</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(p.monthSales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(p.commission)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {p.target ? (
                      <div className="flex flex-col gap-1">
                        <Progress value={pct(p.monthSales, p.target)} aria-label={`Target ${p.name}`} />
                        <span className="text-xs text-muted-foreground tabular-nums">{rupiah(p.target)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <FormDialog
                      title="Ubah penjual"
                      trigger={
                        <>
                          <Pencil aria-hidden="true" />
                          <span className="sr-only">Ubah {p.name}</span>
                        </>
                      }
                      triggerVariant="ghost"
                      triggerSize="xs"
                      action={saveSalesperson}
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <Field label="Nama" name="name" defaultValue={p.name} required />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="No. HP" name="phone" type="tel" defaultValue={p.phone ?? ''} maxLength={30} />
                        <Field
                          label="Komisi (%)"
                          name="commissionPercent"
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          defaultValue={Number(p.commissionPercent)}
                        />
                      </div>
                    </FormDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-xs text-muted-foreground">Komisi dihitung dari faktur bulan ini.</p>
      </Section>

      <Section title="Check in terbaru">
        {team.recentCheckIns.length === 0 ? (
          <Empty>Belum ada check in.</Empty>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {team.recentCheckIns.map(({ checkIn, salespersonName, customerName }) => (
              <li key={checkIn.id} className="flex flex-col gap-0.5 py-2">
                <span>
                  {salespersonName} <span className="text-muted-foreground">mengunjungi</span> {customerName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(checkIn.createdAt)}
                  {checkIn.note ? ` · ${checkIn.note}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
