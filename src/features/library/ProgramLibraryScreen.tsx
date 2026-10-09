import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { planMode } from '@/domain/planMode'
import { FIT_ORDER, GOAL_OF_FAMILY, planFit, type PlanFit } from '@/domain/library'
import { PLAN_TEMPLATES } from '@/data/planTemplates'
import { cn } from '@/lib/utils'
import { useLibrary } from './useLibrary'
import { FitTag, GermanOnlyNote, UnreviewedBanner, useMySport } from './bits'

/**
 * Fertige Pläne: alle an einem Ort — die 16 Pläne der Programmbibliothek und
 * die Vorlagen der Trainingsfamilien. Jeder Plan ist frei wählbar; klein
 * daneben steht, ob er zur eigenen Sportart passt (`planFit`). Passende
 * stehen oben. Regeln, Quellen und Prüfstatus liegen eine Ebene tiefer im
 * Plan, nicht auf der Liste.
 */
interface Item {
  key: string
  to: string
  title: string
  meta: string
  goal: string
  fit: PlanFit | null
}

export function ProgramLibraryScreen() {
  const { t } = useTranslation()
  const { index } = useLibrary()
  const { discipline, name: sport } = useMySport()
  const [goal, setGoal] = useState<string | null>(null)
  const [fitting, setFitting] = useState(false)

  const items = useMemo<Item[]>(() => {
    if (!index) return []
    const lib: Item[] = index.plans.map((p) => ({
      key: p.plan_id,
      to: `/plan/programme/${p.plan_id}`,
      title: p.title,
      meta: `${t('prog.metaShort', { weeks: p.weeks, days: p.sessions_per_week })} · ${p.level.startsWith('Einsteiger') ? t('prog.levels.beginner') : t('prog.levels.advanced')}`,
      goal: p.goal,
      fit: planFit(p.goal, discipline),
    }))
    const tpl: Item[] = PLAN_TEMPLATES.map((x) => ({
      key: `tpl-${x.id}`,
      to: `/plan/vorlagen/${x.id}`,
      title: t(`tpl.t.${x.id}.name`),
      meta: `${t('tpl.weeksTotal', { n: x.weeks })} · ${t(`plan.phase.${x.phase}`)}`,
      goal: GOAL_OF_FAMILY[x.family],
      fit: planFit(GOAL_OF_FAMILY[x.family], discipline),
    }))
    return [...lib, ...tpl].sort((a, b) => (a.fit && b.fit ? FIT_ORDER[a.fit] - FIT_ORDER[b.fit] : 0))
  }, [index, discipline, t])
  const goals = useMemo(() => [...new Set(items.map((i) => i.goal))], [items])

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!index) return <p className="text-[14px] text-ink-secondary" data-testid="lib-loading">{t('lib.loading')}</p>

  const shown = items.filter((i) => (!goal || i.goal === goal) && (!fitting || i.fit === 'match' || i.fit === 'supports'))
  const chip = (active: boolean) => cn('min-h-10 shrink-0 rounded-pill border px-4 text-[13px]', active ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')

  return (
    <div data-testid="program-library">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('prog.title')} />
      <UnreviewedBanner />
      <GermanOnlyNote />
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t('prog.goal')}>
        <button type="button" aria-pressed={goal == null && !fitting} onClick={() => { setGoal(null); setFitting(false) }} className={chip(goal == null && !fitting)} data-testid="prog-goal-all">{t('tpl.goal.all')}</button>
        {discipline && <button type="button" aria-pressed={fitting} onClick={() => setFitting(!fitting)} className={chip(fitting)} data-testid="prog-fitting">{t('fit.filter', { sport })}</button>}
        {goals.map((g) => <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(goal === g ? null : g)} className={chip(goal === g)} data-testid={`prog-goal-${g}`}>{t(`prog.goals.${g}`)}</button>)}
      </div>
      <p className="mb-2 text-[12px] text-ink-muted" data-testid="prog-count">{t('prog.count', { n: shown.length })}</p>
      <ul className="divide-y divide-line border-y border-line">
        {shown.map((i) => (
          <li key={i.key}>
            <Link to={i.to} data-testid={`prog-${i.key}`} className="flex min-h-16 items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-[16px] leading-tight font-bold">{i.title}</p>
                <p className="mt-0.5 text-[12px] text-ink-secondary">{i.meta}</p>
                <FitTag fit={i.fit} sport={sport} testId={`prog-fit-${i.key}`} />
              </div>
              <ChevronRight size={18} aria-hidden className="text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4">
        <Link to="/plan/vorlagen" data-testid="prog-own-templates" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('prog.ownTemplates')}</Link>
      </p>
    </div>
  )
}

export default ProgramLibraryScreen
