'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { run, text, int } from '@/lib/validation'

export async function saveTaxSettings(fd: FormData) {
  return run(async () => {
    const sellerTin = text(fd, 'sellerTin', { required: true, max: 20 })!
    const sellerIdtku = text(fd, 'sellerIdtku', { required: true, max: 30 })!
    const trxCode = text(fd, 'trxCode', { required: true, max: 10 })!
    const vatRate = int(fd, 'vatRate', { required: true, min: 0, max: 100 })!
    const useOtherTaxBase = fd.get('useOtherTaxBase') === 'true' ? 'true' : 'false'
    const priceIncludesVat = fd.get('priceIncludesVat') === 'true' ? 'true' : 'false'
    const defaultUnit = text(fd, 'defaultUnit', { required: true, max: 20 })!

    const updates = [
      ['tax_seller_tin', sellerTin],
      ['tax_seller_idtku', sellerIdtku],
      ['tax_trx_code', trxCode],
      ['tax_vat_rate', String(vatRate)],
      ['tax_use_other_tax_base', useOtherTaxBase],
      ['tax_price_includes_vat', priceIncludesVat],
      ['tax_default_unit', defaultUnit],
    ]

    for (const [key, value] of updates) {
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
    }

    revalidatePath('/pajak')
    return 'Pengaturan pajak berhasil disimpan'
  })
}

