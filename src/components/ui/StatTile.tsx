import { cn } from '@/lib/utils'

/**
 * Kennzahl-Kachel. Der Messwert ist der Star: gross, in Mono-Ziffern, die
 * Einheit erkennbar kleiner daneben. Kein Diagramm — nach der Formheuristik
 * ist eine einzelne Zahl hier die richtige Darstellung.
 */
export function StatTile({
  label,
  value,
  unit,
  meta,
  emphasis = false,
  className,
}: {
  label: string
  value: string
  unit?: string
  meta?: React.ReactNode
  emphasis?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col justify-between gap-2 px-4 py-3', className)}>
      <span className="label-tag">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'readout leading-none',
            emphasis ? 'text-[34px] font-medium' : 'text-[24px]',
          )}
        >
          {value}
        </span>
        {unit && <span className="text-[13px] text-ink-muted">{unit}</span>}
      </div>
      {meta && <div className="text-[12px] text-ink-secondary">{meta}</div>}
    </div>
  )
}
