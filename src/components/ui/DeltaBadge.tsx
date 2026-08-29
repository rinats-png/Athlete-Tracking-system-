import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDelta } from '@/lib/format'
import type { AppLocale } from '@/types/domain'

/**
 * Veränderung gegenüber der Vormessung.
 *
 * Angezeigt wird die Veränderung der *Leistung*, nicht die der Rohzahl:
 * `invert` gilt für Tests, bei denen weniger besser ist (Zeitmessungen), und
 * dreht das Vorzeichen um. Eine um 6 % schnellere 2000-m-Zeit steht damit als
 * "+6,0 %" da — so, wie ein Athlet es auch sagen würde.
 *
 * Die Richtung trägt zusätzlich ein Icon; Farbe allein darf die Aussage nicht
 * transportieren.
 */
export function DeltaBadge({
  value,
  locale,
  invert = false,
  className,
}: {
  value: number | null
  locale: AppLocale
  invert?: boolean
  className?: string
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={cn('text-[12px] text-ink-muted', className)}>—</span>
  }

  const performanceDelta = invert ? -value : value
  const unchanged = Math.abs(performanceDelta) < 0.05
  const improved = performanceDelta > 0
  const Icon = unchanged ? Minus : improved ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        'readout inline-flex items-center gap-1 text-[12px]',
        unchanged ? 'text-ink-muted' : improved ? 'text-delta-up' : 'text-delta-down',
        className,
      )}
    >
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {formatDelta(performanceDelta, locale)}
    </span>
  )
}
