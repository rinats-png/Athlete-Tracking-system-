import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flag, Pause, Play, X } from 'lucide-react'
import { advanceRun, formatPace, lapRun, normalizeIntervals, paceSPerKm, RUN_LIMITS, startRun, tickRun, type RunIntervalSpec, type RunState } from '@/domain/runTrack'
import { measuredMinutes, workoutElapsedS } from '@/domain/activeWorkout'
import { formatClock } from '@/domain/workoutClock'
import type { HrSummary } from '@/domain/liveHr'
import { useAppData } from '@/lib/store/AppDataProvider'
import { cueDone, cueRest, cueWarn, cueWork, setVoiceEnabled, speak, unlockCues, voiceEnabled } from '@/lib/workoutCues'
import { readActiveWorkout } from '@/lib/activeWorkout'
import { formatNumber } from '@/lib/format'
import { LiveHr } from '@/features/plan/LiveHr'
import { useLocale } from '@/features/shared/useLocale'
import { cn } from '@/lib/utils'
import { useWorkoutSession } from './useWorkoutSession'
import { WorkoutConflict } from './WorkoutConflict'
import { FinishSheet } from './FinishSheet'
import type { SummaryState } from './WorkoutSummaryScreen'

/**
 * Lauf (Mockup «Zeit, Strecke, Tempo, Puls»): frei oder als Intervalle nach
 * Strecke mit Trabpause nach Zeit (`domain/runTrack.ts`).
 *
 * STANDORT nur im Vordergrund und nur auf diesem Gerät: der Browser liefert
 * Punkte, solange die App offen ist (Bildschirm bleibt wach). Gespeichert
 * werden Strecke, Zeit, Runden und Puls — keine Spur, kein einziger Ort.
 * Ohne Standort läuft die Uhr trotzdem; dann fehlt nur die Strecke.
 *
 * Gespeichert als Einheit im Tagebuch (Last) und als Lauf unter «Läufe»
 * (Quelle: KYDON), damit Tempo und Umfang dort erscheinen.
 */
const PATH = '/plan/lauf'

interface RunData {
  intervals: RunIntervalSpec | null
  run: RunState
}

export function RunScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const { data: app, logFreeSession, importActivities } = useAppData()
  const [mode, setMode] = useState<'free' | 'intervals'>('free')
  const [spec, setSpec] = useState<RunIntervalSpec>({ reps: 6, workM: 400, restS: 90 })
  const title = mode === 'intervals' ? t('workout.run.intervalsTitle', { reps: spec.reps, m: spec.workM }) : t('workout.run.freeTitle')
  const run = useWorkoutSession({ kind: 'run', title, path: PATH, autoStart: false })
  const data = (run.workout?.data as RunData | null) ?? null
  const elapsed = run.workout ? workoutElapsedS(run.workout, run.now) : 0
  const paused = run.workout?.pausedAt != null
  const [gps, setGps] = useState<'wait' | 'ok' | 'weak' | 'off'>('wait')
  const [hr, setHr] = useState<HrSummary | null>(null)
  const [voice, setVoice] = useState(voiceEnabled)
  const [finishing, setFinishing] = useState(false)
  const prev = useRef<RunState | null>(null)

  // Standort beobachten, solange die Einheit läuft.
  useEffect(() => {
    if (!run.workout || !('geolocation' in navigator)) {
      if (run.workout) setGps('off')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const cur = readActiveWorkout()
        if (!cur || cur.path !== PATH || cur.pausedAt != null) return
        const d = cur.data as RunData
        const t = workoutElapsedS(cur, Date.now())
        const next = advanceRun(d.run, { t, lat: pos.coords.latitude, lon: pos.coords.longitude, accuracyM: pos.coords.accuracy }, d.intervals)
        setGps(pos.coords.accuracy <= 30 ? 'ok' : 'weak')
        if (next !== d.run) run.setData({ ...d, run: next })
      },
      () => setGps('off'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.workout?.startedAt])

  // Trabpause endet nach Zeit, auch ohne neuen Standortpunkt.
  useEffect(() => {
    if (!data || paused || !data.intervals || data.run.phase !== 'rest') return
    const next = tickRun(data.run, elapsed, data.intervals)
    if (next.phase !== data.run.phase) run.setData({ ...data, run: next })
  })

  // Signale beim Wechsel von Arbeit, Pause und Ende; «noch 100 m».
  useEffect(() => {
    if (!data) return
    const before = prev.current
    prev.current = data.run
    if (!before || !data.intervals) return
    const spec = normalizeIntervals(data.intervals)
    if (before.phase !== data.run.phase) {
      if (data.run.phase === 'rest') {
        cueRest()
        speak(t('workout.run.say.rest', { n: data.run.rep }), locale)
      } else if (data.run.phase === 'work') {
        cueWork()
        speak(t('workout.run.say.work', { n: data.run.rep }), locale)
      } else if (data.run.phase === 'done') {
        cueDone()
        speak(t('workout.run.say.done'), locale)
      }
    } else if (data.run.phase === 'work') {
      const leftBefore = spec.workM - (before.distanceM - before.segStartM)
      const left = spec.workM - (data.run.distanceM - data.run.segStartM)
      if (leftBefore > 100 && left <= 100 && spec.workM > 150) {
        cueWarn()
        speak(t('workout.run.say.last100'), locale)
      }
    }
  })

  const start = () => {
    unlockCues()
    const intervals = mode === 'intervals' ? normalizeIntervals(spec) : null
    run.start({ intervals, run: startRun(intervals) } satisfies RunData)
  }
  const resume = () => {
    // Nach der Pause neu ansetzen: die Strecke, die ohne Uhr zurückgelegt wurde, zählt nicht.
    if (data) run.setData({ ...data, run: { ...data.run, last: null } })
    run.resume()
  }
  const save = (rpe: number) => {
    if (!run.workout || !data) return
    const now = Date.now()
    const durationMin = measuredMinutes(run.workout, now)
    const moving = Math.round(workoutElapsedS(run.workout, now))
    const day = new Date().toISOString().slice(0, 10)
    const startedAt = new Date(run.workout.startedAt).toISOString()
    logFreeSession({ day, title: run.workout.title, durationMin, rpe, kind: 'endurance' })
    if (data.run.distanceM >= 10) {
      importActivities([{ id: `kydon-run-${run.workout.startedAt}`, source: 'other', startedAt, day, hour: new Date(run.workout.startedAt).getHours(), sport: 'run', name: run.workout.title, distanceM: Math.round(data.run.distanceM), movingS: moving, elapsedS: Math.round((now - run.workout.startedAt) / 1000), avgHr: hr?.avg ?? null, maxHr: hr?.max ?? null, elevM: null, gear: null, calories: null, cadence: null }])
    }
    run.clear()
    const s: SummaryState = { title: run.workout.title, kind: 'run', durationMin, rpe, hr: hr ? { avg: hr.avg, max: hr.max } : null, summary: null, distanceM: data.run.distanceM >= 10 ? data.run.distanceM : null, rounds: null, splits: data.run.splits, back: '/plan' }
    navigate('/plan/fertig', { state: s })
  }

  // --- Einstellen ---------------------------------------------------------------
  if (!run.workout || !data) {
    const field = (k: keyof RunIntervalSpec, label: string) => (
      <label className="block text-[13px]">
        <span className="label-tag">{label}</span>
        <input type="number" inputMode="numeric" min={RUN_LIMITS[k].min} max={RUN_LIMITS[k].max} value={spec[k]} onChange={(e) => setSpec((s) => ({ ...s, [k]: Number(e.target.value) }))} data-testid={`run-${k}`} className="mt-1.5 block min-h-12 w-full rounded-md border border-line bg-surface px-3 text-[18px]" />
      </label>
    )
    return (
      <div data-testid="run-setup">
        <Link to="/plan" className="mb-2 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text"><X size={16} aria-hidden />{t('workout.close')}</Link>
        <h1 className="font-display text-[34px] leading-none font-bold">{t('workout.run.title')}</h1>
        <p className="mt-1 text-[14px] text-ink-secondary">{t('workout.run.intro')}</p>
        {run.conflict && <div className="mt-4"><WorkoutConflict other={run.conflict} onReplace={start} /></div>}
        <div className="mt-4 flex gap-2" role="group" aria-label={t('workout.run.mode')}>
          {(['free', 'intervals'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={m === mode} onClick={() => setMode(m)} data-testid={`run-mode-${m}`} className={cn('min-h-11 flex-1 rounded-pill border px-4 text-[14px]', m === mode ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface')}>
              {t(`workout.run.mode_${m}`)}
            </button>
          ))}
        </div>
        {mode === 'intervals' && (
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-surface p-4">
            {field('reps', t('workout.run.reps'))}
            {field('workM', t('workout.run.workM'))}
            {field('restS', t('workout.run.restS'))}
          </div>
        )}
        <p className="mt-3 text-[13px] text-ink-secondary">{t('workout.run.privacy')}</p>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-[14px]">
          <input type="checkbox" checked={voice} onChange={(e) => { setVoice(e.target.checked); setVoiceEnabled(e.target.checked) }} className="size-5" />
          {t('workout.voice')}
        </label>
        <div className="sticky bottom-[calc(var(--bottom-nav-h,0px)+env(safe-area-inset-bottom)+0.75rem)] z-[55] mt-6">
          <button type="button" onClick={start} disabled={!!run.conflict} data-testid="run-start" className="flex min-h-16 w-full items-center justify-center gap-2 rounded-pill bg-accent text-[19px] font-semibold text-accent-ink disabled:opacity-45">
            <Play size={20} aria-hidden />{t('workout.start')}
          </button>
        </div>
      </div>
    )
  }

  // --- Läuft -----------------------------------------------------------------------
  const spec2 = data.intervals ? normalizeIntervals(data.intervals) : null
  const r = data.run
  const segM = r.distanceM - r.segStartM
  const segS = Math.max(0, elapsed - r.segStartT)
  const big = r.phase === 'rest' && spec2 ? Math.max(0, spec2.restS - segS) : r.phase === 'free' ? elapsed : segS
  const label = r.phase === 'free' ? t('workout.run.freeLabel') : r.phase === 'rest' ? t('workout.run.restLabel', { n: r.rep }) : r.phase === 'done' ? t('workout.run.doneLabel') : t('workout.run.workLabel', { n: r.rep, of: spec2?.reps ?? 1 })
  const progress = r.phase === 'work' && spec2 ? Math.min(1, segM / spec2.workM) : null
  const km = (m: number) => formatNumber(m / 1000, locale, 2)

  return (
    <div data-testid="run-active" data-phase={r.phase} className="scope-dark -mx-4 -mt-5 min-h-dvh bg-plane px-4 pt-4 pb-40 text-ink sm:mx-0 sm:mt-0 sm:rounded-2xl">
      <div className="flex items-center justify-between gap-2">
        <Link to="/plan" aria-label={t('workout.minimize')} className="grid size-11 place-items-center rounded-full border border-line"><X size={18} aria-hidden /></Link>
        <span className="label-tag">{run.workout.title}</span>
        <span className={cn('label-tag', gps === 'ok' ? '!text-accent-text' : gps === 'off' ? '!text-warning' : '')} data-testid="run-gps">{t(`workout.run.gps_${gps}`)}</span>
      </div>
      <div className={cn('mt-4 rounded-3xl px-5 pt-4 pb-4', r.phase === 'rest' ? 'border border-line bg-surface' : 'bg-[#1E7D63] text-white')}>
        <div className="flex justify-between gap-2"><span className="label-tag !text-current opacity-80">{label}</span>{r.phase === 'work' && spec2 && <span className="label-tag !text-current opacity-80">{spec2.workM} m</span>}</div>
        <p className="readout font-display text-[clamp(84px,30vw,128px)] leading-none font-bold" data-testid="run-time">{formatClock(big)}</p>
        {progress != null && (
          <>
            <div className="mt-2 h-2.5 overflow-hidden rounded-pill bg-white/25"><div className="h-full bg-white" style={{ width: `${progress * 100}%` }} /></div>
            <div className="mt-1.5 flex justify-between text-[13px] opacity-85"><span>{Math.round(segM)} m</span><span>{t('workout.run.left', { m: Math.max(0, Math.round((spec2?.workM ?? 0) - segM)) })}</span></div>
          </>
        )}
        {paused && <p className="mt-2 text-[15px] font-semibold">{t('workout.paused')}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Tile label={t('workout.run.pace')} value={`${formatPace(paceSPerKm(r.phase === 'free' ? r.distanceM : segM, r.phase === 'free' ? elapsed : segS))}`} unit="/km" testId="run-pace" />
        <Tile label={t('workout.run.distance')} value={gps === 'off' && r.distanceM === 0 ? '–' : km(r.distanceM)} unit="km" testId="run-distance" />
        <Tile label={t('workout.run.total')} value={formatClock(elapsed)} testId="run-total" />
        <Tile label={t('workout.run.splitsN')} value={String(r.splits.length)} testId="run-splits-n" />
      </div>
      {r.splits.length > 0 && (
        <ul className="mt-3 text-[13px]" data-testid="run-splits">
          {r.splits.slice(-4).map((x, i) => (
            <li key={i} className="flex justify-between border-t border-line py-2">
              <span>{x.index} · {Math.round(x.distanceM)} m</span>
              <span className="readout text-ink-secondary">{formatClock(x.seconds)} · {formatPace(paceSPerKm(x.distanceM, x.seconds))} /km</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4"><LiveHr hrMax={app.profile.maxHr} target={null} running={!paused} onSummary={setHr} /></div>

      <div className="fixed inset-x-4 bottom-[calc(var(--bottom-nav-h,0px)+env(safe-area-inset-bottom)+0.75rem)] z-[55] mx-auto grid max-w-xl grid-cols-[1fr_1.4fr] gap-2.5">
        <button type="button" onClick={() => (paused ? resume() : run.pause())} data-testid="run-pause" className="flex min-h-16 items-center justify-center gap-2 rounded-pill border border-line bg-plane text-[17px] font-semibold">
          {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}{paused ? t('workout.resume') : t('workout.pause')}
        </button>
        {paused || r.phase === 'done' || r.phase !== 'free' ? (
          <button type="button" onClick={() => setFinishing(true)} data-testid="run-finish" className="min-h-16 rounded-pill bg-accent text-[17px] font-semibold text-accent-ink">{t('workout.finish')}</button>
        ) : (
          <button type="button" onClick={() => run.setData({ ...data, run: lapRun(r, elapsed) })} data-testid="run-lap" className="flex min-h-16 items-center justify-center gap-2 rounded-pill bg-accent text-[17px] font-semibold text-accent-ink"><Flag size={18} aria-hidden />{t('workout.run.lap')}</button>
        )}
      </div>
      {r.phase === 'free' && !paused && <p className="mt-3 text-center text-[12px] text-ink-muted">{t('workout.run.finishHint')}</p>}
      {finishing && <FinishSheet onSave={save} onDiscard={() => { run.clear(); navigate('/plan') }} onCancel={() => setFinishing(false)} />}
    </div>
  )
}

function Tile({ label, value, unit, testId }: { label: string; value: string; unit?: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3" data-testid={testId}>
      <p className="label-tag">{label}</p>
      <p className="readout mt-1 font-display text-[36px] leading-none font-bold">{value}{unit && <span className="ml-1 text-[16px] text-ink-secondary">{unit}</span>}</p>
    </div>
  )
}

export default RunScreen
