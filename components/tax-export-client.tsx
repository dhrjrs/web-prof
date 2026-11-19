'use client'

import { useActionState, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Copy,
  Download,
  Eye,
  FileCode2,
  Filter,
  Receipt,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { saveTaxSettings } from '@/app/actions/tax'
import { Field, SelectField } from '@/components/fields'
import { Empty, PageHeader, Stat } from '@/components/page-header'
import { StageBadge } from '@/components/stage-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { rupiah } from '@/lib/format'
import {
  calculateItemTax,
  generateCoretaxXml,
  type TaxableSale,
  type TaxSettings,
} from '@/lib/tax'
import type { ActionResult } from '@/lib/validation'

type Props = {
  sales: TaxableSale[]
  config: TaxSettings
  initialFrom?: string
  initialTo?: string
  initialStage?: string
}

export function TaxExportClient({
  sales,
  config,
  initialFrom = '',
  initialTo = '',
  initialStage = 'semua',
}: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(sales.map((s) => s.id)),
  )
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [stage, setStage] = useState(initialStage)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Filter application
  function applyFilters(newFrom = from, newTo = to, newStage = stage) {
    const params = new URLSearchParams()
    if (newFrom) params.set('from', newFrom)
    if (newTo) params.set('to', newTo)
    if (newStage && newStage !== 'semua') params.set('stage', newStage)
    router.push(`/pajak?${params.toString()}`)
  }

  function setPreset(days: 'today' | 'this_month' | 'last_month') {
    const now = new Date()
    let startStr = ''
    let endStr = ''

    if (days === 'today') {
      startStr = now.toISOString().slice(0, 10)
      endStr = startStr
    } else if (days === 'this_month') {
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      startStr = `${year}-${month}-01`
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    } else if (days === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const year = prev.getFullYear()
      const month = String(prev.getMonth() + 1).padStart(2, '0')
      startStr = `${year}-${month}-01`
      const lastDay = new Date(year, prev.getMonth() + 1, 0).getDate()
      endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    }

    setFrom(startStr)
    setTo(endStr)
    applyFilters(startStr, endStr, stage)
  }

  // Selection toggle
  const allSelected = sales.length > 0 && selectedIds.size === sales.length
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sales.map((s) => s.id)))
    }
  }

  function toggleRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedSales = useMemo(() => {
    return sales.filter((s) => selectedIds.has(s.id))
  }, [sales, selectedIds])

  // Calculation summaries
  const totals = useMemo(() => {
    let taxBase = 0
    let otherTaxBase = 0
    let vat = 0
    let totalItems = 0

    for (const sale of selectedSales) {
      for (const item of sale.items) {
        const calc = calculateItemTax(item, config)
        taxBase += calc.taxBase
        otherTaxBase += calc.otherTaxBase
        vat += calc.vat
        totalItems += calc.qty
      }
    }

    return {
      taxBase: Math.round(taxBase * 100) / 100,
      otherTaxBase: Math.round(otherTaxBase * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      totalItems,
    }
  }, [selectedSales, config])

  // XML generation
  const generatedXml = useMemo(() => {
    if (selectedSales.length === 0) return ''
    return generateCoretaxXml(selectedSales, config)
  }, [selectedSales, config])

  function handleDownload() {
    if (selectedSales.length === 0) {
      toast.error('Pilih setidaknya satu transaksi untuk diekspor')
      return
    }

    const xml = generatedXml
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    a.download = `TaxInvoiceBulk_${dateStr}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Berhasil mengunduh ${selectedSales.length} faktur pajak Coretax XML`)
  }

  function handleCopy() {
    if (!generatedXml) return
    navigator.clipboard.writeText(generatedXml)
    setCopied(true)
    toast.success('XML berhasil disalin ke clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const [settingsState, settingsAction, settingsPending] = useActionState<ActionResult, FormData>(
    async (_prev, fd) => {
      const res = await saveTaxSettings(fd)
      if (res.ok) {
        toast.success(res.message || 'Pengaturan pajak diperbarui')
        setSettingsOpen(false)
        router.refresh()
      } else if (res.error) {
        toast.error(res.error)
      }
      return res
    },
    {},
  )

  return (
    <>
      <PageHeader
        title="Faktur Pajak (e-Faktur Coretax XML)"
        description="Ekspor data penjualan ke format XML Coretax DJP (TaxInvoiceBulk) sesuai ketentuan e-Faktur terbaru."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="size-4" />
              Pengaturan Pajak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              disabled={selectedSales.length === 0}
            >
              <Eye className="size-4" />
              Lihat XML
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={selectedSales.length === 0}
            >
              <Download className="size-4" />
              Unduh XML ({selectedSales.length})
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Faktur Dipilih"
          value={`${selectedSales.length} / ${sales.length}`}
          hint={`${totals.totalItems} unit barang`}
        />
        <Stat
          label="DPP (Dasar Pengenaan Pajak)"
          value={rupiah(totals.taxBase)}
          hint="Nilai total transaksi sebelum PPN"
        />
        <Stat
          label="DPP Nilai Lain (11/12)"
          value={rupiah(totals.otherTaxBase)}
          hint={`Kode ${config.trxCode} - Tarif Efektif`}
        />
        <Stat
          label={`PPN (${config.vatRate}%)`}
          value={rupiah(totals.vat)}
          hint="Total PPN terutang e-Faktur"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36">
            <Label htmlFor="from-date" className="text-xs">Dari Tanggal</Label>
            <Input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="w-36">
            <Label htmlFor="to-date" className="text-xs">Sampai Tanggal</Label>
            <Input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="w-32">
            <Label htmlFor="stage-filter" className="text-xs">Tahap</Label>
            <select
              id="stage-filter"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="semua">Semua</option>
              <option value="faktur">Faktur</option>
              <option value="lunas">Lunas</option>
              <option value="dikirim">Dikirim</option>
              <option value="pesanan">Pesanan</option>
            </select>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => applyFilters(from, to, stage)}
            className="h-9 text-xs"
          >
            <Filter className="size-3.5 mr-1" />
            Terapkan
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Preset:</span>
          <Button variant="ghost" size="xs" onClick={() => setPreset('today')}>
            Hari ini
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setPreset('this_month')}>
            Bulan ini
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setPreset('last_month')}>
            Bulan lalu
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border bg-card">
        {sales.length === 0 ? (
          <Empty>Tidak ada transaksi yang cocok dengan filter tanggal/tahap.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Pilih semua transaksi"
                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </TableHead>
                <TableHead>No. Transaksi / Ref</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pembeli (Buyer)</TableHead>
                <TableHead>Identitas (NIK/NPWP)</TableHead>
                <TableHead className="text-right">DPP (TaxBase)</TableHead>
                <TableHead className="text-right">PPN ({config.vatRate}%)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => {
                const isSelected = selectedIds.has(sale.id)
                // Calculate sale tax summary
                let saleTaxBase = 0
                let saleVat = 0
                for (const item of sale.items) {
                  const c = calculateItemTax(item, config)
                  saleTaxBase += c.taxBase
                  saleVat += c.vat
                }

                return (
                  <TableRow
                    key={sale.id}
                    className={isSelected ? 'bg-muted/30' : undefined}
                    onClick={() => toggleRow(sale.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(sale.id)}
                        aria-label={`Pilih transaksi ${sale.number}`}
                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium">{sale.number}</span>
                      <span className="block text-xs text-muted-foreground">
                        {sale.items.length} item barang
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {sale.date}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sale.customer.name}</span>
                      {sale.customer.address ? (
                        <span className="block max-w-xs truncate text-xs text-muted-foreground">
                          {sale.customer.address}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {sale.customer.npwp ? (
                        <span className="block font-mono">NPWP: {sale.customer.npwp}</span>
                      ) : sale.customer.nik ? (
                        <span className="block font-mono">NIK: {sale.customer.nik}</span>
                      ) : (
                        <span className="text-muted-foreground">Tanpa NPWP/NIK (0000...)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {rupiah(saleTaxBase)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-sm text-primary">
                      {rupiah(saleVat)}
                    </TableCell>
                    <TableCell>
                      <StageBadge stage={sale.stage as any} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal: Preview XML */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode2 className="size-5 text-primary" />
              Preview e-Faktur Coretax XML
            </DialogTitle>
            <DialogDescription>
              Struktur XML <code className="font-mono">&lt;TaxInvoiceBulk&gt;</code> untuk {selectedSales.length} faktur yang siap diimpor ke sistem Coretax DJP.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs font-mono text-zinc-100">
            <pre className="whitespace-pre">{generatedXml}</pre>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              {copied ? 'Tersalin' : 'Salin XML'}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(false)}
              >
                Tutup
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setPreviewOpen(false)
                  handleDownload()
                }}
                className="gap-1.5"
              >
                <Download className="size-4" />
                Unduh XML
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Pengaturan Pajak */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Pengaturan Identitas & Nilai Pajak
            </DialogTitle>
            <DialogDescription>
              Informasi NPWP Penjual, NITKU, Kode Transaksi, dan tarif perhitungan e-Faktur Coretax.
            </DialogDescription>
          </DialogHeader>

          <form action={settingsAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="NPWP Penjual (TIN 16 digit)"
                name="sellerTin"
                defaultValue={config.sellerTin}
                required
                maxLength={20}
              />
              <Field
                label="NITKU Penjual (22 digit)"
                name="sellerIdtku"
                defaultValue={config.sellerIdtku}
                required
                maxLength={25}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Kode Transaksi (TrxCode)"
                name="trxCode"
                defaultValue={config.trxCode}
                options={[
                  { value: '04', label: '04 - DPP Nilai Lain' },
                  { value: '01', label: '01 - Kepada Bukan Pemungut' },
                  { value: '02', label: '02 - Kepada Pemungut Instansi Pemerintah' },
                  { value: '03', label: '03 - Kepada Pemungut BUMN' },
                ]}
              />
              <Field
                label="Tarif PPN (%)"
                name="vatRate"
                type="number"
                defaultValue={config.vatRate}
                required
                min={0}
                max={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Hitung DPP Nilai Lain (11/12)"
                name="useOtherTaxBase"
                defaultValue={config.useOtherTaxBase ? 'true' : 'false'}
                options={[
                  { value: 'true', label: 'Ya (11/12 dari DPP)' },
                  { value: 'false', label: 'Tidak (Sama dengan DPP)' },
                ]}
              />
              <Field
                label="Kode Satuan Default"
                name="defaultUnit"
                defaultValue={config.defaultUnit}
                required
                maxLength={20}
              />
            </div>

            <SelectField
              label="Format Harga Produk di Sistem"
              name="priceIncludesVat"
              defaultValue={config.priceIncludesVat ? 'true' : 'false'}
              options={[
                { value: 'false', label: 'Belum Termasuk PPN (Netto / DPP)' },
                { value: 'true', label: 'Sudah Termasuk PPN (Bruto)' },
              ]}
            />

            {settingsState.error ? (
              <p className="text-xs text-destructive font-medium">{settingsState.error}</p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSettingsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={settingsPending}>
                {settingsPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

