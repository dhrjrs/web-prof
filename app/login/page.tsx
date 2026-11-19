'use client'

import { Suspense, useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Droplets, Lock, LogIn, User } from 'lucide-react'
import { toast } from 'sonner'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionResult } from '@/lib/validation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const res = await loginAction(prev, formData)
      if (res.ok) {
        toast.success(res.message || 'Login berhasil')
        router.push(from)
        router.refresh()
      } else if (res.error) {
        toast.error(res.error)
      }
      return res
    },
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username Admin</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            placeholder="admin"
            defaultValue="admin"
            required
            autoFocus
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Kata Sandi</Label>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            className="pl-9"
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          'Memproses...'
        ) : (
          <>
            <LogIn className="size-4" />
            Masuk sebagai Admin
          </>
        )}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Droplets className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">web-prof</h1>
          <p className="text-sm text-muted-foreground">
            Masuk untuk mengakses sistem stok dan penjualan toko
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Kredensial Default:</p>
            <p className="mt-0.5">Username: <code className="font-mono font-semibold">admin</code></p>
            <p>Password: <code className="font-mono font-semibold">admin123</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
