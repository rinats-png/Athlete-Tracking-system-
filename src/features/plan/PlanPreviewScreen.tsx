import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { radarProfile } from '@/lib/scoring'
import { requirementGap } from '@/domain/requirementGap'
import { familyOfDiscipline, HIGH_INTENSITY_BUDGET, planBlock, type PlannedSession } from '@/domain/trainingPlan'
import { planMode } from '@/domain/trainingRules'
import { TRAINING_RULES, TRAINING_SOURCES } from '@/data/trainingRules'
import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'
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
const DAYS = [1, 2, 3, 4, 5, 6, 7]

export const trainingPlanMode = () => planMode(import.meta.env?.VITE_TRAINING_PLAN)

function DayChips({ label, value, onChange, testId }: { label: string; value: number[]; onChange: (v: number[]) => void; testId: string }) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={label} data-testid={testId}>
      <span className="label-tag">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {DAYS.map((d) => {
          const on = value.includes(d)
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              data-testid={`${testId}-${d}`}
              onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
              className={cn('min-h-11 min-w-11 rounded-pill border px-3 text-[13px]', on ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line hover:bg-surface-sunken')}
            >
              {t(`plan.day.${d}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PlanPreviewScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const mode = trainingPlanMode()
  const profile = data.profile
  const family = familyOfDiscipline(profile.disciplineId)
  const [phase, setPhase] = useState<Phase>('BUILD')
  const [available, setAvailable] = useState<number[]>([1, 2, 3, 4, 6])
  const [hard, setHard] = useState<number[]>([])

  const axes = useMemo(() => radarProfile(data.results, 'population', new Date(), profile.disciplineId), [data.results, profile.disciplineId])
  const gap = useMemo(() => requirementGap(axes, profile.disciplineId), [axes, profile.disciplineId])
  const plan = useMemo(
    () =>
      family
        ? planBlock({
            family,
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
  const blockText = (b: PlannedSession['blocks'][number]): string => {
    switch (b.type) {
      case 'interval':
        return t('plan.block.interval', { reps: b.repetitions, work: b.workSeconds / 60, rec: b.recoverySeconds / 60, min: b.intensity.type === 'hr_percent_max' ? b.intensity.min : 0, max: b.intensity.type === 'hr_percent_max' ? b.intensity.max : 0 })
      case 'sprint_repeats':
        return t('plan.block.sprint', { sets: b.sets, reps: b.repetitions, dist: b.distanceM, rec: b.maxRecoverySeconds })
      case 'strength': {
        const l = b.loadTarget
        const range = l.type === 'percent_1rm' ? { min: l.min, max: l.max } : { min: 0, max: 0 }
        return b.maxRepsPerSet != null ? t('plan.block.strengthMax', { ...range, reps: b.maxRepsPerSet }) : t('plan.block.strength', { ...range, sets: b.sets ?? 0 })
      }
      case 'jumps':
        return t('plan.block.jumps')
      default:
        return ''
    }
  }

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
                      {blockText(b)}
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

      <Panel data-testid="plan-retest">
        <PanelHeader title={t('plan.retest.title')} />
        <p className="px-4 pb-3 text-[14px]">{plan.retest.metrics.length > 0 ? t('plan.retest.text', { week: plan.retest.week, tests: plan.retest.metrics.map(testName).join(', ') }) : t('plan.retest.none')}</p>
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('plan.note')}</p>
      </Panel>
    </div>
  )
}
