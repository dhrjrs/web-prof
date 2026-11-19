import 'server-only'

import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { defaultTaxSettings, type TaxSettings } from '@/lib/tax'

export async function getTaxSettings(): Promise<TaxSettings> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(
        inArray(settings.key, [
          'tax_seller_tin',
          'tax_seller_idtku',
          'tax_trx_code',
          'tax_vat_rate',
          'tax_use_other_tax_base',
          'tax_price_includes_vat',
          'tax_default_unit',
        ]),
      )

    const map = new Map(rows.map((r) => [r.key, r.value]))
    return {
      sellerTin: map.get('tax_seller_tin') || defaultTaxSettings.sellerTin,
      sellerIdtku: map.get('tax_seller_idtku') || defaultTaxSettings.sellerIdtku,
      trxCode: map.get('tax_trx_code') || defaultTaxSettings.trxCode,
      vatRate: Number(map.get('tax_vat_rate')) || defaultTaxSettings.vatRate,
      useOtherTaxBase: (map.get('tax_use_other_tax_base') ?? 'true') === 'true',
      priceIncludesVat: map.get('tax_price_includes_vat') === 'true',
      defaultUnit: map.get('tax_default_unit') || defaultTaxSettings.defaultUnit,
    }
  } catch {
    return defaultTaxSettings
  }
}

