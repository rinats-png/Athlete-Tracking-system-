import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleHelp,
  Gauge,
  Info,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Flag, FlagKind } from '@/domain/flags'

/**
 * Markierungen zu einem Ergebnis (§72).
 *
 * Symbol UND Text, nie Farbe allein. Und durchgehend neutral formuliert:
 * eine Verschlechterung bekommt dieselbe sachliche Behandlung wie eine
 * Bestleistung, weil ein Athlet, der nach einer Krankheit misst, keine
 * Ermahnung braucht, sondern eine Zahl.
 */

const ICONS: Record<FlagKind, typeof Info> = {
  personal_best: Trophy,
  significant_improvement: ArrowUp,
  significant_regression: ArrowDown,
  insufficient_data: CircleHelp,
  submaximal_effort: Gauge,
  missing_context: Info,
  outlier: CircleAlert,
  efficiency_gain: ArrowUp,
}

const TONE: Partial<Record<FlagKind, string>> = {
  personal_best: 'text-accent-text',
  significant_improvement: 'text-accent-text',
  efficiency_gain: 'text-accent-text',
  significant_regression: 'text-critical',
  outlier: 'text-warning',
  submaximal_effort: 'text-warning',
}

export function FlagList({ flags, className }: { flags: Flag[]; className?: string }) {
  const { t } = useTranslation()
  if (flags.length === 0) return null

  return (
    <ul className={cn('flex flex-wrap gap-x-3 gap-y-1', className)}>
      {flags.map((flag) => {
        const Icon = ICONS[flag.kind]
        const key =
          flag.kind === 'personal_best' && flag.values.previous != null
            ? 'flags.personal_best_change'
            : `flags.${flag.kind}`
        return (
          <li
            key={flag.kind}
            className={cn('flex items-center gap-1 text-[12px]', TONE[flag.kind] ?? 'text-ink-secondary')}
          >
            <Icon size={12} strokeWidth={2.2} aria-hidden />
            {t(key, flag.values)}
          </li>
        )
      })}
    </ul>
  )
}
