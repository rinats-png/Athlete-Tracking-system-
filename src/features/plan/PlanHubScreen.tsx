import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarRange, ClipboardList, Flag, Library, MessageSquareText, Timer } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/planMode'
import { planAssignEnabled } from '@/lib/planAssign'
import { PlanOffersPanel } from '@/features/plan/PlanOffersPanel'
import { blockEndDay, blockWeek, openSessionsOn, sessionInWeek, weekChecks } from '@/domain/trainingBlock'
import { daysTo } from '@/domain/weeklyPlan'
import { TRAINING_RULES } from '@/data/trainingRules'
import { getTest } from '@/data/testCatalog'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Training-Hub (Tab «Plan»): in drei Sekunden erkennen, was heute dran ist,
 * wo man im Block steht und worauf er zielt. Keine Feature-Sammlung: vier
 * Karten, eine Begründung, vier Abkürzungen.
 */
const chip = 'inline-flex min-h-6 items-center gap-1 rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-ink-secondary'

export function PlanHubScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, trainingBlocks, role } = useAppData()
  const mode = planMode(import.meta.env?.VITE_TRAINING_PLAN)
  const today = new Date().toISOString().slice(0, 10)
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null

  const view = useMemo(() => {
    if (!block) return null
    const week = blockWeek(block, today)
    const checks = weekChecks(block, today)
    const current = typeof week === 'number' ? checks.find((c) => c.week === week) ?? { week, planned: block.sessions.filter((s) => !s.removed && sessionInWeek(s, week, block.weeks)).length, done: 0 } : null
    const open = openSessionsOn(block, today)
    const intents = [...new Set(block.sessions.filter((s) => !s.removed).map((s) => s.primaryIntent))]
    const strengths = [...new Set(block.sessions.filter((s) => !s.removed).map((s) => s.evidenceStrength).filter((x): x is NonNullable<typeof x> => x != null))]
    const unreviewed = block.sessions.some((s) => s.kind === 'open' || TRAINING_RULES.find((r) => r.id === s.ruleId)?.review.state !== 'reviewed')
    return { week, current, open, intents, strengths, unreviewed, endsIn: daysTo(blockEndDay(block), new Date()) }
  }, [block, today])

  if (mode === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />

  const competition = data.profile.competition
  const toGo = competition ? daysTo(competition.on, new Date()) : null
  const intentText = (list: string[]) => list.map((i) => t(`plan.intent.${i}`)).join(' · ')
  const retestName = block?.retestMetrics[0] ? pick(getTest(block.retestMetrics[0])?.name, locale) ?? block.retestMetrics[0] : null

  return (
    <div data-testid="plan-hub">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('planHub.title')} intro={competition ? t('planHub.competition', { name: competition.name || t('planHub.competitionUnnamed') }) : undefined} />

      <PlanOffersPanel />
      <nav className="mb-4 flex flex-wrap gap-x-5" aria-label={t('planHub.more')} data-testid="hub-links">
        <Link to="/plan/kalender" data-testid="hub-to-calendar" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('cal.link')}</Link>
        <Link to="/plan/programme" data-testid="hub-to-programs" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('prog.link')}</Link>
        <Link to="/plan/uebungen" data-testid="hub-to-exercises" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('exlib.link')}</Link>
        <Link to="/plan/entwicklung" data-testid="hub-to-development" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('dev.link')}</Link>
      </nav>
      {role === 'coach' && planAssignEnabled() && (
        <p className="mb-4">
          <Link to="/plan/zuweisen" data-testid="hub-to-assign" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('assign.link')}</Link>
        </p>
      )}

      {!block || !view ? (
        <Panel className="mb-4" data-testid="hub-empty">
          <div className="space-y-3 px-4 py-4">
            <h2 className="font-display text-[20px] font-bold">{t('planHub.empty.title')}</h2>
            <p className="text-[14px] text-ink-secondary">{t('planHub.empty.body')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/plan/programme" data-testid="hub-ready" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">
                {t('planHub.empty.ready')}
              </Link>
              <Link to="/plan/waehlen" data-testid="hub-choose" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
                {t('planHub.empty.otherWays')}
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <>
          <Panel float className="mb-4 border-accent" data-testid="hub-block">
            <div className="space-y-2 px-4 py-4">
              <span className="label-tag">{t('planHub.block')}</span>
              <h2 className="font-display text-[22px] leading-tight font-bold">{intentText(view.intents)}</h2>
              <div className="flex gap-1" aria-hidden>
                {Array.from({ length: block.weeks }, (_, i) => {
                  const w = typeof view.week === 'number' ? view.week : view.week === 'after' ? block.weeks + 1 : 0
                  return <i key={i} className={cn('h-1.5 flex-1 rounded-pill', i + 1 < w ? 'bg-accent' : i + 1 === w ? 'bg-accent-glow' : 'bg-line')} />
                })}
              </div>
              <p className="text-[13px] text-ink-secondary" data-testid="hub-week">
                {typeof view.week === 'number' ? t('planHub.weekOf', { week: view.week, weeks: block.weeks, phase: t(`plan.phase.${block.phase}`) }) : view.week === 'before' ? t('planHub.notStarted') : t('planHub.over')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className={chip}>
                  <Timer size={12} aria-hidden /> {t('planHub.retestIn', { count: Math.max(0, view.endsIn) })}
                </span>
                {toGo != null && toGo >= 0 && (
                  <span className={chip}>
                    <Flag size={12} aria-hidden /> {t('planHub.competitionIn', { count: toGo })}
                  </span>
                )}
              </div>
            </div>
          </Panel>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <Panel data-testid="hub-today">
              <div className="space-y-1 px-4 py-3">
                <span className="label-tag">{t('planHub.today')}</span>
                {view.open.length > 0 ? (
                  <>
                    <p className="font-display text-[17px] font-bold">{view.open.map((s) => t(`plan.intent.${s.primaryIntent}`)).join(' · ')}</p>
                    <Link to="/plan/heute" data-testid="hub-start" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
                      {t('planHub.start')}
                    </Link>
                  </>
                ) : (
                  <p className="text-[14px] text-ink-secondary">{t('planHub.todayNone')}</p>
                )}
              </div>
            </Panel>
            <Panel data-testid="hub-weekcount">
              <div className="space-y-1 px-4 py-3">
                <span className="label-tag">{t('planHub.thisWeek')}</span>
                <p className="readout text-[30px] leading-none font-light">
                  {view.current?.done ?? 0} <span className="text-[13px] text-ink-muted">{t('planHub.ofCount', { count: view.current?.planned ?? 0 })}</span>
                </p>
                <p className="text-[12px] text-ink-secondary">{t('planHub.doneSessions')}</p>
              </div>
            </Panel>
            <Panel data-testid="hub-goal">
              <div className="space-y-1 px-4 py-3">
                <span className="label-tag">{t('planHub.goal')}</span>
                <p className="font-display text-[16px] leading-tight font-bold">{intentText(view.intents.slice(0, 2))}</p>
              </div>
            </Panel>
            <Panel data-testid="hub-retest">
              <div className="space-y-1 px-4 py-3">
                <span className="label-tag">{t('planHub.retest')}</span>
                <p className="font-display text-[16px] leading-tight font-bold">{retestName ?? '—'}</p>
                <p className="text-[12px] text-ink-secondary">{t('planHub.retestEnd', { count: Math.max(0, view.endsIn) })}</p>
              </div>
            </Panel>
          </div>

          <Panel className="mb-4" data-testid="hub-why">
            <div className="space-y-2 px-4 py-4">
              <h3 className="font-display text-[15px] font-bold">{t('planHub.why.title')}</h3>
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t('planHub.why.text', { intents: intentText(view.intents) })}</p>
              <div className="flex flex-wrap gap-1.5">
                {view.strengths.map((s) => (
                  <span key={s} className={cn(chip, 'border-accent text-accent-text')}>
                    {t('plan.evidence.strength', { level: t(`plan.strength.${s}`) })}
                  </span>
                ))}
                {view.unreviewed && <span className={cn(chip, 'border-dashed text-ink-muted')}>{t('plan.review.unreviewed')}</span>}
              </div>
              <Link to="/plan/block" className="inline-flex min-h-11 items-center text-[13px] font-semibold text-accent-text">
                {t('planHub.why.link')}
              </Link>
            </div>
          </Panel>
        </>
      )}

      <div className="grid grid-cols-4 gap-2" data-testid="hub-shortcuts">
        {(
          [
            ['/plan/block', CalendarRange, 'plan'],
            ['/diagnostik', ClipboardList, 'tests'],
            ['/training', Library, 'library'],
            ['/fragen', MessageSquareText, 'ask'],
          ] as const
        ).map(([to, Icon, key]) => (
          <Link key={key} to={to} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border border-line bg-surface px-1 py-2 text-[11px] text-ink-secondary hover:bg-surface-sunken">
            <Icon size={16} aria-hidden />
            {t(`planHub.shortcut.${key}`)}
          </Link>
        ))}
      </div>
    </div>
  )
}
