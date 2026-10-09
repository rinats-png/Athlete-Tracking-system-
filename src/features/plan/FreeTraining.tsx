import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Minus, Plus, X } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Thumb } from '@/components/ui/PhotoCard'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/planMode'
import { librarySession } from '@/domain/library'
import { canStartCustom, customSession, MAX_FREE_EXERCISES, type FreePick } from '@/domain/freeSession'
import type { SetLogEntry } from '@/domain/setLog'
import type { StoredPlannedSession } from '@/lib/store/localStore'
import { AREA_IMAGES, goalImage, libraryExerciseImage, sessionImage } from '@/data/visuals'
import { useLibrary, usePlanWeeks } from '@/features/library/useLibrary'
import { GermanOnlyNote, UnreviewedBanner } from '@/features/library/bits'
import { SetLogger, type Swap } from '@/features/plan/SetLogger'
import { blockText, diaryKindOf, sessionName, sessionSource } from '@/features/plan/planText'
import { cn } from '@/lib/utils'

/**
 * Freies Training: Einheiten ohne Termin im Plan (`domain/freeSession.ts`).
 *
 *   Katalog   eine Einheit aus einem fertigen Plan, ohne den Plan zu übernehmen
 *   Baukasten eine eigene Einheit aus der Übungsdatenbank
 *   Player    führt die Einheit mit Satz-Log; Speichern legt ein Training
 *             und eine Einheit im Tagebuch an — kein Termin wird abgehakt.
 *
 * Die Einheit reist im Zustand der Navigation zum Player (übersteht Neuladen).
 * Fehlt er, weil die Adresse direkt aufgerufen wurde, sagt der Player das und
 * führt zurück zur Auswahl.
 */
const field = 'mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]'
const freeId = () => `free-${Date.now().toString(36)}`
const off = () => planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off'

export function FreeCatalogScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { exercises, index } = useLibrary()
  const [planId, setPlanId] = useState<string | null>(null)
  const [week, setWeek] = useState(1)
  const weeks = usePlanWeeks(planId ?? undefined)
  const plan = index?.plans.find((p) => p.plan_id === planId) ?? null

  if (off()) return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!index || !exercises) return <p className="text-[14px] text-ink-secondary" data-testid="lib-loading">{t('lib.loading')}</p>

  const start = (i: number) => {
    if (!plan || !weeks) return
    const session = librarySession(plan, weeks, week, i, index, exercises, freeId())
    if (session) navigate('/plan/frei', { state: { session } })
  }
  const sessions = weeks?.find((w) => w.week === week)?.sessions ?? []

  return (
    <div data-testid="free-catalog">
      <ScreenHeader eyebrow={t('start.title')} title={t('free.catalogTitle')} intro={t('free.catalogIntro')} />
      <UnreviewedBanner />
      <GermanOnlyNote />
      {!plan ? (
        <ul className="divide-y divide-line border-y border-line">
          {index.plans.map((p) => (
            <li key={p.plan_id}>
              <button type="button" onClick={() => { setPlanId(p.plan_id); setWeek(1) }} data-testid={`free-plan-${p.plan_id}`} className="flex min-h-16 w-full items-center gap-3 py-3 text-left">
                <Thumb src={goalImage(p.goal)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[16px] leading-tight font-bold">{p.title}</span>
                  <span className="mt-0.5 block text-[12px] text-ink-secondary">{t('prog.metaShort', { weeks: p.weeks, days: p.sessions_per_week })}</span>
                </span>
                <ChevronRight size={18} aria-hidden className="text-ink-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Panel data-testid="free-sessions">
          <PanelHeader title={plan.title} subtitle={t('free.pickSession')} />
          <div className="px-4 pb-4">
            <label className="block text-[13px]">
              <span className="label-tag">{t('free.week')}</span>
              <select value={week} onChange={(e) => setWeek(Number(e.target.value))} data-testid="free-week" className={cn(field, 'w-32')}>
                {Array.from({ length: plan.weeks }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
            </label>
            {weeks === undefined && <p className="mt-3 text-[14px] text-ink-secondary">{t('lib.loading')}</p>}
            <ul className="mt-2 divide-y divide-line">
              {sessions.map((s, i) => (
                <li key={`${week}-${i}`} className="flex min-h-16 items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{s.name}</span>
                    <span className="block text-[12px] text-ink-secondary">{t('free.items', { n: s.items.length })}</span>
                  </span>
                  <button type="button" onClick={() => start(i)} data-testid={`free-session-${i}`} className="min-h-11 rounded-pill bg-accent px-4 text-[13px] font-semibold text-accent-ink">{t('player.start')}</button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setPlanId(null)} data-testid="free-other-plan" className="mt-2 inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('free.otherPlan')}</button>
          </div>
        </Panel>
      )}
    </div>
  )
}

export function FreeBuildScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { exercises } = useLibrary()
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [picks, setPicks] = useState<FreePick[]>([])

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!exercises || q.length < 2) return []
    return exercises.filter((e) => e.name.toLowerCase().includes(q) && !picks.some((p) => p.exerciseId === e.id)).slice(0, 8)
  }, [exercises, query, picks])

  if (off()) return <EmptyState title={t('plan.title')} body={t('plan.off')} />

  const update = (i: number, patch: Partial<FreePick>) => setPicks(picks.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const start = () => {
    if (!canStartCustom(title, picks)) return
    navigate('/plan/frei', { state: { session: customSession(freeId(), title, picks) } })
  }

  return (
    <div data-testid="free-build">
      <ScreenHeader eyebrow={t('start.title')} title={t('free.buildTitle')} intro={t('free.buildIntro')} />
      <GermanOnlyNote />
      <Panel className="mb-4">
        <div className="space-y-3 px-4 py-4">
          <label className="block text-[13px]">
            <span className="label-tag">{t('free.name')}</span>
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} data-testid="free-name" className={field} />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('free.search')}</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} disabled={picks.length >= MAX_FREE_EXERCISES} data-testid="free-search" className={field} />
          </label>
          {!exercises && <p className="text-[13px] text-ink-secondary">{t('lib.loading')}</p>}
          {hits.length > 0 && (
            <ul className="divide-y divide-line rounded-md border border-line" data-testid="free-hits">
              {hits.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => { setPicks([...picks, { exerciseId: e.id, name: e.name, sets: 3, reps: null }]); setQuery('') }} data-testid={`free-add-${e.id}`} className="flex min-h-12 w-full items-center gap-3 px-3 py-1.5 text-left text-[14px]">
                    <Thumb src={libraryExerciseImage(e.id)} className="size-9" />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <Plus size={16} aria-hidden className="text-accent-text" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="free-picks">
        <PanelHeader title={t('free.exercises')} subtitle={`${picks.length} / ${MAX_FREE_EXERCISES}`} />
        <div className="px-4 pb-4">
          {picks.length === 0 && <p className="text-[14px] text-ink-secondary">{t('free.empty')}</p>}
          <ul className="divide-y divide-line">
            {picks.map((p, i) => (
              <li key={p.exerciseId} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 basis-40 text-[14px]">{p.name}</span>
                <span className="flex items-center gap-1" role="group" aria-label={t('free.sets')}>
                  <button type="button" aria-label={t('free.fewer')} onClick={() => update(i, { sets: Math.max(1, p.sets - 1) })} className="inline-flex size-11 items-center justify-center rounded-pill border border-line"><Minus size={14} aria-hidden /></button>
                  <span className="readout w-14 text-center text-[13px]" data-testid={`free-sets-${i}`}>{t('free.setsN', { n: p.sets })}</span>
                  <button type="button" aria-label={t('free.more')} onClick={() => update(i, { sets: Math.min(20, p.sets + 1) })} className="inline-flex size-11 items-center justify-center rounded-pill border border-line"><Plus size={14} aria-hidden /></button>
                </span>
                <input value={p.reps ?? ''} maxLength={20} placeholder={t('free.reps')} aria-label={t('free.reps')} onChange={(e) => update(i, { reps: e.target.value || null })} data-testid={`free-reps-${i}`} className="min-h-11 w-24 rounded-md border border-line bg-surface px-3 text-[16px]" />
                <button type="button" aria-label={t('free.remove')} onClick={() => setPicks(picks.filter((_, j) => j !== i))} className="inline-flex size-11 items-center justify-center text-ink-muted"><X size={16} aria-hidden /></button>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <button type="button" onClick={start} disabled={!canStartCustom(title, picks)} data-testid="free-build-start" className="min-h-11 rounded-pill bg-accent px-6 text-[13px] font-semibold text-accent-ink disabled:opacity-45">
        {t('free.start')}
      </button>
    </div>
  )
}

export function FreePlayerScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { trainingBlocks, logFreeSession } = useAppData()
  const session = (location.state as { session?: StoredPlannedSession } | null)?.session ?? null
  const { exercises } = useLibrary(session != null)
  const [log, setLog] = useState<{ sets: SetLogEntry[]; swaps: Swap[] }>({ sets: [], swaps: [] })
  const [minutes, setMinutes] = useState<number | null>(session?.plannedDurationMin ?? null)
  const [rpe, setRpe] = useState<number | null>(null)

  if (off()) return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!session) return <EmptyState title={t('free.eyebrow')} body={t('free.lost')} action={<Link to="/plan/start" className="inline-flex min-h-11 items-center text-accent-text underline">{t('start.title')}</Link>} />

  const save = () => {
    if (rpe == null) return
    const today = new Date().toISOString().slice(0, 10)
    logFreeSession({ day: today, title: sessionName(session, t), durationMin: Math.min(600, Math.max(1, minutes ?? 30)), rpe, kind: diaryKindOf(session.primaryIntent), sets: log.sets })
    navigate('/training')
  }

  return (
    <div data-testid="free-player" className="scope-dark -mx-4 -mt-5 min-h-dvh px-4 pb-8 sm:mx-0 sm:mt-0 sm:min-h-0 sm:rounded-2xl sm:px-6">
      <div className="relative -mx-4 h-[220px] overflow-hidden sm:-mx-6 sm:rounded-t-2xl">
        <img src={session.blocks.length ? sessionImage(session) : AREA_IMAGES.training} alt="" decoding="async" className="size-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, var(--plane) 4%, rgba(11,16,20,.25) 60%, rgba(11,16,20,.6))' }} />
        <Link to="/plan/start" aria-label={t('look.player.close')} className="absolute top-3 left-2 inline-flex size-11 items-center justify-center rounded-pill text-ink">
          <X size={20} aria-hidden />
        </Link>
      </div>
      <header className="relative -mt-16 mb-4">
        <span className="label-tag">{t('free.eyebrow')} · {sessionSource(session, t)}</span>
        <h1 className="mt-1 font-display text-[36px] leading-none font-bold">{sessionName(session, t)}</h1>
        <p className="mt-2 text-[12px] text-ink-secondary">{t('free.noSlot')}</p>
      </header>
      <Panel className="mb-4">
        <div className="px-4 py-4">
          {session.blocks.map((b, i) => (b.type === 'library_exercise' || b.type === 'strength' || b.type === 'exercise' ? null : <p key={i} className="text-[14px]">{blockText(b, t)}</p>))}
          <SetLogger session={session} exercises={exercises} planSubs={{}} blocks={trainingBlocks} onChange={setLog} canKeep={false} />
        </div>
      </Panel>
      <Panel data-testid="free-finish">
        <PanelHeader title={t('player.finish')} />
        <div className="space-y-3 px-4 pb-4">
          <label className="block text-[13px]">
            <span className="label-tag">{t('player.minutes')}</span>
            <input type="number" inputMode="numeric" min={1} max={600} value={minutes ?? ''} onChange={(e) => setMinutes(e.target.value === '' ? null : Number(e.target.value))} data-testid="free-minutes" className="mt-1.5 min-h-11 w-28 rounded-md border border-line bg-surface px-3 text-[16px]" />
          </label>
          <div role="radiogroup" aria-label={t('player.rpe')}>
            <span className="label-tag">{t('player.rpe')}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rpe === n} data-testid={`free-rpe-${n}`} onClick={() => setRpe(n)} className={cn('min-h-11 min-w-11 rounded-pill border text-[14px]', rpe === n ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button type="button" data-testid="free-save" disabled={rpe == null} onClick={save} className="min-h-11 rounded-pill bg-accent px-6 text-[13px] font-semibold text-accent-ink disabled:opacity-45">
            {t('free.save')}
          </button>
        </div>
      </Panel>
    </div>
  )
}
