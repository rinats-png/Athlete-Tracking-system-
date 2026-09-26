import type { StoredDiaryEntry, StoredObservation } from '@/lib/store/localStore'
import { dayLoad, toDay } from '@/domain/diary'
import { buildMetric, type DerivedMetric } from '@/domain/metricContract'

/**
 * Tageskontext — Readiness aus Komponenten (Master-Spezifikation D5).
 *
 * DIE GRUNDENTSCHEIDUNG: keine Einzelzahl im Vordergrund. Jede Komponente
 * (Schlaf, Energie, Stress, Muskelkater, Belastung, HRV, Ruhepuls) wird gegen
 * die EIGENE Bandbreite der letzten 28 Tage gehalten und einzeln gezeigt. Die
 * Aussage lautet «2 Marker ausserhalb deiner normalen Bandbreite», nicht
 * «Readiness 64». Ein Gesamtwert steht, wenn überhaupt, darunter und lässt
 * sich aufschlüsseln.
 *
 * ROBUST STATT DURCHSCHNITT. Die Bandbreite ist der Median und die mittlere
 * absolute Abweichung vom Median (MAD × 1,4826 ≈ Standardabweichung bei
 * Normalverteilung). Ein einzelner Ausreisser — eine Nacht mit vier Stunden —
 * verschiebt sie kaum; ein Mittelwert würde er verzerren.
 *
 * KEIN EINZELWERT-ALARM. Die Datei sagt nur, ob der jüngste Wert ausserhalb
 * der eigenen Bandbreite liegt. Ob das etwas bedeutet, sagt ein Mensch. Es
 * gibt keine Trainingsfreigabe, keine Ampel und keine Aussage über
 * Gesundheit (§81, §82).
 *
 * HRV UND RUHEPULS kommen aus den Beobachtungswerten (Gerätemessung). Sie
 * sind die einzigen Komponenten, bei denen «ausserhalb» in EINE Richtung
 * gezählt wird (HRV darunter, Ruhepuls darüber) — so, wie es in der
 * Literatur zur Trainingssteuerung üblich ist (Plews et al. 2013), und
 * ausdrücklich als Hinweis zum Hinschauen, nicht als Befund.
 */

export const READINESS_ALGORITHM = 'readiness_context_robust_z'
export const READINESS_VERSION = '1.0.0'

/** Länge des Bezugsfensters. */
export const BASELINE_DAYS = 28
/** Unter so vielen Werten im Fenster gibt es keine Bandbreite. */
export const MIN_BASELINE_POINTS = 7
/** Der jüngste Wert darf höchstens so alt sein, sonst ist er kein «heute». */
export const CURRENT_MAX_AGE_DAYS = 2
/** Ab |z| über diesem Wert liegt ein Wert ausserhalb der eigenen Bandbreite. */
export const BAND_Z = 1

export type ReadinessComponentKey = 'sleepHours' | 'sleepQuality' | 'energy' | 'stress' | 'soreness' | 'load7' | 'hrv' | 'restingHr'

/**
 * Richtung, in der eine Abweichung als Marker zählt. `both`: jede Abweichung
 * wird gezeigt, aber nicht als Marker gezählt (Belastung ist keine
 * Befindlichkeit).
 */
type Concern = 'below' | 'above' | 'none'

interface ComponentSpec {
  key: ReadinessComponentKey
  concern: Concern
  /** Untergrenze der Streuung — sonst wäre bei sehr gleichmässigen Werten jede Kleinigkeit «ausserhalb». */
  minScale: number
  unit: string
  digits: number
}

export const COMPONENTS: ComponentSpec[] = [
  { key: 'sleepHours', concern: 'below', minScale: 0.25, unit: 'h', digits: 1 },
  { key: 'sleepQuality', concern: 'below', minScale: 0.5, unit: '1–5', digits: 1 },
  { key: 'energy', concern: 'below', minScale: 0.5, unit: '1–5', digits: 1 },
  { key: 'stress', concern: 'above', minScale: 0.5, unit: '1–5', digits: 1 },
  { key: 'soreness', concern: 'above', minScale: 0.5, unit: '1–5', digits: 1 },
  { key: 'load7', concern: 'none', minScale: 30, unit: 'AU', digits: 0 },
  { key: 'hrv', concern: 'below', minScale: 2, unit: 'ms', digits: 0 },
  { key: 'restingHr', concern: 'above', minScale: 1, unit: 'bpm', digits: 0 },
]

export const HRV_OBSERVATION = 'hrv_rmssd_ms'
export const RESTING_HR_OBSERVATION = 'resting_hr_bpm'

export type ComponentStatus = 'within' | 'below' | 'above' | 'no_current' | 'insufficient'

export interface ReadinessComponent {
  key: ReadinessComponentKey
  unit: string
  digits: number
  current: number | null
  currentDay: string | null
  baselineMedian: number | null
  /** Robuste Streuung (MAD × 1,4826), mindestens `minScale`. */
  baselineScale: number | null
  /** Abweichung in Streuungen. Positiv: über dem eigenen Median. */
  z: number | null
  status: ComponentStatus
  /** Liegt ausserhalb UND in der Richtung, die als Marker zählt. */
  marker: boolean
  baselinePoints: number
}

export interface ReadinessContext {
  day: string
  components: ReadinessComponent[]
  /** Wie viele Komponenten überhaupt beurteilt werden konnten. */
  assessed: number
  /** Wie viele davon ausserhalb der eigenen Bandbreite liegen, in der zählenden Richtung. */
  markers: number
  metric: DerivedMetric<number>
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Mittlere absolute Abweichung vom Median, auf Normalverteilung skaliert. */
export function robustScale(xs: number[]): number | null {
  const m = median(xs)
  if (m == null) return null
  const mad = median(xs.map((x) => Math.abs(x - m)))
  return mad == null ? null : mad * 1.4826
}

function shift(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}

type Point = { day: string; value: number }

function diarySeries(diary: StoredDiaryEntry[], key: ReadinessComponentKey): Point[] {
  if (key === 'load7') return []
  if (key === 'hrv' || key === 'restingHr') return []
  const field = key as 'sleepHours' | 'sleepQuality' | 'energy' | 'stress' | 'soreness'
  return diary
    .filter((e) => typeof e[field] === 'number')
    .map((e) => ({ day: e.day, value: e[field] as number }))
}

function observationSeries(observations: StoredObservation[], key: string): Point[] {
  // Ein Wert je Tag — bei mehreren Messungen am selben Tag die jüngste.
  const byDay = new Map<string, StoredObservation>()
  for (const o of observations) {
    if (o.key !== key) continue
    const day = o.observedAt.slice(0, 10)
    const current = byDay.get(day)
    if (!current || o.observedAt > current.observedAt) byDay.set(day, o)
  }
  return [...byDay.entries()].map(([day, o]) => ({ day, value: o.value }))
}

/**
 * Belastung der letzten sieben Tage, und als Bezug die Wochenlasten der vier
 * Wochen davor. Gegen den Median dieser Wochen — nicht gegen einen Quotienten.
 */
function loadComponent(diary: StoredDiaryEntry[], today: string): { current: number | null; baseline: number[] } {
  if (diary.length === 0) return { current: null, baseline: [] }
  const byDay = new Map(diary.map((e) => [e.day, e]))
  const weekSum = (end: string) => {
    let sum = 0
    let days = 0
    for (let i = 0; i < 7; i++) {
      const e = byDay.get(shift(end, -i))
      if (e) {
        days++
        sum += dayLoad(e)
      }
    }
    return days === 0 ? null : sum
  }
  const current = weekSum(today)
  const baseline: number[] = []
  // Nicht überlappende Wochen: 7–13, 14–20 … Tage zurück. Für die Bandbreite
  // reichen vier Wochen nicht (MIN_BASELINE_POINTS) — deshalb gleitend über
  // die Tage 7 bis 34 zurück, je ein Wochenwert pro Tag.
  for (let back = 7; back < 7 + BASELINE_DAYS; back++) {
    const w = weekSum(shift(today, -back))
    if (w != null) baseline.push(w)
  }
  return { current, baseline }
}

function assess(spec: ComponentSpec, series: Point[], today: string): ReadinessComponent {
  const cutoff = shift(today, -CURRENT_MAX_AGE_DAYS)
  const recent = series.filter((p) => p.day <= today && p.day >= cutoff).sort((a, b) => b.day.localeCompare(a.day))[0]
  const start = shift(today, -BASELINE_DAYS)
  // Bezug: das Fenster VOR dem aktuellen Wert — der Wert soll nicht gegen sich selbst gemessen werden.
  const baseline = series.filter((p) => p.day >= start && p.day < (recent?.day ?? shift(today, 1))).map((p) => p.value)
  return evaluate(spec, recent ? recent.value : null, recent?.day ?? null, baseline)
}

function evaluate(spec: ComponentSpec, current: number | null, currentDay: string | null, baseline: number[]): ReadinessComponent {
  const base: ReadinessComponent = {
    key: spec.key,
    unit: spec.unit,
    digits: spec.digits,
    current,
    currentDay,
    baselineMedian: null,
    baselineScale: null,
    z: null,
    status: 'insufficient',
    marker: false,
    baselinePoints: baseline.length,
  }
  if (baseline.length < MIN_BASELINE_POINTS) return base
  const m = median(baseline) as number
  const scale = Math.max(robustScale(baseline) ?? 0, spec.minScale)
  base.baselineMedian = Math.round(m * 100) / 100
  base.baselineScale = Math.round(scale * 100) / 100
  if (current == null) return { ...base, status: 'no_current' }
  const z = (current - m) / scale
  base.z = Math.round(z * 10) / 10
  const status: ComponentStatus = z < -BAND_Z ? 'below' : z > BAND_Z ? 'above' : 'within'
  const marker = (spec.concern === 'below' && status === 'below') || (spec.concern === 'above' && status === 'above')
  return { ...base, status, marker }
}

export function readinessContext(
  diary: StoredDiaryEntry[],
  observations: StoredObservation[],
  today: string = toDay(new Date()),
): ReadinessContext {
  const components = COMPONENTS.map((spec) => {
    if (spec.key === 'load7') {
      const { current, baseline } = loadComponent(diary, today)
      return evaluate(spec, current, current == null ? null : today, baseline)
    }
    if (spec.key === 'hrv') return assess(spec, observationSeries(observations, HRV_OBSERVATION), today)
    if (spec.key === 'restingHr') return assess(spec, observationSeries(observations, RESTING_HR_OBSERVATION), today)
    return assess(spec, diarySeries(diary, spec.key), today)
  })
  const assessedList = components.filter((c) => c.status === 'within' || c.status === 'below' || c.status === 'above')
  const markers = assessedList.filter((c) => c.marker).length
  const metric = buildMetric(
    {
      key: 'readiness_markers',
      algorithm: READINESS_ALGORITHM,
      algorithmVersion: READINESS_VERSION,
      unit: 'count',
      minSample: 1,
      targetSample: 4,
    },
    {
      value: assessedList.length > 0 ? markers : null,
      sampleSize: assessedList.length,
      period: { from: shift(today, -BASELINE_DAYS), to: today },
      warnings: ['self_report'],
    },
  )
  return { day: today, components, assessed: assessedList.length, markers, metric }
}

/**
 * Tage in Folge ausserhalb der Bandbreite — für Regeln, die «mehrere Tage»
 * verlangen (kein Einzelwert-Alarm). Zählt vom jüngsten Tag rückwärts, wie
 * viele der letzten `span` Tage mit Wert in der zählenden Richtung liegen.
 */
export function daysOutside(
  diary: StoredDiaryEntry[],
  observations: StoredObservation[],
  key: ReadinessComponentKey,
  today: string,
  span = 4,
): { outside: number; withValue: number } {
  const spec = COMPONENTS.find((c) => c.key === key)
  if (!spec || spec.concern === 'none') return { outside: 0, withValue: 0 }
  const series =
    key === 'hrv'
      ? observationSeries(observations, HRV_OBSERVATION)
      : key === 'restingHr'
        ? observationSeries(observations, RESTING_HR_OBSERVATION)
        : diarySeries(diary, key)
  let outside = 0
  let withValue = 0
  for (let i = 0; i < span; i++) {
    const day = shift(today, -i)
    const point = series.find((p) => p.day === day)
    if (!point) continue
    withValue++
    // Bandbreite je Tag aus den 28 Tagen DAVOR.
    const start = shift(day, -BASELINE_DAYS)
    const baseline = series.filter((p) => p.day >= start && p.day < day).map((p) => p.value)
    const c = evaluate(spec, point.value, day, baseline)
    if (c.marker) outside++
  }
  return { outside, withValue }
}
