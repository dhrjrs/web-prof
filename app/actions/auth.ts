'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import type { ActionResult } from '@/lib/validation'

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const username = String(formData.get('username') || '').trim()
  const password = String(formData.get('password') || '').trim()
  const requestedPath = String(formData.get('redirectTo') || '/')
  const redirectTo = requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/'

  if (!username || !password) {
    return { ok: false, error: 'Username dan kata sandi wajib diisi' }
  }

  const [dbUsernameRow] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'admin_username'))

  const [dbPasswordRow] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'admin_password'))

  const expectedUser = dbUsernameRow?.value || process.env.ADMIN_USERNAME || 'admin'
  const expectedPass = dbPasswordRow?.value || process.env.ADMIN_PASSWORD || 'admin123'

  if (username !== expectedUser || password !== expectedPass) {
    return { ok: false, error: 'Username atau kata sandi salah' }
  }

  const token = await createSessionToken(username)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  redirect(redirectTo)
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect('/login')
}

export async function changeAdminPassword(fd: FormData): Promise<ActionResult> {
  const currentPassword = String(fd.get('currentPassword') || '').trim()
  const newPassword = String(fd.get('newPassword') || '').trim()
  const confirmPassword = String(fd.get('confirmPassword') || '').trim()

  if (!newPassword || newPassword.length < 5) {
    return { ok: false, error: 'Kata sandi baru minimal 5 karakter' }
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: 'Konfirmasi kata sandi baru tidak cocok' }
  }

  const [dbPasswordRow] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'admin_password'))

  const expectedPass = dbPasswordRow?.value || process.env.ADMIN_PASSWORD || 'admin123'
  if (currentPassword !== expectedPass) {
    return { ok: false, error: 'Kata sandi saat ini salah' }
  }

  await db
    .insert(settings)
    .values({ key: 'admin_password', value: newPassword })
    .onConflictDoUpdate({ target: settings.key, set: { value: newPassword } })

  return { ok: true, message: 'Kata sandi admin berhasil diubah' }
}
