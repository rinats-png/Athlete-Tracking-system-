import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { InfoNote } from '@/components/ui/InfoNote'
import { sessionImage } from '@/data/visuals'
import { X } from 'lucide-react'
import { useAppData } from '@/lib/store/AppDataProvider'
import { findOpenOccurrence, openOccurrencesOn } from '@/domain/trainingBlock'
import { syncAssignedCompletions } from '@/lib/assignSync'
import { LiveHr } from '@/features/plan/LiveHr'
import type { HrSummary } from '@/domain/liveHr'
import { SessionWhy } from '@/features/plan/SessionWhy'
import { blockText, diaryKindOf, sessionName, sessionSource } from '@/features/plan/planText'
import { trainingPlanMode } from '@/features/plan/PlanPreviewScreen'
import { cn } from '@/lib/utils'
import type { StoredPlannedSession } from '@/lib/store/localStore'
import { SetLogger, type Swap } from '@/features/plan/SetLogger'
import { useLibrary } from '@/features/library/useLibrary'
import type { SetLogEntry } from '@/domain/setLog'

/**
 * Session Player: führt durch die Einheit des Tages. Läuft ohne Netz. Für
 * Intervalle zählt eine Uhr Arbeit und Pause; alles andere steht als Karte.
 * Beim Abschluss kommt die Einheit mit Dauer und Anstrengung ins Tagebuch.
 *
 * Übungen haben ein Satz-Log (was je Satz war) und lassen sich ersetzen
 * (`SetLogger`). Der Player zeigt die Termine des Tages — auch verschobene.
 */

interface Step {
  kind: 'work' | 'rest'
  seconds: number
  index: number
  of: number
}

function stepsOf(session: StoredPlannedSession): Step[] {
  const out: Step[] = []
  for (const b of session.blocks) {
    if (b.type !== 'interval') continue
    for (let i = 1; i <= b.repetitions; i++) {
      out.push({ kind: 'work', seconds: b.workSeconds, index: i, of: b.repetitions })
      if (i < b.repetitions && b.recoverySeconds > 0) out.push({ kind: 'rest', seconds: b.recoverySeconds, index: i, of: b.repetitions })
    }
  }
  return out
}

/** Pulsziel der Einheit in Prozent der HFmax, wo die Regel eines nennt. */
function targetOf(session: StoredPlannedSession): { min: number; max: number } | null {
  for (const b of session.blocks) if (b.type === 'interval' && b.intensity.type === 'hr_percent_max') return { min: b.intensity.min, max: b.intensity.max }
  return null
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s % 60)) % 60).padStart(2, '0')}`

export function SessionPlayerScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, trainingBlocks, completePlannedSession } = useAppData()
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const today = new Date().toISOString().slice(0, 10)
  // Gewählt über die Startauswahl oder den Kalender: auch eine Einheit eines anderen Tages.
  const [params] = useSearchParams()
  const wanted = block && params.get('s') && params.get('d') ? findOpenOccurrence(block, params.get('s') as string, params.get('d') as string) : null
  const keyOf = (o: { session: StoredPlannedSession; planned: string }) => `${o.session.id}|${o.planned}`
  const todays = block ? openOccurrencesOn(block, today) : []
  const open = wanted && !todays.some((o) => keyOf(o) === keyOf(wanted)) ? [wanted, ...todays] : todays
  const [pickedKey, setPickedKey] = useState<string | null>(wanted ? keyOf(wanted) : null)
  const occurrence = open.find((o) => keyOf(o) === pickedKey) ?? open[0] ?? null
  const session = occurrence?.session ?? null
  const hasLibrary = session?.blocks.some((b) => b.type === 'library_exercise') ?? false
  const { exercises, index } = useLibrary(hasLibrary)
  const planSubs = index?.plans.find((p) => p.plan_id === block?.libraryPlanId)?.substitutions ?? {}
  const [log, setLog] = useState<{ sets: SetLogEntry[]; swaps: Swap[] }>({ sets: [], swaps: [] })

  const steps = useMemo(() => (session ? stepsOf(session) : []), [session])
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const endAt = useRef(0)
  const startedAt = useRef<number | null>(null)
  const [rpe, setRpe] = useState<number | null>(null)
  const [minutes, setMinutes] = useState<number | null>(null)
  const [hr, setHr] = useState<HrSummary | null>(null)
  const [feedback, setFeedback] = useState<number | null>(null)
  const [pain, setPain] = useState(false)

  useEffect(() => {
    setStep(0)
    setRunning(false)
    setRemaining(steps[0]?.seconds ?? 0)
    startedAt.current = null
    setMinutes(session?.plannedDurationMin ?? null)
    setHr(null)
  }, [session?.id, steps])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const left = (endAt.current - Date.now()) / 1000
      if (left > 0) {
        setRemaining(left)
        return
      }
      // Nächster Schritt; ein kurzes Vibrieren gibt den Wechsel an, wo das Gerät es kann.
      try {
        navigator.vibrate?.(200)
      } catch {
        // kein Vibrieren: der Wechsel bleibt sichtbar
      }
      setStep((i) => {
        const next = i + 1
        if (next >= steps.length) {
          setRunning(false)
          setRemaining(0)
          return i
        }
        endAt.current = Date.now() + steps[next].seconds * 1000
        setRemaining(steps[next].seconds)
        return next
      })
    }, 250)
    return () => clearInterval(id)
  }, [running, steps])

  if (trainingPlanMode() === 'off' || !block) return <EmptyState title={t('player.title')} body={t('player.noBlock')} action={<Link to="/plan/block" className="inline-flex min-h-11 items-center text-accent-text underline">{t('player.toBlock')}</Link>} />
  if (!session || !occurrence) return <EmptyState title={t('player.title')} body={t('player.none')} action={<Link to="/plan/block" className="inline-flex min-h-11 items-center text-accent-text underline">{t('player.toBlock')}</Link>} />

  const toggle = () => {
    if (steps.length === 0) return
    if (!running) {
      if (startedAt.current == null) startedAt.current = Date.now()
      endAt.current = Date.now() + remaining * 1000
    }
    setRunning((r) => !r)
  }
  const elapsedMin = startedAt.current ? Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)) : null
  const current = steps[step]
  const finished = steps.length > 0 && step === steps.length - 1 && !running && remaining === 0

  const done = () => {
    if (rpe == null) return
    const durationMin = Math.min(600, Math.max(1, minutes ?? elapsedMin ?? 30))
    const planDay = occurrence.planned === today ? null : occurrence.planned
    const swaps = log.swaps.map(({ part, from, to, toName }) => ({ part, from, to, toName }))
    completePlannedSession({
      blockId: block.id,
      sessionId: session.id,
      day: today,
      durationMin,
      rpe,
      kind: diaryKindOf(session.primaryIntent),
      hr: hr ? { avg: hr.avg, max: hr.max } : null,
      feedback,
      pain,
      planDay,
      sets: log.sets,
      swaps,
      title: sessionName(session, t),
      substitutions: log.swaps.filter((x) => x.keep).map(({ from, fromName, to, toName }) => ({ from, fromName, to, toName })),
    })
    // Zugewiesener Block: Fortschritt nachmelden (best effort, ohne Netz geht es später).
    if (block.assignmentId) void syncAssignedCompletions({ ...block, completions: [...block.completions, { sessionId: session.id, day: today, durationMin, rpe, diarySessionId: null, avgHr: hr?.avg ?? null, maxHr: hr?.max ?? null, feedback, pain, planDay, sets: log.sets, swaps }] })
    navigate('/plan/block')
  }

  return (
    <div data-testid="session-player" className="scope-dark -mx-4 -mt-5 min-h-dvh px-4 pb-8 sm:mx-0 sm:mt-0 sm:min-h-0 sm:rounded-2xl sm:px-6">
      {/* Fotokopf: die erste bebilderte Übung der Einheit, läuft in den dunklen Grund aus. */}
      <div className="relative -mx-4 h-[220px] overflow-hidden sm:-mx-6 sm:rounded-t-2xl">
        <img src={sessionImage(session)} alt="" decoding="async" className="size-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, var(--plane) 4%, rgba(11,16,20,.25) 60%, rgba(11,16,20,.6))' }} />
        <Link to="/plan" aria-label={t('look.player.close')} className="absolute top-3 left-2 inline-flex size-11 items-center justify-center rounded-pill text-ink">
          <X size={20} aria-hidden />
        </Link>
      </div>
      <header className="relative -mt-16 mb-4">
        <span className="label-tag">{t('player.eyebrow')} · {sessionSource(session, t)}</span>
        <h1 className="mt-1 font-display text-[36px] leading-none font-bold">{sessionName(session, t)}</h1>
        <InfoNote text={t('player.intro')} />
      </header>
      {open.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('player.pick')}>
          {open.map((o) => (
            <button key={keyOf(o)} type="button" aria-pressed={keyOf(o) === keyOf(occurrence)} onClick={() => setPickedKey(keyOf(o))} className={cn('min-h-11 rounded-pill border px-4 text-[13px]', keyOf(o) === keyOf(occurrence) ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
              {sessionName(o.session, t)}
            </button>
          ))}
        </div>
      )}
      <Panel className="mb-4">
        <div className="px-4 py-4">
          {occurrence.date !== today && <p className="mb-2 text-[12px] text-ink-secondary" data-testid="player-other-day">{t('start.countsFor', { date: `${occurrence.date.slice(8, 10)}.${occurrence.date.slice(5, 7)}.` })}</p>}
          {occurrence.moved && <p className="mb-2 text-[12px] text-ink-secondary" data-testid="player-moved">{t('cal.movedFrom', { date: `${occurrence.planned.slice(8, 10)}.${occurrence.planned.slice(5, 7)}.` })}</p>}
          {session.blocks.map((b, i) => (b.type === 'library_exercise' || b.type === 'strength' || b.type === 'exercise' ? null : <p key={i} className="text-[14px]">{blockText(b, t)}</p>))}
          <SetLogger session={session} exercises={exercises} planSubs={planSubs} blocks={trainingBlocks} onChange={setLog} />
          <SessionWhy session={session} block={block} />
          {steps.length > 0 && (
            <div className="mt-4 text-center" data-testid="player-timer">
              <p className="label-tag">{current ? t(current.kind === 'work' ? 'player.work' : 'player.rest', { index: current.index, of: current.of }) : ''}</p>
              <p className="readout text-[56px] leading-none" aria-live="off" data-testid="player-clock">{mmss(remaining)}</p>
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" onClick={toggle} data-testid="player-toggle" className="min-h-11 rounded-pill bg-accent px-6 text-[13px] font-semibold text-accent-ink">
                  {running ? t('player.pause') : t('player.start')}
                </button>
              </div>
              <p className="mt-2 text-[12px] text-ink-secondary">{t('player.stepOf', { step: step + 1, of: steps.length })}</p>
            </div>
          )}
        </div>
      </Panel>

      <p className="mb-4">
        <Link to="/fuel" data-testid="player-to-fuel" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('fuelPlan.toFuel')}</Link>
      </p>
      <LiveHr hrMax={data.profile.maxHr} target={targetOf(session)} running={running} onSummary={setHr} />

      <Panel data-testid="player-finish">
        <PanelHeader title={t('player.finish')} subtitle={finished ? t('player.allDone') : undefined} />
        <div className="space-y-3 px-4 pb-4">
          <label className="block text-[13px]">
            <span className="label-tag">{t('player.minutes')}</span>
            <input type="number" inputMode="numeric" min={1} max={600} value={minutes ?? ''} onChange={(e) => setMinutes(e.target.value === '' ? null : Number(e.target.value))} data-testid="player-minutes" className="mt-1.5 min-h-11 w-28 rounded-md border border-line bg-surface px-3 text-[16px]" />
          </label>
          <div role="radiogroup" aria-label={t('player.rpe')}>
            <span className="label-tag">{t('player.rpe')}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rpe === n} data-testid={`player-rpe-${n}`} onClick={() => setRpe(n)} className={cn('min-h-11 min-w-11 rounded-pill border text-[14px]', rpe === n ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-label={t('adapt.feedbackQ')} data-testid="player-feedback">
            <span className="label-tag">{t('adapt.feedbackQ')}</span>
            <div className="mt-1.5 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={feedback === n} data-testid={`player-feedback-${n}`} onClick={() => setFeedback(feedback === n ? null : n)} className={cn('flex min-h-11 flex-col items-center justify-center rounded-md border px-1 text-[11px] leading-tight', feedback === n ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                  <span className="text-[15px]">{n}</span>
                  <span>{t(`adapt.fb.${n}`)}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-[14px]">
            <input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} data-testid="player-pain" className="size-5" />
            {t('adapt.pain')}
          </label>
          <button type="button" data-testid="player-done" disabled={rpe == null} onClick={done} className="min-h-11 rounded-pill bg-accent px-6 text-[13px] font-semibold text-accent-ink disabled:opacity-45">
            {t('player.save')}
          </button>
        </div>
      </Panel>
    </div>
  )
}
