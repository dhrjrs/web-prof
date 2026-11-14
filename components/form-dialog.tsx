'use client'

import { useActionState, useState, type ReactNode } from 'react'
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
import type { ActionResult } from '@/lib/validation'

type Props = {
  title: string
  description?: string
  trigger: ReactNode
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'secondary'
  triggerSize?: 'default' | 'sm' | 'xs'
  submitLabel?: string
  action: (fd: FormData) => Promise<ActionResult>
  children: ReactNode
}

export function FormDialog({
  title,
  description,
  trigger,
  triggerVariant = 'default',
  triggerSize = 'sm',
  submitLabel = 'Simpan',
  action,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, fd) => {
      const result = await action(fd)
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
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
