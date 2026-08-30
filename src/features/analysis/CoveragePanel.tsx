import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import type { DimensionCoverage } from '@/domain/benchmark'

/**
 * Testabdeckung je Achse (§17).
 *
 * Der Zweck dieses Panels ist ein einziger Satz, den der Nutzer verstehen
 * soll: ein Gesamtwert von 82 bei 40 % Abdeckung ist weniger belastbar als
 * derselbe Wert bei 100 %. Deshalb steht neben jedem Balken die Zahl der
 * gemessenen Tests — der Balken allein wäre wieder nur ein Gefühl.
 */
export function CoveragePanel({ coverage }: { coverage: DimensionCoverage[] }) {
  const { t } = useTranslation()
  const overall = Math.round(
    coverage.reduce((sum, c) => sum + c.percent, 0) / Math.max(1, coverage.length),
  )

  return (
    <Panel>
      <PanelHeader
        title={t('coverage.title')}
        subtitle={t('coverage.overall', { percent: overall })}
      />
      <ul className="space-y-3 px-4 py-4">
        {coverage.map((entry) => (
          <li key={entry.dimension}>
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span>{t(`dimensions.${entry.dimension}`)}</span>
              <span className="readout shrink-0 tabular-nums text-ink-secondary">
                {entry.measured} / {entry.available} · {entry.percent} %
              </span>
            </div>
            <div
              role="meter"
              aria-valuenow={entry.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              // Ausdrücklich mit «Testabdeckung» benannt und nicht nur mit
              // «Abdeckung»: die Belastbarkeit hat eine gleichnamige
              // Komponente, und zwei Anzeigen mit demselben Namen sind für
              // Screenreader und Tastaturnutzer nicht unterscheidbar.
              aria-label={t('coverage.axisLabel', {
                axis: t(`dimensions.${entry.dimension}`),
              })}
              className="mt-1.5 h-1 w-full bg-line"
            >
              <div className="h-full bg-series-2" style={{ width: `${entry.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
        {t('coverage.explain')}
      </p>
    </Panel>
  )
}
