import { useTranslation } from 'react-i18next'
import { DeltaBadge } from '@/components/ui/DeltaBadge'
import { formatNumber } from '@/lib/format'
import type { AppLocale, RadarAxis } from '@/types/domain'

/**
 * Die sechs Achsen als Balken.
 *
 * Ergänzt das Radar, ersetzt es nicht: das Radar zeigt die Gestalt des
 * Profils, der Balken den exakten Wert und die Veränderung. Alle Balken tragen
 * dieselbe Grösse, also eine Farbe — Kategorienfarben wären hier falsch, weil
 * die Achsen keine Datenreihen sind.
 */
export function DimensionBreakdown({
  current,
  previous,
  locale,
}: {
  current: RadarAxis[]
  previous?: RadarAxis[]
  locale: AppLocale
}) {
  const { t } = useTranslation()

  return (
    <ul className="divide-y divide-line">
      {current.map((axis) => {
        const before = previous?.find((item) => item.dimension === axis.dimension)
        const delta =
          axis.score != null && before?.score != null && before.score !== 0
            ? ((axis.score - before.score) / before.score) * 100
            : null

        return (
          <li key={axis.dimension} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[13px] font-semibold uppercase tracking-[0.08em]">
                {t(`dimensions.${axis.dimension}`)}
              </span>
              <div className="flex items-baseline gap-3">
                <span className="readout text-[15px]">
                  {axis.score == null ? '—' : formatNumber(axis.score, locale, 0)}
                </span>
                <DeltaBadge value={delta} locale={locale} className="w-[74px] justify-end" />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              {/* Balkenspur: 6 px hoch, eckig links (Nulllinie), rechts gerundet. */}
              <div className="relative h-1.5 flex-1 bg-surface-sunken">
                {before?.score != null && (
                  // Vormessung als Markierung, damit die Richtung ohne Zahl lesbar ist.
                  <span
                    aria-hidden
                    className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-reference"
                    style={{ left: `${Math.min(100, before.score)}%` }}
                  />
                )}
                {axis.score != null && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[3px] bg-series-1"
                    style={{ width: `${Math.min(100, axis.score)}%` }}
                  />
                )}
              </div>
              <span className="w-16 shrink-0 text-right text-[11px] text-ink-muted">
                {axis.hasData ? t('dashboard.testCount', { count: axis.testCount }) : '—'}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
