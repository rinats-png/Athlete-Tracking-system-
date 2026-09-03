import { useTranslation } from 'react-i18next'
import { useLocale } from '@/features/shared/useLocale'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Das Referenzspektrum: eine Achse, auf der Marken liegen — der eigene Wert
 * darunter hervorgehoben.
 *
 * WARUM KEIN FORTSCHRITTSBALKEN: ein Balken sagt «du bist zu 68 % fertig».
 * Ein Messwert ist aber nicht auf dem Weg zu einem Maximum, sondern liegt
 * zwischen benannten Gruppen. Die Achse zeigt genau das, und die Marken
 * tragen ihre Herkunft mit.
 *
 * DIE RICHTUNG DES TESTS ENTSCHEIDET DIE ACHSE. Bei einer Sprintzeit ist
 * weniger besser: dann steht der Elitewert LINKS und die Achse läuft nach
 * rechts zu den schwächeren Werten. Automatisch «höher = rechts»
 * anzunehmen, würde die Hälfte aller Tests spiegelverkehrt darstellen —
 * und niemand würde es merken, weil die Zahlen stimmen.
 */

export interface SpectrumMark {
  key: string
  label: string
  value: number
  /** Der eigene Wert wird stärker gezeichnet und beschriftet. */
  own?: boolean
}

export function ReferenceSpectrum({
  marks,
  direction,
  digits = 1,
  className,
}: {
  marks: SpectrumMark[]
  direction: 'higher_is_better' | 'lower_is_better'
  digits?: number
  className?: string
}) {
  const { t } = useTranslation()
  const locale = useLocale()

  const values = marks.map((m) => m.value).filter((v) => Number.isFinite(v))
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  // Ein Rand von 12 %, damit die äusserste Marke nicht auf der Kante klebt.
  const span = max - min || 1
  const lo = min - span * 0.12
  const hi = max + span * 0.12

  const position = (value: number) => {
    const raw = ((value - lo) / (hi - lo)) * 100
    // Bei «weniger ist besser» läuft die Achse andersherum: links steht das
    // bessere Ende, damit «weiter links» überall dasselbe bedeutet.
    return direction === 'lower_is_better' ? 100 - raw : raw
  }

  return (
    <div className={cn('relative', className)}>
      <p className="label-tag mb-6">
        {t(direction === 'lower_is_better' ? 'spectrum.lowerBetter' : 'spectrum.higherBetter')}
      </p>
      <div className="relative h-16">
        {/* Die Achse zeichnet sich von links: die Bewegung führt das Auge
            in die Leserichtung, bevor die Marken erscheinen. */}
        <span
          aria-hidden
          className="spectrum-axis absolute top-7 right-[2%] left-[2%] h-px origin-left"
          style={{ background: 'linear-gradient(90deg, var(--accent), var(--line-strong))' }}
        />
        {marks.map((mark, i) => (
          <span
            key={mark.key}
            className="spectrum-mark absolute top-0 -translate-x-1/2 text-center"
            style={{
              left: `${Math.max(2, Math.min(98, position(mark.value)))}%`,
              animationDelay: `${400 + i * 220}ms`,
            }}
          >
            <span
              className={cn(
                'block text-[8px] tracking-[0.14em] uppercase',
                mark.own ? 'font-bold text-ink' : 'text-ink-muted',
              )}
            >
              {mark.label}
            </span>
            <span
              aria-hidden
              className={cn(
                'mx-auto block w-px',
                mark.own
                  ? 'mt-3.5 h-5 bg-accent ring-3 ring-accent-quiet'
                  : 'mt-5 h-3 bg-line-strong',
              )}
            />
            <span
              className={cn(
                'readout mt-1 block',
                mark.own ? 'text-[11px] font-bold text-accent-text' : 'text-[10px] text-ink-secondary',
              )}
            >
              {formatNumber(mark.value, locale, digits)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
