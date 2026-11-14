import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Droplets } from 'lucide-react'
import { Toaster } from 'sonner'
import { AppNav } from '@/components/app-nav'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'web-prof — Stok & Penjualan Toko',
  description: 'Kelola stok, penjualan, pelanggan, dan peminjaman galon toko Anda.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-dvh flex-col md:flex-row">
          <aside className="flex flex-col gap-4 border-b p-3 md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-r md:border-b-0 md:p-4">
            <div className="flex items-center gap-2 px-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Droplets className="size-4" aria-hidden="true" />
              </span>
              <span className="font-semibold tracking-tight">web-prof</span>
            </div>
            <AppNav />
          </aside>
          <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-8">{children}</main>
        </div>
        <Toaster position="bottom-right" theme="system" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
