'use client'

import { usePathname } from 'next/navigation'
import { LogOut, ShieldCheck } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { AppNav } from '@/components/app-nav'
import { Button } from '@/components/ui/button'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <main className="flex min-h-dvh w-full items-center justify-center bg-muted/20">{children}</main>
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="flex flex-col justify-between gap-4 border-b p-3 md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-r md:border-b-0 md:p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center px-2">
            <img src="/logo.png" alt="PROF Air Murni" className="h-10 w-auto object-contain" />
          </div>
          <AppNav />
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="size-4 text-primary" />
              <span>Admin</span>
            </div>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-3.5 mr-1" />
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-8">{children}</main>
    </div>
  )
}

