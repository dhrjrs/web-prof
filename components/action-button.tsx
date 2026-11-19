'use client'

import { useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { submitApiAction } from '@/lib/api-client'

type Props = {
  endpoint: string
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  fields: Record<string, string | number>
  children: ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive'
  size?: 'default' | 'sm' | 'xs' | 'icon-sm'
  confirm?: string
  label?: string
}

export function ActionButton({
  endpoint,
  method = 'DELETE',
  fields,
  children,
  variant = 'default',
  size = 'sm',
  confirm,
  label,
}: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (confirm && !window.confirm(confirm)) return
    startTransition(async () => {
      const result = await submitApiAction(endpoint, method, fields)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={pending} aria-label={label}>
      {children}
    </Button>
  )
}
