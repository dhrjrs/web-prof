'use client'

import { useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/lib/validation'

type Props = {
  action: (fd: FormData) => Promise<ActionResult>
  fields: Record<string, string | number>
  children: ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive'
  size?: 'default' | 'sm' | 'xs' | 'icon-sm'
  confirm?: string
  label?: string
}

export function ActionButton({
  action,
  fields,
  children,
  variant = 'default',
  size = 'sm',
  confirm,
  label,
}: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (confirm && !window.confirm(confirm)) return
    const fd = new FormData()
    for (const [key, value] of Object.entries(fields)) fd.set(key, String(value))
    startTransition(async () => {
      const result = await action(fd)
      if (result.ok) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={pending} aria-label={label}>
      {children}
    </Button>
  )
}
