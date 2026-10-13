/**
 * Lauf mit Standort: Strecke, Tempo, Runden und Intervalle nach Strecke.
 *
 * QUELLE DER ZAHLEN: die Standortpunkte des Geräts. Jeder Punkt trägt eine
 * Genauigkeit; ungenaue Punkte und unmögliche Sprünge (schneller als ein
 * Sprinter) werden verworfen, statt die Strecke aufzublähen. Die Strecke ist
 * damit eine Schätzung des Geräts — so steht sie auch in der Oberfläche.
 *
 * INTERVALLE nach Strecke (z. B. 6 × 400 m, 90 s Trabpause): Arbeit endet,
 * wenn die Strecke erreicht ist, Pause nach Zeit. Ein Reduzierer
 * (`advanceRun`) verarbeitet Punkt für Punkt; dieselben Punkte ergeben immer
 * denselben Zustand.
 *
 * Rein: kein React, kein Standortzugriff, keine Uhr — Zeit und Punkte werden übergeben.
 */

export interface GeoPoint {
  /** Laufzeit in Sekunden (ohne Pausen des Nutzers). */
  t: number
  lat: number
  lon: number
  /** Genauigkeit in Metern (95 %-Radius laut Gerät). */
  accuracyM: number
}

/** Punkte ungenauer als das zählen nicht. */
export const MAX_ACCURACY_M = 30
/** Schneller als das ist kein Laufen, sondern ein Sprung im Signal (m/s). */
export const MAX_SPEED_MS = 12

const R = 6_371_000
const rad = (d: number) => (d * Math.PI) / 180

export function haversineM(a: Pick<GeoPoint, 'lat' | 'lon'>, b: Pick<GeoPoint, 'lat' | 'lon'>): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface RunIntervalSpec {
  reps: number
  workM: number
  restS: number
}

export const RUN_LIMITS = { reps: { min: 1, max: 40 }, workM: { min: 50, max: 10000 }, restS: { min: 0, max: 900 } } as const

export function normalizeIntervals(spec: RunIntervalSpec): RunIntervalSpec {
  const c = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)))
  return { reps: c(spec.reps, RUN_LIMITS.reps.min, RUN_LIMITS.reps.max), workM: c(spec.workM, RUN_LIMITS.workM.min, RUN_LIMITS.workM.max), restS: c(spec.restS, RUN_LIMITS.restS.min, RUN_LIMITS.restS.max) }
}

export interface Split {
  /** 'lap' = von Hand gesetzte Runde, 'work' = Intervall erfüllt. */
  kind: 'lap' | 'work'
  index: number
  distanceM: number
  seconds: number
}

export interface RunState {
  /** Letzter angenommener Punkt. */
  last: GeoPoint | null
  distanceM: number
  /** Laufzeit des letzten Punkts bzw. der letzten Uhrzeit. */
  t: number
  splits: Split[]
  /** Beginn der laufenden Runde bzw. des laufenden Abschnitts. */
  segStartM: number
  segStartT: number
  /** Intervalle: Phase und Nummer (1-basiert); ohne Intervalle immer 'free'. */
  phase: 'free' | 'work' | 'rest' | 'done'
  rep: number
  /** Punkte, die zu ungenau oder unmöglich waren. */
  rejected: number
}

export function startRun(intervals: RunIntervalSpec | null): RunState {
  return { last: null, distanceM: 0, t: 0, splits: [], segStartM: 0, segStartT: 0, phase: intervals ? 'work' : 'free', rep: intervals ? 1 : 0, rejected: 0 }
}

/** Ob ein Punkt nach dem vorigen zählt. */
export function acceptPoint(prev: GeoPoint | null, p: GeoPoint): boolean {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) return false
  if (!(p.accuracyM >= 0) || p.accuracyM > MAX_ACCURACY_M) return false
  if (!prev) return true
  const dt = p.t - prev.t
  if (dt <= 0) return false
  return haversineM(prev, p) / dt <= MAX_SPEED_MS
}

/** Zeit fortschreiben ohne neuen Punkt (beendet eine Trabpause nach Zeit). */
export function tickRun(state: RunState, t: number, intervals: RunIntervalSpec | null): RunState {
  if (t <= state.t) return state
  let s = { ...state, t }
  if (intervals && s.phase === 'rest') {
    const spec = normalizeIntervals(intervals)
    if (t - s.segStartT >= spec.restS) s = { ...s, phase: 'work', rep: s.rep + 1, segStartM: s.distanceM, segStartT: s.segStartT + spec.restS }
  }
  return s
}

/** Einen Standortpunkt verarbeiten. */
export function advanceRun(state: RunState, p: GeoPoint, intervals: RunIntervalSpec | null): RunState {
  let s = tickRun(state, p.t, intervals)
  if (s.phase === 'done') return s
  if (!acceptPoint(s.last, p)) return { ...s, rejected: s.rejected + 1 }
  const add = s.last ? haversineM(s.last, p) : 0
  s = { ...s, last: p, distanceM: s.distanceM + add, t: Math.max(s.t, p.t) }
  if (intervals && s.phase === 'work') {
    const spec = normalizeIntervals(intervals)
    const done = s.distanceM - s.segStartM
    if (done >= spec.workM) {
      // Zeit des Erreichens linear zwischen den beiden Punkten schätzen.
      const before = done - add
      const frac = add > 0 ? (spec.workM - before) / add : 1
      const prevT = state.last?.t ?? s.segStartT
      const reachedT = prevT + (p.t - prevT) * Math.min(1, Math.max(0, frac))
      const split: Split = { kind: 'work', index: s.rep, distanceM: spec.workM, seconds: reachedT - s.segStartT }
      const last = s.rep >= spec.reps
      s = { ...s, splits: [...s.splits, split], phase: last ? 'done' : spec.restS > 0 ? 'rest' : 'work', rep: last || spec.restS > 0 ? s.rep : s.rep + 1, segStartM: s.segStartM + spec.workM, segStartT: reachedT }
    }
  }
  return s
}

/** Von Hand eine Runde setzen (freier Lauf). */
export function lapRun(state: RunState, t: number): RunState {
  const index = state.splits.filter((x) => x.kind === 'lap').length + 1
  return { ...state, t: Math.max(state.t, t), splits: [...state.splits, { kind: 'lap', index, distanceM: state.distanceM - state.segStartM, seconds: Math.max(0, t - state.segStartT) }], segStartM: state.distanceM, segStartT: t }
}

/** Tempo in Sekunden je Kilometer; null unter 50 m oder 10 s (zu wenig für eine Aussage). */
export function paceSPerKm(distanceM: number, seconds: number): number | null {
  if (distanceM < 50 || seconds < 10) return null
  return (seconds / distanceM) * 1000
}

export function formatPace(sPerKm: number | null): string {
  if (sPerKm == null || !Number.isFinite(sPerKm)) return '–:––'
  const s = Math.round(sPerKm)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
