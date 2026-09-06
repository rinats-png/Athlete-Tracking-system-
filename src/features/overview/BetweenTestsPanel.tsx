import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import type { StoredObservation } from '@/lib/store/localStore'

/** So weit zurück zählt ein Eintrag als «zwischen den Tests». */
export const BETWEEN_WINDOW_DAYS = 14

/**
 * Zwischen den Testrunden.
 *
 * Diagnostik ist periodisch — zwei bis vier Runden im Jahr. Dazwischen
 * gibt es trotzdem einen Grund, die App zu öffnen: die Zahlen, die keine
 * Leistung sind, aber die nächste Messung lesbar machen. Ein Sprung bei
 * drei Kilo mehr Körpergewicht bedeutet etwas anderes; eine Woche mit
 * doppelter Belastung erklärt einen schlechten Testtag.
 *
 * Die Fläche zählt und verlinkt. Sie bewertet nichts — das tut die App bei
 * Beobachtungswerten grundsätzlich nicht (observations.ts).
 */
export function BetweenTestsPanel({
  observations,
  className,
  style,
  asOf = new Date(),
}: {
  observations: StoredObservation[]
  className?: string
  style?: React.CSSProperties
  asOf?: Date
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const cutoff = asOf.getTime() - BETWEEN_WINDOW_DAYS * 86_400_000
  const recent = observations.filter((o) => new Date(o.observedAt).getTime() >= cutoff)
  const latest = [...observations].sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null

  return (
    <Panel className={className} style={style} data-testid="between-panel">
      <PanelHeader title={t('between.title')} />
      <div className="px-4 py-3">
        <p className="readout text-[22px] tabular-nums">
          {t('between.recent', { count: recent.length })}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {latest ? t('between.last', { date: formatDate(latest.observedAt, locale) }) : t('between.none')}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">{t('between.why')}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/beobachtung">
            {t('between.add')}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </Button>
      </div>
    </Panel>
  )
}
