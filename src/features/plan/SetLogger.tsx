import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus, Repeat2, X } from 'lucide-react'
import { firstNumber, setFieldsFor, substituteOptions, type SetField } from '@/domain/library'
import { lastSetsFor, type SetLogEntry } from '@/domain/setLog'
import type { LibraryExercise } from '@/domain/libraryTypes'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'
import { ComplexityDot } from '@/features/library/bits'
import { blockText } from '@/features/plan/planText'
import { cn } from '@/lib/utils'

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
interface Row {
  done: boolean
  values: Partial<Record<SetField, number | null>>
}

const LEGACY_FIELDS: SetField[] = ['weightKg', 'reps', 'rir']

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

const LIMITS: Record<SetField, { min: number; max: number; step: number }> = {
  weightKg: { min: 0, max: 1000, step: 0.5 },
  reps: { min: 0, max: 300, step: 1 },
  rir: { min: 0, max: 10, step: 1 },
  rpe: { min: 1, max: 10, step: 0.5 },
  durationS: { min: 0, max: 36000, step: 1 },
  distanceM: { min: 0, max: 100000, step: 1 },
}

export function SetLogger({ session, exercises, planSubs, blocks, onChange, canKeep = true }: {
  session: StoredPlannedSession
  /** Übungsdatenbank; `null`, solange sie lädt (dann gelten Standardfelder, Ersatz wartet). */
  exercises: LibraryExercise[] | null
  planSubs: Record<string, string[]>
  blocks: StoredTrainingBlock[]
  onChange: (state: { sets: SetLogEntry[]; swaps: Swap[] }) => void
  /** «Auch künftig tauschen» anbieten — nicht bei freiem Training, dort gibt es keinen Plan. */
  canKeep?: boolean
}) {
  const { t } = useTranslation()
  const [swaps, setSwaps] = useState<Swap[]>([])
  const [rows, setRows] = useState<Record<number, Row[]>>({})
  const [picking, setPicking] = useState<number | null>(null)
  const [restEnd, setRestEnd] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

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
  const key = parts.map(({ p, i }) => `${i}:${current(i, p).id}:${fieldsOf(i, p).join(',')}`).join('|')
  useEffect(() => {
    const next: Record<number, Row[]> = {}
    for (const { p, i } of parts) {
      const id = current(i, p).id
      next[i] = seed(p, fieldsOf(i, p), id ? lastSetsFor(id, blocks)?.sets : undefined)
    }
    setRows(next)
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
    onChange({ sets, swaps })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, swaps])

  useEffect(() => {
    if (restEnd == null) return
    const id = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= restEnd) {
        setRestEnd(null)
        try {
          navigator.vibrate?.(200)
        } catch {
          // kein Vibrieren: die Pause endet sichtbar
        }
      }
    }, 250)
    return () => clearInterval(id)
  }, [restEnd])

  if (parts.length === 0) return null

  const setValue = (i: number, n: number, f: SetField, v: string) =>
    setRows((r) => ({ ...r, [i]: r[i].map((row, k) => (k === n ? { ...row, values: { ...row.values, [f]: v === '' ? null : Math.min(LIMITS[f].max, Math.max(LIMITS[f].min, Number(v))) } } : row)) }))
  const tick = (i: number, n: number, p: Part) => {
    const was = rows[i]?.[n]?.done
    setRows((r) => ({ ...r, [i]: r[i].map((row, k) => (k === n ? { ...row, done: !row.done } : row)) }))
    const rest = restOf(p)
    if (!was && rest) {
      setNow(Date.now())
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

  return (
    <section className="mt-4" data-testid="set-logger" aria-label={t('setlog.title')}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[16px] font-bold">{t('setlog.title')}</h3>
        <span className="text-[12px] text-ink-secondary" data-testid="setlog-count">{t('setlog.count', { n: doneCount })}</span>
      </div>
      <p className="mb-3 text-[12px] text-ink-secondary">{t('setlog.note')}</p>
      {restEnd != null && (
        <div className="sticky top-2 z-10 mb-3 flex items-center justify-between rounded-md border border-accent bg-accent-quiet px-3 py-2" data-testid="setlog-rest" role="status">
          <span className="text-[13px]">{t('setlog.rest')} <span className="readout text-[20px]">{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}</span></span>
          <button type="button" onClick={() => setRestEnd(null)} className="min-h-11 rounded-pill border border-line px-4 text-[12px]" data-testid="setlog-rest-skip">{t('setlog.restSkip')}</button>
        </div>
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
