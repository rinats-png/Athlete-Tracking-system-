import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { planMode } from '@/domain/planMode'
import { adoptGate } from '@/domain/library'
import { useAppData } from '@/lib/store/AppDataProvider'
import { cn } from '@/lib/utils'
import { useLibrary } from './useLibrary'
import { GermanOnlyNote, UnreviewedBanner } from './bits'

/**
 * Programmbibliothek (Programm-Seed v4): 16 Pläne in voller Wochentiefe.
 * Filter nach Ziel und Niveau; jede Karte nennt Dauer, Tage, Niveau und ob der
 * Plan allein übernommen werden kann. Alle Pläne sind fachlich ungeprüft —
 * das steht oben, nicht im Kleingedruckten.
 */
export function ProgramLibraryScreen() {
  const { t } = useTranslation()
  const { role } = useAppData()
  const { index } = useLibrary()
  const [goal, setGoal] = useState<string | null>(null)
  const [level, setLevel] = useState<'all' | 'beginner' | 'advanced'>('all')
  const [selfOnly, setSelfOnly] = useState(false)
  const goals = useMemo(() => [...new Set(index?.plans.map((p) => p.goal) ?? [])], [index])

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!index) return <p className="text-[14px] text-ink-secondary" data-testid="lib-loading">{t('lib.loading')}</p>

  const plans = index.plans.filter(
    (p) =>
      (!goal || p.goal === goal) &&
      (level === 'all' || (level === 'beginner') === p.level.startsWith('Einsteiger')) &&
      (!selfOnly || adoptGate(p, role) !== 'coach_only'),
  )
  const chip = (active: boolean) => cn('min-h-11 rounded-pill border px-4 text-[13px]', active ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')

  return (
    <div data-testid="program-library">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('prog.title')} intro={t('prog.intro')} />
      <UnreviewedBanner />
      <GermanOnlyNote />
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t('prog.goal')}>
        <button type="button" aria-pressed={goal == null} onClick={() => setGoal(null)} className={chip(goal == null)} data-testid="prog-goal-all">{t('tpl.goal.all')}</button>
        {goals.map((g) => <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(goal === g ? null : g)} className={chip(goal === g)} data-testid={`prog-goal-${g}`}>{t(`prog.goals.${g}`)}</button>)}
      </div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t('prog.level')}>
        {(['all', 'beginner', 'advanced'] as const).map((l) => <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={chip(level === l)} data-testid={`prog-level-${l}`}>{t(`prog.levels.${l}`)}</button>)}
      </div>
      <label className="mb-4 flex min-h-11 items-center gap-3 text-[14px]">
        <input type="checkbox" checked={selfOnly} onChange={(e) => setSelfOnly(e.target.checked)} className="size-5" data-testid="prog-self" />
        {t('prog.selfOnly')}
      </label>
      <p className="mb-2 text-[13px] text-ink-secondary" data-testid="prog-count">{t('prog.count', { n: plans.length })}</p>
      <ul className="space-y-3">
        {plans.map((p) => {
          const gate = adoptGate(p, role)
          return (
            <li key={p.plan_id}>
              <Link to={`/plan/programme/${p.plan_id}`} data-testid={`prog-${p.plan_id}`} className="block">
                <Panel lift className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="label-tag">{t(`prog.goals.${p.goal}`)}</span>
                    <p className="font-display text-[17px] leading-tight font-bold">{p.title}</p>
                    <p className="text-[12px] text-ink-secondary">{t('prog.meta', { weeks: p.weeks, days: p.sessions_per_week, sessions: p.sessionCount })} · {p.level.startsWith('Einsteiger') ? t('prog.levels.beginner') : t('prog.levels.advanced')}</p>
                    <p className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded-pill border border-line px-2 py-0.5">{t(`prog.cat.${p.category}`)}</span>
                      {gate !== 'open' && <span className="rounded-pill border border-warning px-2 py-0.5 text-warning" data-testid={`prog-gate-${p.plan_id}`}>{t(`prog.gate.${gate}`)}</span>}
                    </p>
                  </div>
                  <ChevronRight size={18} aria-hidden className="text-ink-muted" />
                </Panel>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ProgramLibraryScreen
