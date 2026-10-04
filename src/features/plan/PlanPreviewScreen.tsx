import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { radarProfile } from '@/lib/scoring'
import { requirementGap } from '@/domain/requirementGap'
import { blockText } from '@/features/plan/planText'
import { DayChips } from '@/features/plan/DayChips'
import type { StoredPlannedSession } from '@/lib/store/localStore'
import { familyOfDiscipline, HIGH_INTENSITY_BUDGET, planBlock } from '@/domain/trainingPlan'
import { planMode } from '@/domain/trainingRules'
import { adoptBlock } from '@/domain/trainingBlock'
import { newId } from '@/lib/store/localStore'
import { TRAINING_RULES, TRAINING_SOURCES } from '@/data/trainingRules'
import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { pick } from '@/i18n/pick'
import type { Phase } from '@/domain/trainingTypes'
import type { PerformanceDimension } from '@/types/domain'

/**
 * Trainingsplan, Vorschau (docs/training-engine.md). Nur mit Bau-Schalter.
 *
 * Der Plan ist ein Vorschlag aus hinterlegten Regeln; jede Einheit zeigt
 * Regel, Evidenzstärke, Spezifität, Quellen und Prüfstatus. Ungeprüfte Regeln
 * sind sichtbar als ungeprüft gekennzeichnet. Der Trainer hat das letzte Wort.
 */
const PHASES: Phase[] = ['GPP', 'BUILD', 'SPECIFIC']

export const trainingPlanMode = () => planMode(import.meta.env?.VITE_TRAINING_PLAN)

export function PlanPreviewScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, saveTrainingBlock, trainingBlocks } = useAppData()
  const navigate = useNavigate()
  const mode = trainingPlanMode()
  const profile = data.profile
  const family = familyOfDiscipline(profile.disciplineId)
  const [params] = useSearchParams()
  const wanted = params.get('phase')
  const [phase, setPhase] = useState<Phase>(PHASES.includes(wanted as Phase) ? (wanted as Phase) : 'BUILD')
  const [available, setAvailable] = useState<number[]>([1, 2, 3, 4, 6])
  const [hard, setHard] = useState<number[]>([])

  const axes = useMemo(() => radarProfile(data.results, 'population', new Date(), profile.disciplineId), [data.results, profile.disciplineId])
  const gap = useMemo(() => requirementGap(axes, profile.disciplineId), [axes, profile.disciplineId])
  const plan = useMemo(
    () =>
      family
        ? planBlock({
            family,
            disciplineId: profile.disciplineId,
            phase,
            trainingAgeYears: profile.trainingAgeYears,
            availableDays: available,
            fixedSessions: hard.map((day) => ({ day, kind: 'hard_rounds' as const })),
            maxSessionMinutes: null,
            gaps: gap.ranked,
            hrMaxPlausible: profile.maxHr != null,
            mode,
          })
        : null,
    [family, phase, profile.trainingAgeYears, profile.maxHr, available, hard, gap, mode],
  )

  if (mode === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  const discipline = disciplineById(profile.disciplineId)
  if (!family || !plan) return <EmptyState title={t('plan.title')} body={discipline ? t('plan.unsupported') : t('plan.noDiscipline')} />

  const testName = (slug: string) => pick(getTest(slug)?.name, locale) ?? slug
  return (
    <div data-testid="plan-preview">
      <ScreenHeader eyebrow={t('plan.eyebrow')} title={t('plan.title')} intro={t('plan.intro')} />
      {mode === 'preview' && (
        <p className="mb-4 rounded-md border border-line bg-accent-quiet px-3 py-2 text-[13px]" data-testid="plan-preview-banner">
          {t('plan.preview')}
        </p>
      )}

      <Panel className="mb-4" data-testid="plan-inputs">
        <PanelHeader title={pick(discipline?.name, locale) ?? ''} />
        <div className="space-y-4 px-4 pb-4">
          <label className="block text-[13px]">
            <span className="label-tag">{t('plan.phase.label')}</span>
            <select data-testid="plan-phase" value={phase} onChange={(e) => setPhase(e.target.value as Phase)} className="mt-1.5 block min-h-11 rounded-md border border-line bg-surface px-3 text-[16px]">
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {t(`plan.phase.${p}`)}
                </option>
              ))}
            </select>
          </label>
          <DayChips label={t('plan.days.available')} value={available} onChange={setAvailable} testId="plan-available" />
          <DayChips label={t('plan.days.hard')} value={hard} onChange={setHard} testId="plan-hard" />
          <p className="text-[12px] text-ink-secondary">{profile.maxHr != null ? t('plan.hr.known') : t('plan.hr.unknown')}</p>
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="plan-sessions">
        <PanelHeader title={t('plan.sessions.title')} subtitle={t('plan.budget', { used: plan.highIntensityUsed, max: HIGH_INTENSITY_BUDGET })} />
        {plan.sessions.length === 0 ? (
          <p className="px-4 pb-4 text-[14px] text-ink-secondary" data-testid="plan-none">
            {t('plan.sessions.none')}
          </p>
        ) : (
          <ul>
            {plan.sessions.map((s) => {
              const rule = TRAINING_RULES.find((r) => r.id === s.ruleId)!
              return (
                <li key={s.id} className="border-t border-line px-4 py-3 first:border-t-0" data-testid={`plan-session-${s.day}`}>
                  <p className="font-display text-[15px] font-bold">
                    {t('plan.session.line', { day: t(`plan.day.${s.day}`), intent: t(`plan.intent.${s.primaryIntent}`) })}
                  </p>
                  <p className="text-[12px] text-ink-secondary">{t(`plan.rules.${rule.id}.title`)}</p>
                  {s.blocks.map((b, i) => (
                    <p key={i} className="mt-1 text-[14px]">
                      {blockText(b as StoredPlannedSession['blocks'][number], t)}
                    </p>
                  ))}
                  {s.plannedDurationMin != null && <p className="text-[12px] text-ink-muted">{t('plan.session.minutes', { count: s.plannedDurationMin })}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[t('plan.evidence.strength', { level: t(`plan.strength.${s.evidenceStrength}`) }), t('plan.evidence.specificity', { level: t(`plan.specificity.${s.evidenceSpecificity}`) }), rule.review.state === 'reviewed' ? t('plan.review.reviewed', { name: rule.review.reviewer, date: rule.review.reviewedOn }) : t('plan.review.unreviewed')].map((b) => (
                      <span key={b} className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-ink-secondary">
                        {b}
                      </span>
                    ))}
                  </div>
                  <details className="mt-2 text-[12px] text-ink-secondary">
                    <summary className="min-h-11 cursor-pointer py-2" data-testid="plan-evidence-open">
                      {t('plan.evidence.open')}
                    </summary>
                    <p className="font-medium">{t('plan.limits')}</p>
                    <ul className="list-disc pl-5">
                      {rule.evidence.limitations.map((_, i) => (
                        <li key={i}>{t(`plan.rules.${rule.id}.limit${i}`)}</li>
                      ))}
                    </ul>
                    <p className="mt-2 font-medium">{t('plan.sources')}</p>
                    <ul className="list-disc pl-5">
                      {rule.evidence.sourceIds.map((id) => {
                        const src = TRAINING_SOURCES[id]
                        return <li key={id}>{src.url ? <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{src.citation}</a> : src.citation}</li>
                      })}
                    </ul>
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {plan.notes.length > 0 && (
        <Panel className="mb-4" data-testid="plan-notes">
          <PanelHeader title={t('plan.hint.title')} />
          <ul className="px-4 pb-4 text-[14px]">
            {plan.notes.map((n) => (
              <li key={n.key} className="border-t border-line py-2 first:border-t-0">
                <p>{t(n.key === 'concurrent' ? 'plan.hint.concurrent' : n.key === 'combat_scope' ? 'plan.hint.combatScope' : 'plan.hint.noStationDose')}</p>
                <ul className="mt-1 list-disc pl-5 text-[11px] text-ink-muted">
                  {n.sourceIds.map((id) => {
                    const src = TRAINING_SOURCES[id]
                    return <li key={id}>{src.url ? <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{src.citation}</a> : src.citation}</li>
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {plan.skipped.length > 0 && (
        <Panel className="mb-4" data-testid="plan-skipped">
          <PanelHeader title={t('plan.skipped.title')} />
          <ul className="px-4 pb-4 text-[14px]">
            {plan.skipped.map((s) => (
              <li key={s.dimension} className="border-t border-line py-2 first:border-t-0">
                <span className="font-medium">{t(`dimensions.${s.dimension as PerformanceDimension}`)}</span>: {t(`plan.skip.${s.reason}`)}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="mb-4" data-testid="plan-adopt">
        <div className="space-y-2 px-4 py-4">
          <button
            type="button"
            data-testid="plan-adopt-button"
            disabled={plan.sessions.length === 0}
            onClick={() => {
              const now = new Date().toISOString()
              saveTrainingBlock(adoptBlock(plan, { id: newId(), family, disciplineId: profile.disciplineId, phase, startDay: now.slice(0, 10), now }))
              navigate('/plan/block')
            }}
            className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink disabled:opacity-45"
          >
            {t('plan.adopt.button')}
          </button>
          <p className="text-[12px] text-ink-secondary">{t('plan.adopt.hint')}</p>
          {trainingBlocks.some((b) => b.status === 'active') && (
            <button type="button" onClick={() => navigate('/plan/block')} className="min-h-11 text-[13px] text-accent-text underline underline-offset-2" data-testid="plan-to-block">
              {t('plan.adopt.toBlock')}
            </button>
          )}
        </div>
      </Panel>

      <Panel data-testid="plan-retest">
        <PanelHeader title={t('plan.retest.title')} />
        <p className="px-4 pb-3 text-[14px]">{plan.retest.metrics.length > 0 ? t('plan.retest.text', { week: plan.retest.week, tests: plan.retest.metrics.map(testName).join(', ') }) : t('plan.retest.none')}</p>
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('plan.note')}</p>
      </Panel>
    </div>
  )
}
