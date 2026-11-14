import { Badge } from '@/components/ui/badge'
import type { SaleStage } from '@/lib/db/schema'
import { stageLabels } from '@/lib/format'

const variants: Record<SaleStage, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  penawaran: 'outline',
  pesanan: 'secondary',
  dikirim: 'secondary',
  faktur: 'default',
  lunas: 'outline',
  batal: 'destructive',
}

export function StageBadge({ stage }: { stage: SaleStage }) {
  return (
    <Badge variant={variants[stage]} className={stage === 'lunas' ? 'border-primary text-primary' : undefined}>
      {stageLabels[stage]}
    </Badge>
  )
}
