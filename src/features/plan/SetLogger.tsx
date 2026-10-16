import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Check, Minus, Plus, Repeat2, X } from 'lucide-react'
import { firstNumber, setFieldsFor, substituteOptions, type SetField } from '@/domain/library'
import { lastSetsFor, type SetLogEntry } from '@/domain/setLog'
import type { LibraryExercise } from '@/domain/libraryTypes'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'
import { ComplexityDot } from '@/features/library/bits'
import { blockText } from '@/features/plan/planText'
import { cn } from '@/lib/utils'
import { libraryExerciseImage } from '@/data/visuals'
import { patternForExercise } from '@/domain/repCounter'
import { RestRing } from '@/features/workout/RestRing'
import { cueCount, cueDone } from '@/lib/workoutCues'

// Die Kameraerkennung (MediaPipe) wird erst geladen, wenn jemand sie öffnet.
const CameraCounter = lazy(() => import('@/features/workout/CameraCounter'))

/**
 * Satz-Log und Ersatz im Session Player.
 *
 * Je Übung der Einheit eine Zeile pro Satz; welche Felder sie hat, sagt der
 * Parametervertrag der Übung (höchstens drei). Ein Satz zählt, wenn er
 * abgehakt ist — vorbefüllte Zahlen allein sind kein Training. Nach dem Haken
 * läuft die Pause aus dem Plan.
 *
 * Ersatz: erst die Ersatzübungen des Plans, dann gleiches Bewegungsmuster
 * (`substituteOptions`). Dosis und Regel der Position bleiben. Standard ist
 * «nur heute»; wer will, übernimmt den Tausch für die folgenden Einheiten.
 *
 * FOKUS (Mockup «Satz für Satz, mit einer Hand»): oben steht immer der nächste
 * offene Satz mit grossen ±-Feldern und einem Knopf «Satz fertig»; die Liste
 * darunter bleibt zum Nachtragen und Korrigieren. Die Pause läuft als Ring
 * über den ganzen Bildschirm, mit ±15 s und Ton bei 3-2-1 und am Ende.
 * Übungen mit zählbarem Bewegungsmuster bieten «Kamera zählt» an.
 *
 * Fortsetzen: der Zustand (Zeilen, Tausch, Pausenende) geht über `onChange`
 * an den Player, der ihn als laufende Einheit sichert, und kommt über
 * `initial` zurück.
 */

type Part = StoredPlannedSession['blocks'][number]
export interface Swap {
  part: number
  from: string
  fromName: string
  to: string
  toName: string
  keep: boolean
}
export interface Row {
  done: boolean
  values: Partial<Record<SetField, number | null>>
}

export interface SetLoggerState {
  rows: Record<number, Row[]>
  swaps: Swap[]
  restEnd: number | null
  restTotal: number
}

/** Die zwei Felder, die der Fokus gross zeigt (das dritte bleibt in der Liste). */
const focusFields = (fields: SetField[]): SetField[] => {
  const order: SetField[] = ['weightKg', 'reps', 'durationS', 'distanceM', 'rir', 'rpe']
  return order.filter((f) => fields.includes(f)).slice(0, 2)
}

const LEGACY_FIELDS: SetField[] = ['weightKg', 'reps', 'rir']
/** Pause, wenn der Plan keine nennt (freies Training): änderbar mit ±15 s. */
const DEFAULT_REST_S = 90

const loggable = (p: Part) => p.type === 'library_exercise' || p.type === 'strength' || p.type === 'exercise'
const plannedSets = (p: Part) => (p.type === 'library_exercise' || p.type === 'strength' || p.type === 'exercise' ? (p.sets ?? 1) : 1)
const plannedReps = (p: Part): string | null => (p.type === 'library_exercise' ? p.reps : p.type === 'strength' || p.type === 'exercise' ? (p.reps != null ? String(p.reps) : null) : null)
const restOf = (p: Part) => (p.type === 'library_exercise' ? p.restS : null)

function seed(p: Part, fields: SetField[], last: SetLogEntry[] | undefined): Row[] {
  const reps = plannedReps(p)
  const n = firstNumber(reps)
  const timeUnit = reps != null && /\d\s*(s|sek|sec|min)\b/i.test(reps)
  return Array.from({ length: Math.min(20, plannedSets(p)) }, (_, i) => {
    const prev = last?.find((s) => s.set === i + 1) ?? last?.[last.length - 1]
    const values: Row['values'] = {}
    for (const f of fields) {
      if (f === 'reps') values.reps = timeUnit ? null : n
      else if (f === 'durationS') values.durationS = timeUnit && n != null ? (/min/i.test(reps ?? '') ? n * 60 : n) : null
      else if (f === 'weightKg') values.weightKg = prev?.weightKg ?? null
      else if (f === 'rpe') values.rpe = p.type === 'library_exercise' ? p.rpe : null
      else values[f] = null
    }
    return { done: false, values }
  })
}

/** Schritt der ±-Knöpfe im Fokus. */
const STEP: Record<SetField, number> = { weightKg: 2.5, reps: 1, rir: 1, rpe: 0.5, durationS: 5, distanceM: 10 }

const LIMITS: Record<SetField, { min: number; max: number; step: number }> = {
  weightKg: { min: 0, max: 1000, step: 0.5 },
  reps: { min: 0, max: 300, step: 1 },
  rir: { min: 0, max: 10, step: 1 },
  rpe: { min: 1, max: 10, step: 0.5 },
  durationS: { min: 0, max: 36000, step: 1 },
  distanceM: { min: 0, max: 100000, step: 1 },
}

export function SetLogger({ session, exercises, planSubs, blocks, onChange, canKeep = true, initial = null, autoCamera = false }: {
  session: StoredPlannedSession
  /** Übungsdatenbank; `null`, solange sie lädt (dann gelten Standardfelder, Ersatz wartet). */
  exercises: LibraryExercise[] | null
  planSubs: Record<string, string[]>
  blocks: StoredTrainingBlock[]
  onChange: (state: { sets: SetLogEntry[]; swaps: Swap[]; logger: SetLoggerState }) => void
  /** «Auch künftig tauschen» anbieten — nicht bei freiem Training, dort gibt es keinen Plan. */
  canKeep?: boolean
  /** Gesicherter Zwischenstand einer laufenden Einheit (Fortsetzen nach Neuladen). */
  initial?: SetLoggerState | null
  /** Kamera gleich öffnen (Schnellstart «Kamera»). */
  autoCamera?: boolean
}) {
  const { t } = useTranslation()
  const [swaps, setSwaps] = useState<Swap[]>(initial?.swaps ?? [])
  const [rows, setRows] = useState<Record<number, Row[]>>(initial?.rows ?? {})
  const [picking, setPicking] = useState<number | null>(null)
  const [restEnd, setRestEnd] = useState<number | null>(initial?.restEnd != null && initial.restEnd > Date.now() ? initial.restEnd : null)
  const [restTotal, setRestTotal] = useState(initial?.restTotal ?? 0)
  const [now, setNow] = useState(() => Date.now())
  const [camera, setCamera] = useState(autoCamera)
  const restored = useRef(initial != null && Object.keys(initial.rows).length > 0)

  const byId = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises])
  const parts = session.blocks.map((p, i) => ({ p, i })).filter(({ p }) => loggable(p))

  const current = (i: number, p: Part): { id: string | null; name: string } => {
    const sw = swaps.find((s) => s.part === i)
    if (sw) return { id: sw.to, name: sw.toName }
    if (p.type === 'library_exercise') return { id: p.exerciseId, name: p.name }
    if (p.type === 'exercise') return { id: null, name: p.name }
    return { id: null, name: blockText(p, t) }
  }
  const fieldsOf = (i: number, p: Part): SetField[] => {
    const id = current(i, p).id
    const e = id ? byId.get(id) : undefined
    return e ? setFieldsFor(e.parameters) : p.type === 'library_exercise' ? ['weightKg', 'reps', 'rpe'] : LEGACY_FIELDS
  }

  // Neue Einheit oder getauschte Übung: Zeilen neu anlegen (mit dem, was beim letzten Mal war).
  // Dieselbe Übung behält ihre Zeilen — auch wenn die Übungsdatenbank erst
  // später lädt und sich damit die Felder ändern. Sonst gingen erledigte
  // Sätze verloren (und ein gesicherter Stand beim Fortsetzen).
  const seededFor = useRef<{ session: string; ids: Record<number, string | null> } | null>(restored.current ? { session: session.id, ids: Object.fromEntries(parts.map(({ p, i }) => [i, current(i, p).id])) } : null)
  const key = parts.map(({ p, i }) => `${i}:${current(i, p).id}:${fieldsOf(i, p).join(',')}`).join('|')
  useEffect(() => {
    const before = seededFor.current?.session === session.id ? seededFor.current.ids : null
    const ids: Record<number, string | null> = {}
    setRows((old) => {
      const next: Record<number, Row[]> = {}
      for (const { p, i } of parts) {
        const id = current(i, p).id
        ids[i] = id
        next[i] = before && before[i] === id && old[i] ? old[i] : seed(p, fieldsOf(i, p), id ? lastSetsFor(id, blocks)?.sets : undefined)
      }
      return next
    })
    seededFor.current = { session: session.id, ids }
    restored.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, key])

  useEffect(() => {
    const sets: SetLogEntry[] = []
    for (const { p, i } of parts) {
      const c = current(i, p)
      ;(rows[i] ?? []).forEach((r, n) => {
        if (!r.done) return
        sets.push({ part: i, exerciseId: c.id, name: c.name.slice(0, 120) || '—', set: n + 1, reps: r.values.reps ?? null, weightKg: r.values.weightKg ?? null, rir: r.values.rir ?? null, rpe: r.values.rpe ?? null, durationS: r.values.durationS ?? null, distanceM: r.values.distanceM ?? null })
      })
    }
    onChange({ sets, swaps, logger: { rows, swaps, restEnd, restTotal } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, swaps, restEnd, restTotal])

  const beeped = useRef<number | null>(null)
  useEffect(() => {
    if (restEnd == null) return
    const id = setInterval(() => {
      const n = Date.now()
      setNow(n)
      const left = Math.ceil((restEnd - n) / 1000)
      // 3-2-1 als kurzer Ton, am Ende ein deutliches Signal (auch ohne Vibration auf iOS).
      if (left >= 1 && left <= 3 && beeped.current !== left) {
        beeped.current = left
        cueCount()
      }
      if (n >= restEnd) {
        beeped.current = null
        setRestEnd(null)
        cueDone()
      }
    }, 200)
    return () => clearInterval(id)
  }, [restEnd])

  if (parts.length === 0) return null

  const setValue = (i: number, n: number, f: SetField, v: string) =>
    setRows((r) => ({ ...r, [i]: r[i].map((row, k) => (k === n ? { ...row, values: { ...row.values, [f]: v === '' ? null : Math.min(LIMITS[f].max, Math.max(LIMITS[f].min, Number(v))) } } : row)) }))
  /**
   * Haken setzen oder lösen. Die Pause startet nur aus dem Fokus («Satz
   * fertig»): die Liste ist zum Nachtragen da, und wer nachträgt, will keinen
   * Ring vor den übrigen Zeilen.
   */
  const tick = (i: number, n: number, p: Part, startRest = false) => {
    const was = rows[i]?.[n]?.done
    setRows((r) => ({ ...r, [i]: r[i].map((row, k) => (k === n ? { ...row, done: !row.done } : row)) }))
    const rest = restOf(p) ?? DEFAULT_REST_S
    if (startRest && !was && rest) {
      setNow(Date.now())
      setRestTotal(rest)
      setRestEnd(Date.now() + rest * 1000)
    }
  }
  const addSet = (i: number) => setRows((r) => {
    const list = r[i] ?? []
    if (list.length >= 20) return r
    const last = list[list.length - 1]
    return { ...r, [i]: [...list, { done: false, values: { ...(last?.values ?? {}) } }] }
  })
  const pick = (i: number, p: Part, e: LibraryExercise) => {
    if (p.type !== 'library_exercise') return
    setSwaps((s) => [...s.filter((x) => x.part !== i), ...(e.id === p.exerciseId ? [] : [{ part: i, from: p.exerciseId, fromName: p.name, to: e.id, toName: e.name, keep: false }])])
    setPicking(null)
  }
  const restLeft = restEnd != null ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0
  const doneCount = Object.values(rows).flat().filter((r) => r.done).length

  // Der nächste offene Satz: erste Übung mit offenem Satz, dort der erste offene.
  const focus = (() => {
    for (const [k, { p, i }] of parts.entries()) {
      const list = rows[i] ?? []
      const n = list.findIndex((r) => !r.done)
      if (n < 0) continue
      const c = current(i, p)
      const fields = focusFields(fieldsOf(i, p))
      const ex = c.id ? byId.get(c.id) : undefined
      const last = c.id ? lastSetsFor(c.id, blocks) : null
      const lastSet = last?.sets.find((x) => x.set === n + 1) ?? last?.sets.at(-1)
      const reps = plannedReps(p)
      const values = list[n].values
      return {
        p,
        i,
        n,
        of: list.length,
        order: k + 1,
        name: c.name,
        fields,
        image: c.id ? libraryExerciseImage(c.id) : null,
        target: [reps, p.type === 'library_exercise' && p.rpe != null ? `RPE ${p.rpe}` : null].filter(Boolean).join(' · ') || null,
        targetReps: firstNumber(reps),
        summary: [values.weightKg != null ? `${values.weightKg} kg` : null, values.reps != null ? `× ${values.reps}` : null].filter(Boolean).join(' '),
        last: lastSet ? t('workout.focus.last', { value: [lastSet.weightKg != null ? `${lastSet.weightKg} kg` : '', lastSet.reps != null ? `× ${lastSet.reps}` : '', lastSet.durationS != null ? `${lastSet.durationS} s` : ''].filter(Boolean).join(' ') }) : null,
        countable: fieldsOf(i, p).includes('reps') ? patternForExercise(ex?.patterns) : null,
        swappable: p.type === 'library_exercise' && exercises != null,
      }
    }
    return null
  })()

  return (
    <section className="mt-4" data-testid="set-logger" aria-label={t('setlog.title')}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[16px] font-bold">{t('setlog.title')}</h3>
        <span className="text-[12px] text-ink-secondary" data-testid="setlog-count">{t('setlog.count', { n: doneCount })}</span>
      </div>
      <p className="mb-3 text-[12px] text-ink-secondary">{t('setlog.note')}</p>
      {focus ? (
        <div data-testid="setlog-focus" className="mb-4 rounded-2xl border border-line bg-surface p-4">
          <div className="flex gap-1" aria-hidden>
            {parts.map(({ i }) => {
              const list = rows[i] ?? []
              const all = list.length > 0 && list.every((r) => r.done)
              return <span key={i} className={cn('h-1.5 flex-1 rounded-pill', all ? 'bg-accent' : i === focus.i ? 'bg-accent/50' : 'bg-line')} />
            })}
          </div>
          <div className="mt-3 flex items-center gap-3">
            {focus.image && <img src={focus.image} alt="" decoding="async" className="size-16 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0">
              <p className="label-tag">{t('workout.focus.exercise', { n: focus.order, of: parts.length })}</p>
              <p className="font-display text-[30px] leading-none font-bold" data-testid="setlog-focus-name">{focus.name}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
            <span className="label-tag !text-accent-text" data-testid="setlog-focus-set">{t('workout.focus.set', { n: focus.n + 1, of: focus.of })}</span>
            {focus.target && <span className="label-tag">{t('workout.focus.target', { target: focus.target })}</span>}
          </div>
          <div className={cn('mt-3 grid gap-3', focus.fields.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {focus.fields.map((f) => {
              const v = rows[focus.i]?.[focus.n]?.values[f] ?? null
              const step = STEP[f]
              return (
                <div key={f} className="text-center">
                  <p className="label-tag mb-1.5">{t(`setlog.f.${f}`)}</p>
                  <div className="flex items-center justify-between rounded-xl bg-plane p-1.5">
                    <button type="button" aria-label={t('workout.focus.less', { field: t(`setlog.f.${f}`) })} onClick={() => setValue(focus.i, focus.n, f, String(Math.max(LIMITS[f].min, (v ?? 0) - step)))} data-testid={`setlog-focus-minus-${f}`} className="grid size-11 shrink-0 place-items-center rounded-lg bg-line"><Minus size={18} aria-hidden /></button>
                    <input type="number" inputMode="decimal" min={LIMITS[f].min} max={LIMITS[f].max} step={LIMITS[f].step} value={v ?? ''} onChange={(e) => setValue(focus.i, focus.n, f, e.target.value)} aria-label={`${focus.name} ${t('setlog.set')} ${focus.n + 1} ${t(`setlog.f.${f}`)}`} data-testid={`setlog-focus-${f}`} className="readout w-full min-w-0 bg-transparent text-center font-display text-[40px] leading-none font-bold outline-none" />
                    <button type="button" aria-label={t('workout.focus.more', { field: t(`setlog.f.${f}`) })} onClick={() => setValue(focus.i, focus.n, f, String(Math.min(LIMITS[f].max, (v ?? 0) + step)))} data-testid={`setlog-focus-plus-${f}`} className="grid size-11 shrink-0 place-items-center rounded-lg bg-line"><Plus size={18} aria-hidden /></button>
                  </div>
                </div>
              )
            })}
          </div>
          {focus.last && <p className="mt-2.5 text-[13px] text-ink-secondary">{focus.last}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {focus.countable && (
              <button type="button" onClick={() => setCamera(true)} data-testid="setlog-camera" className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line px-4 text-[13px]"><Camera size={15} aria-hidden />{t('workout.camera.chip')}</button>
            )}
            {focus.swappable && (
              <button type="button" onClick={() => { setPicking(focus.i); document.querySelector(`[data-testid="setlog-part-${focus.i}"]`)?.scrollIntoView({ block: 'center' }) }} className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line px-4 text-[13px]"><Repeat2 size={15} aria-hidden />{t('setlog.swap')}</button>
            )}
          </div>
        </div>
      ) : doneCount > 0 ? (
        <p className="mb-4 rounded-2xl border border-accent bg-accent-quiet px-4 py-3 text-[14px]" data-testid="setlog-all-done">{t('workout.focus.allDone')}</p>
      ) : null}
      {focus && (
        <div className="sticky bottom-[calc(var(--bottom-nav-h,0px)+env(safe-area-inset-bottom)+0.75rem)] z-[55] mb-4">
          <button type="button" onClick={() => tick(focus.i, focus.n, focus.p, true)} data-testid="setlog-done-set" className="flex min-h-16 w-full items-center justify-center gap-2 rounded-pill bg-accent text-[19px] font-semibold text-accent-ink shadow-lg">
            <Check size={22} aria-hidden />{t('workout.focus.done')}
          </button>
        </div>
      )}
      {restEnd != null && <RestRing leftS={restLeft} totalS={restTotal} next={focus ? `${focus.name} · ${t('workout.focus.set', { n: focus.n + 1, of: focus.of })}${focus.summary ? ` · ${focus.summary}` : ''}` : null} onAdjust={(d) => setRestEnd((e) => (e == null ? e : Math.max(Date.now() + 1000, e + d * 1000)))} onSkip={() => setRestEnd(null)} />}
      {camera && focus && (
        <Suspense fallback={null}>
          <CameraCounter
            pattern={focus.countable as NonNullable<typeof focus.countable>}
            name={focus.name}
            target={focus.targetReps}
            onClose={() => setCamera(false)}
            onSet={(reps) => {
              setValue(focus.i, focus.n, 'reps', String(reps))
              setCamera(false)
              tick(focus.i, focus.n, focus.p, true)
            }}
          />
        </Suspense>
      )}
      <ol className="space-y-3">
        {parts.map(({ p, i }) => {
          const c = current(i, p)
          const sw = swaps.find((s) => s.part === i)
          const fields = fieldsOf(i, p)
          const target = p.type === 'library_exercise' ? byId.get(p.exerciseId) : undefined
          const last = c.id ? lastSetsFor(c.id, blocks) : null
          const options = target && exercises ? substituteOptions(target, exercises, planSubs) : []
          return (
            <li key={i} className="rounded-md border border-line p-3" data-testid={`setlog-part-${i}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold" data-testid={`setlog-name-${i}`}>{c.name}</p>
                  <p className="text-[12px] text-ink-secondary">{p.type === 'library_exercise' ? blockText({ ...p, name: c.name }, t).split(': ').slice(1).join(': ') : p.type === 'exercise' ? blockText(p, t) : ''}</p>
                  {sw && <p className="mt-1 text-[12px] text-accent-text" data-testid={`setlog-swapped-${i}`}>{t('setlog.swappedFrom', { name: sw.fromName })}</p>}
                  {last && <p className="mt-1 text-[12px] text-ink-muted" data-testid={`setlog-last-${i}`}>{t('setlog.last', { day: `${last.day.slice(8, 10)}.${last.day.slice(5, 7)}.`, sets: last.sets.map((s) => [s.weightKg != null ? `${s.weightKg} kg` : '', s.reps != null ? `× ${s.reps}` : '', s.durationS != null ? `${s.durationS} s` : ''].filter(Boolean).join(' ')).join(' · ') })}</p>}
                </div>
                {p.type === 'library_exercise' && (
                  <button type="button" onClick={() => setPicking(picking === i ? null : i)} aria-expanded={picking === i} disabled={!exercises} data-testid={`setlog-swap-${i}`} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border border-line px-3 text-[12px] disabled:opacity-45">
                    <Repeat2 size={14} aria-hidden />{t('setlog.swap')}
                  </button>
                )}
              </div>

              {picking === i && (
                <div className="mt-2 rounded-md bg-surface-raised p-2" data-testid={`setlog-options-${i}`}>
                  <p className="mb-1 px-1 text-[12px] text-ink-secondary">{t('setlog.swapNote')}</p>
                  {options.length === 0 ? <p className="px-1 text-[13px] text-ink-secondary">{t('setlog.noOptions')}</p> : (
                    <ul>
                      {options.map(({ exercise: e, fromPlan }) => (
                        <li key={e.id}>
                          <button type="button" onClick={() => pick(i, p, e)} data-testid={`setlog-option-${e.id}`} className="flex min-h-11 w-full items-center gap-2 rounded px-1 text-left text-[14px] hover:bg-accent-quiet">
                            <ComplexityDot level={e.complexity} />
                            <span className="flex-1">{e.name}</span>
                            {fromPlan && <span className="rounded-pill border border-line px-2 text-[11px] text-ink-secondary">{t('setlog.fromPlan')}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {sw && <button type="button" onClick={() => target && pick(i, p, target)} className="mt-1 min-h-11 px-1 text-[13px] text-accent-text underline underline-offset-2" data-testid={`setlog-unswap-${i}`}>{t('setlog.unswap')}</button>}
                </div>
              )}
              {sw && canKeep && (
                <label className="mt-2 flex min-h-11 items-center gap-3 text-[13px]">
                  <input type="checkbox" checked={sw.keep} onChange={(e) => setSwaps((s) => s.map((x) => (x.part === i ? { ...x, keep: e.target.checked } : x)))} data-testid={`setlog-keep-${i}`} className="size-5" />
                  {t('setlog.keep')}
                </label>
              )}

              <table className="mt-2 w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] text-ink-secondary">
                    <th className="w-10 font-normal">{t('setlog.set')}</th>
                    {fields.map((f) => <th key={f} className="font-normal">{t(`setlog.f.${f}`)}</th>)}
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {(rows[i] ?? []).map((r, n) => (
                    <tr key={n} className={cn(r.done && 'text-accent-text')}>
                      <td className="py-1 font-semibold">{n + 1}</td>
                      {fields.map((f) => (
                        <td key={f} className="py-1 pr-1.5">
                          <input type="number" inputMode="decimal" min={LIMITS[f].min} max={LIMITS[f].max} step={LIMITS[f].step} value={r.values[f] ?? ''} onChange={(e) => setValue(i, n, f, e.target.value)} aria-label={`${t('setlog.set')} ${n + 1} ${t(`setlog.f.${f}`)}`} data-testid={`setlog-${i}-${n}-${f}`} className="min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-2 text-[16px]" />
                        </td>
                      ))}
                      <td className="py-1 text-right">
                        <button type="button" onClick={() => tick(i, n, p)} aria-pressed={r.done} aria-label={t('setlog.tick', { n: n + 1 })} data-testid={`setlog-tick-${i}-${n}`} className={cn('grid min-h-11 min-w-11 place-items-center rounded-full border', r.done ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                          {r.done ? <Check size={18} aria-hidden /> : <X size={14} aria-hidden className="opacity-30" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => addSet(i)} data-testid={`setlog-add-${i}`} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[13px] text-accent-text"><Plus size={14} aria-hidden />{t('setlog.add')}</button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
