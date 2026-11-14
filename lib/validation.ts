export type ActionResult = { ok?: boolean; error?: string; message?: string }

export class ValidationError extends Error {}

export function text(fd: FormData, key: string, { required = false, max = 200 } = {}) {
  const raw = fd.get(key)
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (required && !value) throw new ValidationError(`Kolom ${key} wajib diisi`)
  if (value.length > max) throw new ValidationError(`Kolom ${key} terlalu panjang`)
  return value || null
}

export function int(
  fd: FormData,
  key: string,
  { min = 0, max = 1_000_000_000, required = true, label = key } = {},
) {
  const raw = fd.get(key)
  if ((raw === null || raw === '') && !required) return null
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`${label} harus berupa angka bulat antara ${min} dan ${max}`)
  }
  return value
}

export async function run(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await fn()
    return { ok: true, message: message ?? 'Tersimpan' }
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message }
    console.error('[v0] action failed', error)
    return { error: 'Terjadi kesalahan. Coba lagi.' }
  }
}
