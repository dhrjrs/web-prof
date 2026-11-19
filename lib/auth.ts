const SESSION_COOKIE_NAME = 'admin_session'
const SECRET = process.env.ADMIN_SECRET || 'web-prof-secret-session-key-2026'

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export async function createSessionToken(username: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<string> {
  const expiresAt = Date.now() + maxAgeMs
  const data = `${username}:${expiresAt}`
  const key = await getHmacKey(SECRET)
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const signatureHex = bytesToHex(new Uint8Array(signatureBuffer))
  return `${data}:${signatureHex}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<{ valid: boolean; username?: string }> {
  if (!token) return { valid: false }
  const parts = token.split(':')
  if (parts.length !== 3) return { valid: false }
  const [username, expiresAtStr, signatureHex] = parts
  const expiresAt = Number(expiresAtStr)
  if (!expiresAt || Number.isNaN(expiresAt) || Date.now() > expiresAt) return { valid: false }

  try {
    const data = `${username}:${expiresAtStr}`
    const key = await getHmacKey(SECRET)
    const signatureBytes = hexToBytes(signatureHex)
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(data))
    if (!valid) return { valid: false }
    return { valid: true, username }
  } catch {
    return { valid: false }
  }
}

export { SESSION_COOKIE_NAME }

