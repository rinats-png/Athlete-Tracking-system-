import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import type { ConfidenceScore } from '@/domain/analytics'

/**
 * Belastbarkeit des Profils.
 *
 * Bewusst kein Diagramm: vier Anteile mit einer Gesamtzahl sind eine
 * Aufstellung, keine Verteilung. Und bewusst mit offengelegten Bestandteilen —
 * eine Vertrauenszahl, die man nicht nachrechnen kann, verdient kein
 * Vertrauen.
 */
export function ConfidencePanel({ confidence }: { confidence: ConfidenceScore }) {
  const { t } = useTranslation()

  return (
    <Panel>
      <PanelHeader title={t('analysis.confidence')} subtitle={t('analysis.confidenceHint')} />
      <div className="px-4 py-4">
        <div className="flex items-baseline gap-2">
          <span className="readout font-display text-[40px] leading-none font-bold tabular-nums">
            {confidence.score}
          </span>
          <span className="text-[13px] text-ink-muted">/ 100</span>
        </div>

        <ul className="mt-4 space-y-3">
          {confidence.components.map((component) => (
            <li key={component.key}>
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span>{t(`analysis.component.${component.key}`)}</span>
                <span className="readout shrink-0 tabular-nums text-ink-secondary">
                  {t(`analysis.detail.${component.key}`, component.detail)}
                </span>
              </div>
              {/* Der Balken ist die Kennzeichnung des Anteils, die Zahl daneben
                  der Beleg. Ohne den Beleg wäre der Balken eine Behauptung. */}
              <div
                role="meter"
                aria-valuenow={Math.round(component.value * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t(`analysis.component.${component.key}`)}
                className="mt-1.5 h-1 w-full bg-line"
              >
                <div
                  className="h-full bg-series-1"
                  style={{ width: `${Math.round(component.value * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
          {t('analysis.confidenceFormula')}
        </p>
      </div>
    </Panel>
  )
}
