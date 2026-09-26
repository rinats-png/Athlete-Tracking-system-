import { useTranslation } from 'react-i18next'
import { formatSleepDuration, readinessParts, readinessScore, type ReadinessPart } from '@/domain/readiness'
import type { ValidatedReadiness } from '@/lib/store/schema'
import { cn } from '@/lib/utils'

/**
 * Selbsteinschätzung als Komponenten, die Zusammenfassung darunter
 * (Master-Spezifikation D5).
 *
 * Jede Angabe steht einzeln mit Rohwert und Lage auf ihrer eigenen Skala.
 * Die 0–100-Zahl folgt klein und sagt, woraus sie besteht — «72 % aus 6
 * Angaben, gleich gewichtet» —, damit niemand sie für eine Messung hält.
 */
export function ReadinessBreakdown({
  readiness,
  className,
  dense = false,
}: {
  readiness: ValidatedReadiness | null
  className?: string
  /** Für Bericht und Druck: ohne Hintergrundflächen. */
  dense?: boolean
}) {
  const { t } = useTranslation()
  const parts = readinessParts(readiness)
  const score = readinessScore(readiness)
  if (parts.length === 0) return null

  return (
    <div className={className} data-testid="readiness-breakdown">
      <ul className="flex flex-wrap gap-1.5">
        {parts.map((p) => (
          <li
            key={p.key}
            data-part={p.key}
            data-lean={p.lean}
            className={cn(
              'rounded-pill border px-2 py-0.5 text-[12px]',
              dense
                ? 'border-line'
                : p.lean === 'unfavourable'
                  ? 'border-warning/60 bg-warning/10'
                  : p.lean === 'favourable'
                    ? 'border-line text-ink-secondary'
                    : 'border-line-strong',
            )}
          >
            {label(t, p)} <span className="readout tabular-nums">{value(p)}</span>
            <span className="sr-only"> — {t(`readiness.lean.${p.lean}`)}</span>
            {p.lean === 'unfavourable' && <span aria-hidden> · {t('readiness.lean.unfavourable')}</span>}
          </li>
        ))}
      </ul>
      {score.score != null && (
        <p className="mt-1.5 text-[12px] text-ink-muted">
          {t('readiness.summary')}: <span className="readout tabular-nums text-ink-secondary">{score.score} %</span>{' '}
          · {t('readiness.summaryBasis', { count: score.answered })}
        </p>
      )}
    </div>
  )
}

function label(t: (k: string) => string, p: ReadinessPart): string {
  return p.key === 'sleepMinutes' ? t('readiness.sleepDuration') : t(`readiness.${p.key}`)
}

function value(p: ReadinessPart): string {
  return p.key === 'sleepMinutes' ? `${formatSleepDuration(p.value)} h` : `${p.value}/10`
}
