import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type FieldProps = ComponentProps<typeof Input> & { label: string; name: string; hint?: string }

export function Field({ label, name, hint, id, className, ...props }: FieldProps) {
  const fieldId = id ?? `f-${name}`
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input id={fieldId} name={name} {...props} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function TextareaField({
  label,
  name,
  ...props
}: ComponentProps<typeof Textarea> & { label: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <Textarea id={`f-${name}`} name={name} rows={2} {...props} />
    </div>
  )
}

type Option = { value: string | number; label: string }

export function SelectField({
  label,
  name,
  options,
  placeholder,
  className,
  ...props
}: ComponentProps<'select'> & { label: string; name: string; options: Option[]; placeholder?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <NativeSelect id={`f-${name}`} name={name} {...props}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover',
        className,
      )}
      {...props}
    />
  )
}
