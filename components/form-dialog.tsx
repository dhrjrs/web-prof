'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { submitFormApiAction } from '@/lib/api-client'
import type { ActionResult } from '@/lib/validation'

type Props = {
  title: string
  description?: string
  trigger: ReactNode
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'secondary'
  triggerSize?: 'default' | 'sm' | 'xs'
  submitLabel?: string
  endpoint: string
  method?: 'POST' | 'PUT' | 'PATCH'
  children: ReactNode
}

export function FormDialog({
  title,
  description,
  trigger,
  triggerVariant = 'default',
  triggerSize = 'sm',
  submitLabel = 'Simpan',
  endpoint,
  method = 'POST',
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, fd) => {
      const result = await submitFormApiAction(endpoint, method, fd)
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
        router.refresh()
      }
      return result
    },
    {},
  )

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <form action={formAction} className="flex flex-col gap-4">
            {children}
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? 'Menyimpan...' : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
