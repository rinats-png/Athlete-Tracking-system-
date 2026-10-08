import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { adoptGate, materializePlan, nextMonday } from '@/domain/library'
import type { MethodRule } from '@/domain/libraryTypes'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'
import { SEED_TEST_TO_SLUG } from '@/data/library/testMap'
import { useLibrary, usePlanWeeks } from './useLibrary'
import { GermanOnlyNote, UnreviewedBanner } from './bits'

const field = 'mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]'

const bounds = (r: MethodRule) =>
  Object.entries(r.dose_bounds)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v[0] === v[1] ? v[0] : `${v[0]}–${v[1]}`) : v}`)
    .join(' · ')

/**
 * Plandetail eines Bibliotheksplans: Ziel, Voraussetzungen, Blöcke, Woche
 * für Woche, Retest mit Messfehler-Hinweis, und die Regelkette dahinter
 * (Methodenregeln mit Grenzen, Evidenz, Quellen, Prüfstatus). Übernehmen legt
 * einen Block mit Planversion 1 an; Coach-Pläne übernimmt nur ein Trainer.
 */
export function ProgramDetailScreen() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role, data, saveTrainingBlock, trainingBlocks } = useAppData()
  const hasActive = trainingBlocks.some((b) => b.status === 'active')
  const { index, exercises } = useLibrary()
  const weeks = usePlanWeeks(id)
  const plan = index?.plans.find((p) => p.plan_id === id) ?? null
  const [week, setWeek] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [startDay, setStartDay] = useState(nextMonday(today))
  const rules = useMemo(() => (plan && index ? plan.method_rule_ids.map((r) => index.methodRules.find((x) => x.rule_id === r)).filter((r): r is MethodRule => !!r) : []), [plan, index])
  const names = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e.name])), [exercises])

  if (!index || weeks === undefined || !exercises) return <p className="text-[14px] text-ink-secondary" data-testid="lib-loading">{t('lib.loading')}</p>
  if (!plan || !weeks) return <EmptyState title={t('lib.notFound')} body={t('lib.notFoundBody')} />

  const gate = adoptGate(plan, role)
  const tests = plan.retest.test_ids.map((tid) => index.tests.find((x) => x.test_id === tid)).filter((x): x is NonNullable<typeof x> => !!x)
  const current = weeks.find((w) => w.week === week) ?? weeks[0]
  const canAdopt = !hasActive && (gate === 'open' || (gate === 'confirm' && confirmed))

  const adopt = () => {
    const block = materializePlan(plan, weeks, index, exercises, { id: newId(), startDay: nextMonday(startDay), now: new Date().toISOString(), disciplineId: data.profile.disciplineId ?? null })
    saveTrainingBlock(block)
    navigate('/plan/block')
  }

  return (
    <div data-testid="program-detail">
      <ScreenHeader eyebrow={t(`prog.goals.${plan.goal}`)} title={plan.title} intro={t('prog.meta', { weeks: plan.weeks, days: plan.sessions_per_week, sessions: plan.sessionCount })} />
      <UnreviewedBanner />
      <GermanOnlyNote />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel data-testid="prog-about">
          <PanelHeader title={t('prog.about')} />
          <div className="space-y-2 px-4 pb-4 text-[14px]">
            <p><span className="label-tag">{t('prog.level')}</span><br />{plan.level}</p>
            <p><span className="label-tag">{t('prog.prerequisites')}</span><br />{plan.prerequisites}</p>
            <p><span className="label-tag">{t('lib.equipment')}</span><br />{plan.equipment_required.join(', ')}</p>
            <p><span className="label-tag">{t('prog.autonomy')}</span><br />{t(`prog.autonomyLevel.${plan.autonomy}`)}{plan.autonomy_reason ? ` — ${plan.autonomy_reason}` : ''}</p>
            {plan.fuel_note && <p><span className="label-tag">{t('prog.fuel')}</span><br />{plan.fuel_note}</p>}
          </div>
        </Panel>

        <Panel data-testid="prog-blocks">
          <PanelHeader title={t('prog.blocks')} />
          <div className="px-4 pb-4">
            <div className="mb-3 flex gap-1" aria-hidden>
              {weeks.map((w) => <i key={w.week} className={cn('h-2 flex-1 rounded-pill', w.reduced ? 'bg-line' : 'bg-accent')} />)}
            </div>
            <ul className="space-y-2 text-[14px]">
              {plan.blocks.map((b) => (
                <li key={b.name + b.weeks[0]}><span className="font-semibold">{b.name}</span> <span className="text-ink-secondary">({t('prog.weeksRange', { from: b.weeks[0], to: b.weeks[b.weeks.length - 1] })})</span><br /><span className="text-[13px] text-ink-secondary">{b.focus}</span></li>
              ))}
            </ul>
            <p className="mt-3 label-tag">{t('prog.progression')}</p>
            <ul className="list-disc pl-5 text-[13px] text-ink-secondary">{plan.progression_rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" data-testid="prog-weeks">
        <PanelHeader title={t('prog.weekView')} />
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t('prog.weekView')}>
            {weeks.map((w) => (
              <button key={w.week} type="button" aria-pressed={week === w.week} onClick={() => setWeek(w.week)} data-testid={`prog-week-${w.week}`} className={cn('min-h-11 min-w-11 rounded-md border px-2 text-[13px]', week === w.week ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line', w.reduced && 'border-dashed')}>
                {w.week}
              </button>
            ))}
          </div>
          {current.reduced && <p className="mb-2 text-[12px] text-ink-secondary" data-testid="prog-reduced">{t('prog.reducedWeek')}</p>}
          <div className="space-y-3">
            {current.sessions.map((s, i) => (
              <div key={i} className="rounded-md border border-line px-3 py-2" data-testid={`prog-session-${i}`}>
                <p className="text-[14px] font-semibold">{t(`prog.day.${s.day}`)} · {s.name}</p>
                <ul className="mt-1 space-y-1 text-[13px]">
                  {s.items.map((it, j) =>
                    it.kind === 'exercise' ? (
                      <li key={j} className="flex flex-wrap gap-x-2">
                        <Link to={`/plan/uebungen/${it.exercise_id}`} className="text-accent-text underline underline-offset-2">{names.get(it.exercise_id) ?? it.exercise_id}</Link>
                        <span className="text-ink-secondary">{[it.sets != null && it.reps ? `${it.sets} × ${it.reps}` : it.reps, it.intensity, it.rpe != null ? `RPE ${it.rpe}` : null, it.rest_s != null ? t('lib.restS', { s: it.rest_s }) : null].filter(Boolean).join(' · ')}</span>
                      </li>
                    ) : (
                      <li key={j} className="text-ink-secondary">{[it.description, it.duration_min != null ? t('lib.minutes', { n: it.duration_min }) : null, it.distance, it.zone].filter(Boolean).join(' · ')}</li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4" data-testid="prog-retest">
        <PanelHeader title={t('prog.retest')} />
        <div className="space-y-2 px-4 pb-4 text-[14px]">
          <p className="text-ink-secondary">{plan.retest.timing} · {plan.retest.decision_rule}</p>
          {tests.map((x) => (
            <div key={x.test_id} className="rounded-md bg-surface-sunken px-3 py-2">
              <p className="font-semibold">{SEED_TEST_TO_SLUG[x.test_id] ? <Link to={`/tests/${SEED_TEST_TO_SLUG[x.test_id]}/details`} className="text-accent-text underline underline-offset-2" data-testid={`prog-test-${x.test_id}`}>{x.name}</Link> : x.name}</p>
              <p className="text-[13px] text-ink-secondary">{x.protocol}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{t('prog.errorNote')} {x.measurement_error_note}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4" data-testid="prog-rules">
        <PanelHeader title={t('prog.rules')} />
        <div className="px-4 pb-4">
          <p className="mb-2 text-[12px] text-ink-secondary">{t('prog.rulesNote')}</p>
          <ul className="space-y-3">
            {rules.map((r) => (
              <li key={r.rule_id} className="rounded-md border border-line px-3 py-2 text-[13px]" data-testid={`prog-rule-${r.rule_id}`}>
                <p className="font-semibold">{r.name} <span className="font-normal text-ink-muted">({r.rule_id})</span></p>
                <p className="text-ink-secondary">{bounds(r)}</p>
                <p className="text-ink-secondary">{t('prog.cutoff')}: {r.quality_cutoff}</p>
                <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-pill border border-line px-2 py-0.5">{t('plan.evidence.specificity', { level: t(`plan.specificity.${r.evidence_default}`) })}</span>
                  <span className="rounded-pill border border-warning px-2 py-0.5 text-warning">{t('plan.review.unreviewed')}</span>
                  {!r.evidence_refs?.length && <span className="rounded-pill border border-line px-2 py-0.5" data-testid={`prog-rule-nosource-${r.rule_id}`}>{t('prog.noSource')}</span>}
                </p>
                {r.evidence_refs?.map((ref) => (
                  <a key={ref.doi} href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-h-11 items-center gap-1 text-accent-text underline underline-offset-2">
                    {ref.cite}{!ref.fulltext_checked && ` (${t('prog.noFulltext')})`}<ExternalLink size={12} aria-hidden />
                  </a>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel float className="mt-4 border-accent" data-testid="prog-adopt">
        <PanelHeader title={t('prog.adopt')} />
        <div className="space-y-3 px-4 pb-4">
          {gate === 'coach_only' ? (
            <p className="text-[14px] text-ink-secondary" data-testid="prog-coach-only">{t('prog.coachOnly')}</p>
          ) : (
            <>
              <label className="block text-[13px]"><span className="label-tag">{t('prog.start')}</span><input type="date" value={startDay} min={today} onChange={(e) => setStartDay(e.target.value || today)} className={field} data-testid="prog-start" /></label>
              <p className="text-[12px] text-ink-secondary">{t('prog.startNote', { day: nextMonday(startDay) })}</p>
              {gate === 'confirm' && (
                <label className="flex min-h-11 items-start gap-3 text-[14px]">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 size-5" data-testid="prog-confirm" />
                  {t('prog.confirmCoach')}
                </label>
              )}
              {hasActive && <p className="text-[12px] text-ink-secondary" data-testid="prog-active">{t('lib.activeBlock')} <Link to="/plan/block" className="text-accent-text underline underline-offset-2">{t('plan.adopt.toBlock')}</Link></p>}
              <button type="button" disabled={!canAdopt} onClick={adopt} data-testid="prog-adopt-button" className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink disabled:opacity-50">{t('prog.adoptButton')}</button>
            </>
          )}
        </div>
      </Panel>
    </div>
  )
}

export default ProgramDetailScreen
