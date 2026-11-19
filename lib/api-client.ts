'use client'

import type { ActionResult } from '@/lib/validation'

function isActionResult(value: unknown): value is ActionResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return (
    (result.ok === undefined || typeof result.ok === 'boolean') &&
    (result.error === undefined || typeof result.error === 'string') &&
    (result.message === undefined || typeof result.message === 'string')
  )
}

export async function submitApiAction(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  values: Record<string, string | number>,
): Promise<ActionResult> {
  const url = endpoint.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (placeholder, key: string) => {
    const value = values[key]
    return value === undefined ? placeholder : encodeURIComponent(String(value))
  })
  if (url.includes('/:')) return { error: 'Parameter endpoint tidak lengkap' }

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(values),
    })
    const payload: unknown = await response.json()
    if (!isActionResult(payload)) {
      return { error: response.ok ? 'Respons server tidak valid' : 'Permintaan gagal' }
    }
    if (!response.ok) return { error: payload.error ?? 'Permintaan gagal' }
    return payload
  } catch {
    return { error: 'Tidak dapat terhubung ke server. Coba lagi.' }
  }
}

export async function submitFormApiAction(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH',
  formData: FormData,
): Promise<ActionResult> {
  const values: Record<string, string | number> = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : value.name]),
  )
  return submitApiAction(endpoint, method, values)
}
