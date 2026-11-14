'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Boxes,
  Droplets,
  LayoutDashboard,
  ReceiptText,
  Settings,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/penjualan', label: 'Penjualan', icon: ReceiptText },
  { href: '/stok', label: 'Stok & Harga', icon: Boxes },
  { href: '/galon', label: 'Pinjam Galon', icon: Droplets },
  { href: '/pelanggan', label: 'Pelanggan', icon: Users },
  { href: '/tim', label: 'Tim Penjual', icon: UserRoundCheck },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export function AppNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Menu utama" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              active && 'bg-accent font-medium text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
