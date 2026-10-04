import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { openSessionsOn } from '@/domain/trainingBlock'
import { blockText, diaryKindOf } from '@/features/plan/planText'
import { trainingPlanMode } from '@/features/plan/PlanPreviewScreen'
import { cn } from '@/lib/utils'
import type { StoredPlannedSession } from '@/lib/store/localStore'

/**
 * Session Player: führt durch die Einheit des Tages. Läuft ohne Netz. Für
 * Intervalle zählt eine Uhr Arbeit und Pause; alles andere steht als Karte.
 * Beim Abschluss kommt die Einheit mit Dauer und Anstrengung ins Tagebuch.
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

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s % 60)) % 60).padStart(2, '0')}`

export function SessionPlayerScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { trainingBlocks, completePlannedSession } = useAppData()
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const today = new Date().toISOString().slice(0, 10)
  const open = block ? openSessionsOn(block, today) : []
  const [pickedId, setPickedId] = useState<string | null>(null)
  const session = open.find((s) => s.id === pickedId) ?? open[0] ?? null

  const steps = useMemo(() => (session ? stepsOf(session) : []), [session])
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const endAt = useRef(0)
  const startedAt = useRef<number | null>(null)
  const [rpe, setRpe] = useState<number | null>(null)
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    setStep(0)
    setRunning(false)
    setRemaining(steps[0]?.seconds ?? 0)
    startedAt.current = null
    setMinutes(session?.plannedDurationMin ?? null)
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
  if (!session) return <EmptyState title={t('player.title')} body={t('player.none')} action={<Link to="/plan/block" className="inline-flex min-h-11 items-center text-accent-text underline">{t('player.toBlock')}</Link>} />

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
    completePlannedSession({ blockId: block.id, sessionId: session.id, day: today, durationMin: Math.min(600, Math.max(1, minutes ?? elapsedMin ?? 30)), rpe, kind: diaryKindOf(session.primaryIntent) })
    navigate('/plan/block')
  }

  return (
    <div data-testid="session-player">
      <ScreenHeader eyebrow={t('player.eyebrow')} title={t('player.title')} intro={t('player.intro')} />
      {open.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('player.pick')}>
          {open.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === session.id} onClick={() => setPickedId(s.id)} className={cn('min-h-11 rounded-pill border px-4 text-[13px]', s.id === session.id ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
              {t(`plan.intent.${s.primaryIntent}`)}
            </button>
          ))}
        </div>
      )}
      <Panel className="mb-4">
        <PanelHeader title={t(`plan.intent.${session.primaryIntent}`)} subtitle={t(`plan.rules.${session.ruleId}.title`)} />
        <div className="px-4 pb-4">
          {session.blocks.map((b, i) => (
            <p key={i} className="text-[14px]">{blockText(b, t)}</p>
          ))}
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
          <button type="button" data-testid="player-done" disabled={rpe == null} onClick={done} className="min-h-11 rounded-pill bg-accent px-6 text-[13px] font-semibold text-accent-ink disabled:opacity-45">
            {t('player.save')}
          </button>
        </div>
      </Panel>
    </div>
  )
}
