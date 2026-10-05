import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, LockOpen } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { radarProfile } from '@/lib/scoring'
import { requirementGap } from '@/domain/requirementGap'
import { dataConfidence } from '@/domain/performanceView'
import { assessmentGate, GATE_MAX_AGE_DAYS, type GateLevel } from '@/domain/planGate'
import { familyOfDiscipline } from '@/domain/trainingPlan'
import { planMode } from '@/domain/planMode'
import { disciplineById } from '@/data/sportProfiles'
import { pick } from '@/i18n/pick'
import { useLocale } from '@/features/shared/useLocale'
import { cn } from '@/lib/utils'

/**
 * Bewertungstor und Leistungsprofil vor dem Planvorschlag (Trainingsbereich Etappe 6).
 * Drei Stufen: Erklären, Analysieren, Verordnen. Die Abdeckung steht als Anzahl.
 */
const LEVELS: GateLevel[] = ['EXPLAIN', 'ANALYZE', 'PRESCRIBE']
const order: Record<GateLevel, number> = { EXPLAIN: 0, ANALYZE: 1, PRESCRIBE: 2 }

export function PlanGateScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const mode = planMode(import.meta.env?.VITE_TRAINING_PLAN)
  const profile = data.profile
  const discipline = disciplineById(profile.disciplineId)
  const supported = familyOfDiscipline(profile.disciplineId) != null

  const gate = useMemo(() => {
    const asOf = new Date()
    const axes = radarProfile(data.results, 'population', asOf, profile.disciplineId)
    return assessmentGate(requirementGap(axes, profile.disciplineId), axes, dataConfidence(data.results, asOf).level, asOf)
  }, [data.results, profile.disciplineId])

  if (mode === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!discipline || !supported) return <EmptyState title={t('gate.title')} body={discipline ? t('plan.unsupported') : t('plan.noDiscipline')} />

  return (
    <div data-testid="plan-gate">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('gate.title')} intro={t('gate.intro', { discipline: pick(discipline.name, locale) ?? '' })} />

      <Panel className="mb-4" data-testid="gate-levels">
        <ul>
          {LEVELS.map((l) => {
            const reached = order[gate.level] >= order[l]
            const Icon = reached ? LockOpen : Lock
            return (
              <li key={l} data-testid={`gate-level-${l}`} data-reached={reached} className={cn('flex gap-3 border-t border-line px-4 py-3 first:border-t-0', !reached && 'opacity-70')}>
                <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="font-display text-[15px] font-bold">{t(`gate.level.${l}.name`)}<span className="ml-2 text-[12px] font-normal text-ink-secondary">{t(reached ? 'gate.reached' : 'gate.locked')}</span></p>
                  <p className="text-[13px] text-ink-secondary">{t(`gate.level.${l}.body`)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel className="mb-4" data-testid="gate-profile">
        <PanelHeader title={t('gate.profile')} subtitle={t('gate.coverage', { ok: gate.requiredOk, total: gate.requiredTotal })} />
        <p className="px-4 pb-2 text-[13px] text-ink-secondary" data-testid="gate-overall">{t('gate.reliability', { level: t(`performance.level.${gate.overall}`) })}</p>
        <ul>
          {gate.rows.map((r) => (
            <li key={r.axisId} data-testid={`gate-row-${r.dimension}`} data-status={r.status} className="flex items-start justify-between gap-3 border-t border-line px-4 py-3">
              <div>
                <p className="font-display text-[14px] font-bold">{t(`dimensions.${r.dimension}`)}</p>
                <p className="text-[12px] text-ink-secondary">
                  {t(r.required ? 'gate.required' : 'gate.recommended')} · {t(`gate.status.${r.status}`, { n: r.measurements, days: r.ageDays ?? 0, max: GATE_MAX_AGE_DAYS })}
                </p>
              </div>
              <span className="inline-flex min-h-6 shrink-0 items-center rounded-pill border border-line px-2.5 text-[11px]">{t(`performance.level.${r.confidence}`)}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('gate.note', { max: GATE_MAX_AGE_DAYS })}</p>
      </Panel>

      <Panel data-testid="gate-action">
        <div className="space-y-3 px-4 py-4">
          {gate.open ? (
            <>
              <p className="text-[14px]">{t('gate.open')}</p>
              <Link to="/plan/neu" data-testid="gate-compute" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('gate.compute')}</Link>
            </>
          ) : (
            <>
              <p className="text-[14px]" data-testid="gate-closed">{t('gate.closed')}</p>
              <ul className="list-disc pl-5 text-[14px]">
                {gate.missing.map((m) => <li key={m.axisId} data-testid={`gate-missing-${m.dimension}`}>{t(`dimensions.${m.dimension}`)}</li>)}
                {gate.missing.length === 0 && <li>{t('gate.reliabilityMissing')}</li>}
              </ul>
              <Link to="/diagnostik" data-testid="gate-plan-tests" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('gate.planTests')}</Link>
              {mode === 'preview' && <p><Link to="/plan/neu" data-testid="gate-preview" className="inline-flex min-h-11 items-center text-[12px] text-ink-muted underline underline-offset-2">{t('gate.preview')}</Link></p>}
            </>
          )}
        </div>
      </Panel>
    </div>
  )
}
