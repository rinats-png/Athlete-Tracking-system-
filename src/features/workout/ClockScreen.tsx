import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pause, Play, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import { CLOCK_LIMITS, CLOCK_PRESETS, clockAt, clockCues, clockPhases, formatClock, normalizeClock, type ClockSpec, type ClockState } from '@/domain/workoutClock'
import { workoutElapsedS, measuredMinutes } from '@/domain/activeWorkout'
import { planMode } from '@/domain/planMode'
import { useAppData } from '@/lib/store/AppDataProvider'
import { cueCount, cueDone, cueRest, cueWarn, cueWork, setVoiceEnabled, speak, unlockCues, voiceEnabled } from '@/lib/workoutCues'
import { useLocale } from '@/features/shared/useLocale'
import { cn } from '@/lib/utils'
import { useWorkoutSession } from './useWorkoutSession'
import { WorkoutConflict } from './WorkoutConflict'
import { FinishSheet } from './FinishSheet'
import { PunchCounter } from './PunchCounter'
import type { SummaryState } from './WorkoutSummaryScreen'

/**
 * Rundenuhr (Mockup «Rundenuhr im Querformat lesbar»): ein Motor für Runden,
 * Tabata, EMOM, AMRAP und Intervalle (`domain/workoutClock.ts`).
 *
 * Die Farbe sagt die Phase, ohne hinzusehen: grün Arbeit, dunkel Pause, gelb
 * die letzten Sekunden einer Runde. Dazu Ton, Vibration und Ansage
 * («Runde acht», «Letzte zehn Sekunden»). Die Uhr rechnet gegen die Wanduhr:
 * nach Neuladen oder im Hintergrund stimmt sie weiter. Bildschirm bleibt an.
 *
 * Schläge zählen per Mikrofon nur im Vorschaubau und als «Schätzung».
 */
type Preset = keyof typeof CLOCK_PRESETS
const PRESETS: Preset[] = ['boxing', 'mma', 'grappling', 'tabata', 'emom', 'amrap', 'intervals']
const PATH = '/plan/uhr'

interface ClockData {
  spec: ClockSpec
  preset: Preset
  amrapRounds: number
  punches: number[]
}

const phaseBg = (s: ClockState | null) =>
  !s || s.done ? 'bg-[#0B100E]' : s.warn ? 'bg-[#3A2A0E]' : s.phase?.kind === 'work' ? 'bg-[#145A47]' : s.phase?.kind === 'rest' ? 'bg-[#0B100E]' : 'bg-[#111C24]'

export function ClockScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const { logFreeSession } = useAppData()
  const [preset, setPreset] = useState<Preset>('boxing')
  const [spec, setSpec] = useState<ClockSpec>(CLOCK_PRESETS.boxing)
  const title = t(`workout.clock.preset.${preset}`)
  const run = useWorkoutSession({ kind: 'clock', title, path: PATH, autoStart: false })
  const data = (run.workout?.data as ClockData | null) ?? null
  const active = data ? normalizeClock(data.spec) : null
  const elapsed = run.workout ? workoutElapsedS(run.workout, run.now) : 0
  const state = active ? clockAt(active, elapsed) : null
  const prev = useRef<ClockState | null>(null)
  const [voice, setVoice] = useState(voiceEnabled)
  const [finishing, setFinishing] = useState(false)

  // Signale beim Übergang zwischen zwei Anzeigen.
  useEffect(() => {
    if (!state || !active) return
    const before = prev.current
    prev.current = state
    if (!before || run.workout?.pausedAt != null) return
    for (const cue of clockCues(before, state)) {
      if (cue.kind === 'count') cueCount()
      if (cue.kind === 'warn') {
        cueWarn()
        speak(t('workout.clock.say.warn', { count: active.warnS }), locale)
      }
      if (cue.kind === 'phase' && cue.phase === 'work') {
        cueWork()
        speak(active.kind === 'amrap' ? t('workout.clock.say.go') : t('workout.clock.say.round', { n: cue.round }), locale)
      }
      if (cue.kind === 'phase' && cue.phase === 'rest') {
        cueRest()
        speak(t('workout.clock.say.rest'), locale)
      }
      if (cue.kind === 'done') {
        cueDone()
        speak(t('workout.clock.say.done'), locale)
      }
    }
  })

  const start = () => {
    unlockCues()
    run.start({ spec: normalizeClock(spec), preset, amrapRounds: 0, punches: [] } satisfies ClockData)
  }
  const setField = (k: keyof typeof CLOCK_LIMITS, v: number) => setSpec((s) => ({ ...s, [k]: v }))
  const pick = (p: Preset) => {
    setPreset(p)
    setSpec(CLOCK_PRESETS[p])
  }
  const skip = () => {
    // Zum Ende der laufenden Phase springen: den Start um die Restzeit vorziehen.
    if (state?.phase) run.shiftStart(state.remainingS * 1000)
  }
  const save = (rpe: number) => {
    if (!run.workout || !active) return
    const durationMin = measuredMinutes(run.workout, Date.now())
    const rounds = active.kind === 'amrap' ? (data?.amrapRounds ?? 0) : Math.max(0, state?.done ? active.rounds : (state?.round ?? 1) - (state?.phase?.kind === 'work' ? 1 : 0))
    logFreeSession({ day: new Date().toISOString().slice(0, 10), title: run.workout.title, durationMin, rpe, kind: 'endurance' })
    run.clear()
    const s: SummaryState = { title: run.workout.title, kind: 'clock', durationMin, rpe, hr: null, summary: null, distanceM: null, rounds, back: '/plan' }
    navigate('/plan/fertig', { state: s })
  }

  // --- Einstellen ---------------------------------------------------------------
  if (!run.workout) {
    const total = clockPhases(spec).reduce((s, p) => s + p.durationS, 0)
    const num = (k: keyof typeof CLOCK_LIMITS, label: string, seconds: boolean) => (
      <label className="block text-[13px]">
        <span className="label-tag">{label}</span>
        <input
          type="number"
          inputMode="numeric"
          min={CLOCK_LIMITS[k].min}
          max={CLOCK_LIMITS[k].max}
          value={spec[k]}
          onChange={(e) => setField(k, Number(e.target.value))}
          data-testid={`clock-${k}`}
          className="mt-1.5 block min-h-12 w-full rounded-md border border-line bg-surface px-3 text-[18px]"
        />
        {seconds && <span className="mt-1 block text-[12px] text-ink-muted">{formatClock(spec[k])}</span>}
      </label>
    )
    return (
      <div data-testid="clock-setup">
        <Link to="/plan" className="mb-2 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text"><X size={16} aria-hidden />{t('workout.close')}</Link>
        <h1 className="font-display text-[34px] leading-none font-bold">{t('workout.clock.title')}</h1>
        <p className="mt-1 text-[14px] text-ink-secondary">{t('workout.clock.intro')}</p>
        {run.conflict && <div className="mt-4"><WorkoutConflict other={run.conflict} onReplace={start} /></div>}
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('workout.clock.presets')}>
          {PRESETS.map((p) => (
            <button key={p} type="button" aria-pressed={p === preset} onClick={() => pick(p)} data-testid={`clock-preset-${p}`} className={cn('min-h-11 rounded-pill border px-4 text-[14px]', p === preset ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface')}>
              {t(`workout.clock.preset.${p}`)}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4">
          {num('workS', t(spec.kind === 'amrap' ? 'workout.clock.total' : 'workout.clock.work'), true)}
          {spec.kind !== 'amrap' && spec.kind !== 'emom' && num('restS', t('workout.clock.rest'), true)}
          {spec.kind !== 'amrap' && num('rounds', t('workout.clock.rounds'), false)}
          {num('warnS', t('workout.clock.warn'), false)}
        </div>
        <p className="mt-3 text-[13px] text-ink-secondary">{t('workout.clock.totalTime', { time: formatClock(total) })}</p>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-[14px]">
          <input type="checkbox" checked={voice} onChange={(e) => { setVoice(e.target.checked); setVoiceEnabled(e.target.checked) }} className="size-5" data-testid="clock-voice" />
          {t('workout.voice')}
        </label>
        <div className="sticky bottom-[calc(var(--bottom-nav-h,0px)+env(safe-area-inset-bottom)+0.75rem)] z-[55] mt-6">
          <button type="button" onClick={start} disabled={!!run.conflict} data-testid="clock-start" className="flex min-h-16 w-full items-center justify-center gap-2 rounded-pill bg-accent text-[19px] font-semibold text-accent-ink disabled:opacity-45">
            <Play size={20} aria-hidden />{t('workout.start')}
          </button>
        </div>
      </div>
    )
  }

  // --- Läuft -----------------------------------------------------------------------
  const paused = run.workout.pausedAt != null
  const phaseLabel = !state || state.done ? t('workout.clock.done') : state.phase?.kind === 'prep' ? t('workout.clock.prep') : state.phase?.kind === 'rest' ? t('workout.clock.restPhase') : active?.kind === 'amrap' ? t('workout.clock.amrapLabel') : t('workout.clock.round', { n: state.round })
  return (
    <div data-testid="clock-run" data-phase={state?.done ? 'done' : state?.warn ? 'warn' : state?.phase?.kind} className={cn('fixed inset-0 z-[60] flex flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#E9EFEB] transition-colors', phaseBg(state))}>
      <div className="flex items-center justify-between gap-2">
        <Link to="/plan" aria-label={t('workout.minimize')} className="grid size-11 place-items-center rounded-full bg-black/25"><X size={20} aria-hidden /></Link>
        <span className="label-tag !text-[#F7D99A]">{run.workout.title}</span>
        <button type="button" aria-label={t('workout.voice')} aria-pressed={voice} onClick={() => { setVoice(!voice); setVoiceEnabled(!voice) }} className="grid size-11 place-items-center rounded-full bg-black/25">{voice ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}</button>
      </div>
      {active && active.kind !== 'amrap' && (
        <div className="mt-3 flex gap-1" aria-hidden>
          {Array.from({ length: active.rounds }, (_, i) => i + 1).map((r) => (
            <span key={r} className={cn('h-1.5 flex-1 rounded-pill', state && (state.done || r < state.round) ? 'bg-[#7FE5B5]' : state && r === state.round && state.phase?.kind !== 'prep' ? 'bg-[#F2C46D]' : 'bg-white/15')} />
          ))}
        </div>
      )}
      <div className="my-auto text-center">
        <p className="font-display text-[clamp(30px,9vw,44px)] leading-none font-bold text-[#F7D99A]" data-testid="clock-phase">{phaseLabel}</p>
        <p className="readout font-display text-[clamp(110px,40vw,220px)] leading-none font-bold tracking-tight landscape:text-[clamp(110px,30vh,260px)]" data-testid="clock-time" aria-live="off">
          {formatClock(state?.done ? 0 : (state?.remainingS ?? 0))}
        </p>
        {state?.warn && <p className="text-[20px] font-semibold text-[#F2C46D]">{t('workout.clock.lastSeconds', { count: active?.warnS ?? 10 })}</p>}
        {paused && <p className="mt-2 text-[16px] font-semibold" data-testid="clock-paused">{t('workout.paused')}</p>}
        <p className="mt-2 text-[13px] text-white/70">{t('workout.clock.elapsed', { time: formatClock(elapsed) })}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {active?.kind === 'amrap' && (
          <button type="button" onClick={() => data && run.setData({ ...data, amrapRounds: data.amrapRounds + 1 })} data-testid="clock-amrap-round" className="col-span-2 min-h-16 rounded-2xl bg-white/10 text-[18px] font-semibold">
            {t('workout.clock.amrapTap', { n: data?.amrapRounds ?? 0 })}
          </button>
        )}
        {planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'preview' && data && <PunchCounter running={!paused && !state?.done && state?.phase?.kind === 'work'} round={state?.round ?? 0} counts={data.punches} onCount={(round, n) => { const punches = [...data.punches]; punches[round] = n; run.setData({ ...data, punches }) }} />}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {state?.done ? (
          <button type="button" onClick={() => setFinishing(true)} data-testid="clock-finish" className="col-span-2 min-h-16 rounded-pill bg-[#7FE5B5] text-[18px] font-semibold text-[#08231A]">{t('workout.finish')}</button>
        ) : (
          <>
            <button type="button" onClick={() => (paused ? run.resume() : run.pause())} data-testid="clock-pause" className="flex min-h-16 items-center justify-center gap-2 rounded-pill border border-white/25 text-[17px] font-semibold">
              {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}{paused ? t('workout.resume') : t('workout.pause')}
            </button>
            {paused ? (
              <button type="button" onClick={() => setFinishing(true)} data-testid="clock-finish" className="min-h-16 rounded-pill bg-[#7FE5B5] text-[17px] font-semibold text-[#08231A]">{t('workout.finish')}</button>
            ) : (
              <button type="button" onClick={skip} data-testid="clock-skip" className="flex min-h-16 items-center justify-center gap-2 rounded-pill border border-white/25 text-[17px] font-semibold"><SkipForward size={18} aria-hidden />{t('workout.clock.skip')}</button>
            )}
          </>
        )}
      </div>
      {finishing && <FinishSheet onSave={save} onDiscard={() => { run.clear(); navigate('/plan') }} onCancel={() => setFinishing(false)} />}
    </div>
  )
}

export default ClockScreen
