import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, UserPlus } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { axisLabel } from '@/data/profileAxes'
import { useLocale } from '@/features/shared/useLocale'
import { availabilitySignals, newcomerSignals, NEWCOMER_DAYS } from '@/domain/availability'
import { formatDate } from '@/lib/format'

/**
 * Zwei Signale neben der Athletenliste: wer fällt, wer neu ist.
 *
 * Beide sind Hinweise, keine Urteile. Das steht in jeder Fläche noch einmal,
 * damit es beim Lesen nicht verloren geht: ein fallender Bereitschaftswert
 * ist ein Anlass für ein Gespräch, kein Trainingsverbot (§82).
 */
export function CoachSignals() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { athletes, switchAthlete } = useAppData()
  const availability = useMemo(() => availabilitySignals(athletes), [athletes])
  const newcomers = useMemo(() => newcomerSignals(athletes), [athletes])
  const declining = availability.filter((s) => s.status === 'declining')
  const readable = availability.filter((s) => s.status !== 'insufficient')

  return (
    <div className="mb-4 grid gap-4 md:grid-cols-2">
      <Panel data-testid="availability-panel">
        <PanelHeader title={t('coachDash.signals.availability')} subtitle={t('coachDash.signals.availabilityIntro')} />
        {declining.length > 0 ? (
          <ul className="divide-y divide-line">
            {declining.map((s) => (
              <li key={s.athleteId} className="px-4 py-2.5" data-testid="availability-declining">
                <button type="button" onClick={() => switchAthlete(s.athleteId)} className="flex items-start gap-2 text-left text-[13px] leading-relaxed">
                  <TriangleAlert size={14} className="mt-1 shrink-0 text-warning" aria-hidden />
                  <span>
                    {t('coachDash.signals.declining', {
                      name: s.name || t('coach.unnamed'),
                      latest: s.latest,
                      baseline: s.baseline,
                      drop: s.drop,
                    })}
                    <span className="block text-[11px] text-ink-muted">{formatDate(s.latestOn, locale)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
            {readable.length > 0 ? t('coachDash.signals.steady') : t('coachDash.signals.insufficient')}
          </p>
        )}
      </Panel>

      <Panel data-testid="newcomer-panel">
        <PanelHeader title={t('coachDash.signals.newcomers')} subtitle={t('coachDash.signals.newcomersIntro')} />
        {newcomers.length === 0 ? (
          <p className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
            {t('coachDash.signals.noNewcomers', { days: NEWCOMER_DAYS })}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {newcomers.map((n) => (
              <li key={n.athleteId} className="px-4 py-2.5" data-testid="newcomer-row">
                <button type="button" onClick={() => switchAthlete(n.athleteId)} className="flex items-start gap-2 text-left">
                  <UserPlus size={14} className="mt-1 shrink-0 text-accent-text" aria-hidden />
                  <span className="text-[13px] leading-relaxed">
                    <span className="font-medium">{n.name || t('coach.unnamed')}</span>
                    <span className="block text-[12px] text-ink-secondary">
                      {t('coachDash.signals.newcomer', { days: n.daysSinceFirst, results: n.results, covered: n.axesCovered, total: n.axesTotal })}
                    </span>
                    {n.leverAxisId && (
                      <span className="block text-[12px] text-ink-secondary">
                        {t('coachDash.signals.lever', { axis: axisLabel(n.leverAxisId, t, locale) })}
                      </span>
                    )}
                    {n.limiterAxisId && (
                      <span className="block text-[12px] text-ink-secondary">
                        {t('coachDash.signals.limiter', { axis: axisLabel(n.limiterAxisId, t, locale) })}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
