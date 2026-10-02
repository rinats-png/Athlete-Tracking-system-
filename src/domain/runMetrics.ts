import type { StoredActivity } from '@/lib/store/localStore'

/**
 * Kennzahlen aus importierten Aktivitäten (docs/laeufe.md, Stufe 2).
 * Rein: keine Oberfläche, kein Speicher, kein Netz.
 *
 * QUELLEN (published):
 *   VDOT: Daniels & Gilbert (1979), Oxygen Power; Daniels (2014), Daniels'
 *     Running Formula — VO2 aus Geschwindigkeit, Anteil aus der Dauer.
 *   Prognose über Distanzen: Riegel (1981), Athletic Records and Human
 *     Endurance, Exponent 1,06.
 *   Fitness und Ermüdung als gleitende Mittel (42 und 7 Tage), Form als
 *     Differenz: Banister et al. (1975), Impulse-Response-Modell; Zeitkonstanten
 *     wie in der Trainingspraxis üblich.
 *   Belastung aus Pulsanteil: abgeleitet vom TRIMP-Gedanken (Banister 1991), mit
 *     quadriertem Pulsanteil als Festlegung dieser App.
 *
 * FESTLEGUNGEN DIESER APP (vorläufig, Formelregister): Belastungsfaktoren ohne
 * Puls, Pulszonen als Anteile des Schwellenpulses, Schwellenpuls aus dem
 * stärksten Lauf, die Bänder der Rennspannen, die Regeln für «lockere» und
 * «harte» Einheiten, das Band für Tempo bei gleichem Puls.
 *
 * KEINE WAHRSCHEINLICHKEIT. Die Rennprognose ist eine Spanne aus zwei
 * Verfahren; eine «Chance in Prozent» gibt es nicht, weil die dafür nötigen
 * Streuungen keine Quelle haben.
 */

export const RUN_METRICS_VERSION = '1.0.0'

const DAY = 86_400_000
const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`)
export const shiftDay = (d: string, n: number): string => new Date(dayMs(d) + n * DAY).toISOString().slice(0, 10)
const diffDays = (a: string, b: string) => Math.round((dayMs(a) - dayMs(b)) / DAY)
/** Montag = 0 … Sonntag = 6. */
export const weekdayOf = (d: string): number => (new Date(dayMs(d)).getUTCDay() + 6) % 7
export const weekStart = (d: string): string => shiftDay(d, -weekdayOf(d))
const median = (a: number[]): number | null => {
  if (a.length === 0) return null
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

/** Bewegungszeit in Sekunden, sonst Gesamtzeit. */
export const seconds = (a: StoredActivity): number | null => a.movingS ?? a.elapsedS
const isRun = (a: StoredActivity) => a.sport === 'run'
const isRunOrTrail = (a: StoredActivity) => a.sport === 'run' || a.sport === 'trail'
const km = (a: StoredActivity) => (a.distanceM ?? 0) / 1000

/** Heute = Tag der letzten Einheit. */
export function todayOf(acts: StoredActivity[]): string | null {
  return acts.reduce<string | null>((best, a) => (best == null || a.day > best ? a.day : best), null)
}

// --- VDOT, Prognosen ------------------------------------------------------------

/** VDOT für Strecke d (m) und Zeit t (min). */
export function vdotOf(distanceM: number, minutes: number): number {
  const v = distanceM / minutes
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v
  const fraction = 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes)
  return vo2 / fraction
}

/** Zeit in Sekunden, bei der ein VDOT auf der Strecke erreicht wird (Bisektion). */
export function timeForVdot(vdot: number, distanceM: number): number {
  let lo = 1
  let hi = 2000
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (vdotOf(distanceM, mid) > vdot) lo = mid
    else hi = mid
  }
  return Math.round(((lo + hi) / 2) * 60)
}

/** Riegel: t2 = t1 · (d2 / d1)^1,06. */
export const riegel = (t1: number, d1: number, d2: number): number => Math.round(t1 * Math.pow(d2 / d1, 1.06))

/** Tempo (s/km) aus einem Anteil des VDOT an der Sauerstoffaufnahme. */
export function paceAtVo2Fraction(vdot: number, fraction: number): number {
  const vo2 = vdot * fraction
  const a = 0.000104
  const b = 0.182258
  const v = (-b + Math.sqrt(b * b + 4 * a * (4.6 + vo2))) / (2 * a)
  return 60000 / v
}

export const RACE_DISTANCES = { '5k': 5000, '10k': 10000, half: 21097.5, marathon: 42195 } as const
export type RaceKey = keyof typeof RACE_DISTANCES

const activityVdot = (a: StoredActivity): number | null => {
  const s = seconds(a)
  return isRun(a) && a.distanceM != null && a.distanceM >= 3000 && s ? vdotOf(a.distanceM, s / 60) : null
}

export interface VdotEvidence {
  vdot: number
  activityId: string
  day: string
  distanceM: number
}

/** Aktueller VDOT: bester Lauf ab 3 km in den letzten 150 Tagen. */
export function currentVdot(acts: StoredActivity[], today: string): VdotEvidence | null {
  let best: VdotEvidence | null = null
  for (const a of acts) {
    if (diffDays(today, a.day) < 0 || diffDays(today, a.day) >= 150) continue
    const v = activityVdot(a)
    if (v != null && (best == null || v > best.vdot)) best = { vdot: v, activityId: a.id, day: a.day, distanceM: a.distanceM! }
  }
  return best
}

/** Rennen: Läufe ab 4,9 km, deren VDOT höchstens 2,5 unter dem besten der zwölf Monate liegt. */
export function raceActivities(acts: StoredActivity[], today: string): StoredActivity[] {
  const pool = acts.filter((a) => diffDays(today, a.day) >= 0 && diffDays(today, a.day) < 365 && a.distanceM != null && a.distanceM >= 4900)
  const vs = pool.map((a) => activityVdot(a)).filter((v): v is number => v != null)
  if (vs.length === 0) return []
  const top = Math.max(...vs)
  return pool.filter((a) => {
    const v = activityVdot(a)
    return v != null && v >= top - 2.5
  })
}

export interface RacePrediction {
  key: RaceKey
  distanceM: number
  /** Zeit aus dem aktuellen VDOT, Sekunden. */
  vdotTime: number
  /** Zeit nach Riegel aus dem längsten Rennen, Sekunden; null ohne Rennen. */
  riegelTime: number | null
  /** Die Spanne aus beiden. */
  low: number
  high: number
}

export function predictions(acts: StoredActivity[], today: string): { vdot: VdotEvidence; list: RacePrediction[]; baseRaceId: string | null } | null {
  const vdot = currentVdot(acts, today)
  if (!vdot) return null
  const races = raceActivities(acts, today)
  const base = races.reduce<StoredActivity | null>((b, a) => (b == null || (a.distanceM ?? 0) > (b.distanceM ?? 0) ? a : b), null)
  const list = (Object.keys(RACE_DISTANCES) as RaceKey[]).map((key) => {
    const d = RACE_DISTANCES[key]
    const vt = timeForVdot(vdot.vdot, d)
    const rt = base && seconds(base) ? riegel(seconds(base)!, base.distanceM!, d) : null
    const both = [vt, rt].filter((x): x is number => x != null)
    return { key, distanceM: d, vdotTime: vt, riegelTime: rt, low: Math.min(...both), high: Math.max(...both) }
  })
  return { vdot, list, baseRaceId: base?.id ?? null }
}

export type RaceOutlook = 'ambitious' | 'realistic' | 'safe'

/** Einordnung der Zielzeit gegen die Spanne. Keine Wahrscheinlichkeit. */
export function raceOutlook(targetS: number, p: RacePrediction): RaceOutlook {
  if (targetS < p.low) return 'ambitious'
  if (targetS > p.high) return 'safe'
  return 'realistic'
}

// --- Parameter ------------------------------------------------------------------

/** Maximalpuls: höchster Wert aus Läufen, den ein zweiter Lauf bis auf 3 Schläge erreicht; über 215 ist Messfehler. */
export function maxHeartRate(acts: StoredActivity[]): number | null {
  const vals = acts.filter(isRunOrTrail).map((a) => a.maxHr).filter((v): v is number => v != null && v <= 215).sort((a, b) => b - a)
  for (let i = 0; i < vals.length; i++) if (vals.some((w, j) => j !== i && Math.abs(w - vals[i]) <= 3)) return vals[i]
  return null
}

export interface Threshold {
  hr: number
  activityId: string
  day: string
  km: number
}

/** Schwellenpuls: Durchschnittspuls des stärksten Laufs (höchster VDOT) zwischen 9,5 und 21,5 km; unter 15 km mal 0,98. */
export function thresholdHr(acts: StoredActivity[]): Threshold | null {
  let best: { a: StoredActivity; v: number } | null = null
  for (const a of acts) {
    if (!isRun(a) || a.avgHr == null || a.distanceM == null || a.distanceM < 9500 || a.distanceM > 21500) continue
    const v = activityVdot(a)
    if (v != null && (best == null || v > best.v)) best = { a, v }
  }
  if (!best) return null
  const k = km(best.a)
  return { hr: Math.round(best.a.avgHr! * (k < 15 ? 0.98 : 1)), activityId: best.a.id, day: best.a.day, km: k }
}

/** Zonengrenzen bei 85, 90, 95 und 100 Prozent des Schwellenpulses. Z1 darunter, Z5 ab der letzten. */
export const zoneBounds = (thr: number): [number, number, number, number] => [Math.round(thr * 0.85), Math.round(thr * 0.9), Math.round(thr * 0.95), Math.round(thr)]
/** 1–5. */
export function zoneOf(hr: number, bounds: [number, number, number, number]): 1 | 2 | 3 | 4 | 5 {
  return hr < bounds[0] ? 1 : hr < bounds[1] ? 2 : hr < bounds[2] ? 3 : hr < bounds[3] ? 4 : 5
}

// --- Belastung ------------------------------------------------------------------

/** Faktoren ohne Puls (Festlegung dieser App; Schwimmen und Sonstiges: 0,6). */
export const NO_HR_FACTOR: Record<StoredActivity['sport'], number> = { strength: 0.55, bike: 0.65, hike: 0.6, run: 0.75, trail: 0.8, swim: 0.6, other: 0.6 }

export interface LoadParams {
  restHr: number
  thresholdHr: number | null
}

/** Last einer Einheit: Stunden · Pulsanteil² · 100; ohne Puls Stunden · Faktor² · 100. */
export function activityLoad(a: StoredActivity, p: LoadParams): { load: number; estimated: boolean } {
  const s = seconds(a)
  const hours = s ? s / 3600 : 0
  if (a.avgHr != null && p.thresholdHr != null && p.thresholdHr > p.restHr) {
    const frac = Math.max(0, (a.avgHr - p.restHr) / (p.thresholdHr - p.restHr))
    return { load: hours * frac * frac * 100, estimated: false }
  }
  const f = NO_HR_FACTOR[a.sport]
  return { load: hours * f * f * 100, estimated: true }
}

export interface DailySeries {
  days: string[]
  load: number[]
  fitness: number[]
  fatigue: number[]
  form: number[]
}

/** Tageslast, Fitness (42 Tage), Ermüdung (7 Tage). Start: Mittel der ersten 28 Tage. */
export function dailySeries(acts: StoredActivity[], p: LoadParams, today: string): DailySeries | null {
  if (acts.length === 0) return null
  const first = acts.reduce((m, a) => (a.day < m ? a.day : m), acts[0].day)
  const n = diffDays(today, first) + 1
  if (n < 1) return null
  const load = new Array<number>(n).fill(0)
  for (const a of acts) {
    const i = diffDays(a.day, first)
    if (i >= 0 && i < n) load[i] += activityLoad(a, p).load
  }
  const init = mean(load.slice(0, 28))
  let f = init
  let t = init
  const days: string[] = []
  const fitness: number[] = []
  const fatigue: number[] = []
  const form: number[] = []
  for (let i = 0; i < n; i++) {
    f += (load[i] - f) / 42
    t += (load[i] - t) / 7
    days.push(shiftDay(first, i))
    fitness.push(f)
    fatigue.push(t)
    form.push(f - t)
  }
  return { days, load, fitness, fatigue, form }
}

export type FormWord = 'very_loaded' | 'building' | 'balanced' | 'fresh' | 'very_fresh'
export function formWord(form: number): FormWord {
  return form < -25 ? 'very_loaded' : form <= -10 ? 'building' : form <= 5 ? 'balanced' : form <= 15 ? 'fresh' : 'very_fresh'
}

/** Rampe: Fitness heute minus Fitness vor 7 Tagen. */
export const ramp = (s: DailySeries): number | null => (s.fitness.length > 7 ? s.fitness[s.fitness.length - 1] - s.fitness[s.fitness.length - 8] : null)

/** Akut zu chronisch: Last der letzten 7 Tage durch den Wochenschnitt der 28 Tage davor. Beschreibend, keine Ampel. */
export function acuteChronic(s: DailySeries): number | null {
  const n = s.load.length
  if (n < 35) return null
  const acute = s.load.slice(n - 7).reduce((x, y) => x + y, 0)
  const chronic = s.load.slice(n - 35, n - 7).reduce((x, y) => x + y, 0) / 4
  return chronic > 0 ? acute / chronic : null
}

/** Monotonie: Mittelwert durch Standardabweichung (durch n) der letzten 7 Tageslasten. */
export function monotony(s: DailySeries): number | null {
  const w = s.load.slice(-7)
  if (w.length < 7) return null
  const m = mean(w)
  const sd = Math.sqrt(mean(w.map((x) => (x - m) ** 2)))
  return sd > 0 ? m / sd : null
}

/** Taper-Projektion: ab 14 Tage vor dem Rennen mit 55 % der mittleren Tageslast der letzten 28 Tage. */
export function taperProjection(s: DailySeries, raceDay: string): { taperStart: string; formOnRaceDay: number } | null {
  const last = s.days[s.days.length - 1]
  if (diffDays(raceDay, last) < 0) return null
  const base = mean(s.load.slice(-28))
  const taperStart = shiftDay(raceDay, -14)
  let f = s.fitness[s.fitness.length - 1]
  let t = s.fatigue[s.fatigue.length - 1]
  const steps = diffDays(raceDay, last)
  for (let i = 1; i <= steps; i++) {
    const day = shiftDay(last, i)
    const L = day >= taperStart ? base * 0.55 : base
    f += (L - f) / 42
    t += (L - t) / 7
  }
  return { taperStart, formOnRaceDay: f - t }
}

// --- Umfang und Konstanz --------------------------------------------------------

export interface WeekRow {
  start: string
  km: number
  runs: number
  closed: boolean
}

/** 52 abgeschlossene Wochen (Mo–So) plus die laufende; Läufe = Lauf und Trail. */
export function weeklyVolume(acts: StoredActivity[], today: string): WeekRow[] {
  const cur = weekStart(today)
  const rows: WeekRow[] = []
  for (let i = 52; i >= 0; i--) rows.push({ start: shiftDay(cur, -7 * i), km: 0, runs: 0, closed: i > 0 })
  const idx = new Map(rows.map((r, i) => [r.start, i]))
  for (const a of acts) {
    if (!isRunOrTrail(a)) continue
    const i = idx.get(weekStart(a.day))
    if (i != null) {
      rows[i].km += km(a)
      rows[i].runs += 1
    }
  }
  return rows
}

/** Sprung: jüngste abgeschlossene Woche ab 30 km, mehr als 30 % über dem Schnitt der vier Wochen davor. */
export function volumeJump(weeks: WeekRow[]): { start: string; km: number; pct: number } | null {
  const closed = weeks.filter((w) => w.closed)
  if (closed.length < 5) return null
  const last = closed[closed.length - 1]
  const avg = mean(closed.slice(-5, -1).map((w) => w.km))
  return last.km >= 30 && avg > 0 && last.km > avg * 1.3 ? { start: last.start, km: last.km, pct: Math.round((last.km / avg - 1) * 100) } : null
}

/** Wochenziel abgeleitet: Schnitt der letzten vier abgeschlossenen Wochen. */
export function derivedWeeklyGoal(weeks: WeekRow[]): number | null {
  const closed = weeks.filter((w) => w.closed).slice(-4)
  return closed.length === 4 ? mean(closed.map((w) => w.km)) : null
}

export interface Consistency {
  currentStreak: number
  longestStreak: number
  hitsLastSix: number
  activeDays: number
  longestActiveDayStreak: number
}

/** Wochen mit mindestens drei Läufen; aktive Tage der zwölf Monate. */
export function consistency(acts: StoredActivity[], today: string): Consistency {
  const weeks = weeklyVolume(acts, today).filter((w) => w.closed)
  const hit = weeks.map((w) => w.runs >= 3)
  let longest = 0
  let run = 0
  for (const h of hit) {
    run = h ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  let current = 0
  for (let i = hit.length - 1; i >= 0 && hit[i]; i--) current++
  const active = new Set(acts.filter((a) => diffDays(today, a.day) >= 0 && diffDays(today, a.day) < 365).map((a) => a.day))
  let bestDays = 0
  let streak = 0
  for (let i = 364; i >= 0; i--) {
    if (active.has(shiftDay(today, -i))) {
      streak++
      bestDays = Math.max(bestDays, streak)
    } else streak = 0
  }
  return { currentStreak: current, longestStreak: longest, hitsLastSix: hit.slice(-6).filter(Boolean).length, activeDays: active.size, longestActiveDayStreak: bestDays }
}

// --- Namen: lockere und harte Einheiten ------------------------------------------

const QUALITY = /×|\d\s*x\s*\d|schwelle|tempo|intervall|rennen|wettkampf|steigerung|einlaufen|threshold|interval|race|tempo/i
const HARD = /×|\d\s*x\s*\d|intervall|schwelle|tempo|threshold|interval/i
export const soundsLikeQuality = (name: string) => QUALITY.test(name)
export const soundsHard = (name: string) => HARD.test(name)

// --- Tempo bei gleichem Puls -------------------------------------------------------

export interface PaceAtHr {
  bandLo: number
  bandHi: number
  runsInBand: number
  monthly: { month: string; paceSPerKm: number; runs: number }[]
  firstQuarter: number | null
  lastQuarter: number | null
  /** Sekunden je km aus den gerundeten Werten; negativ = schneller. */
  deltaSPerKm: number | null
  excluded: number
}

export function paceAtSameHr(acts: StoredActivity[], today: string): PaceAtHr | null {
  const within = acts.filter((a) => diffDays(today, a.day) >= 0 && diffDays(today, a.day) < 365)
  const races = new Set(raceActivities(acts, today).map((a) => a.id))
  const pace = (a: StoredActivity) => (seconds(a)! / km(a))
  const runs = within.filter((a) => isRun(a) && km(a) > 0 && seconds(a))
  const med = median(runs.map(pace))
  if (med == null) return null
  const clean = runs.filter(
    (a) =>
      a.avgHr != null &&
      km(a) >= 6 &&
      km(a) <= 25 &&
      (a.elevM ?? 0) / km(a) <= 12 &&
      Math.abs(pace(a) - med) <= 0.25 * med &&
      !races.has(a.id) &&
      !soundsLikeQuality(a.name),
  )
  const excluded = runs.length - clean.length
  if (clean.length === 0) return null
  const hrs = clean.map((a) => a.avgHr!)
  let best = { lo: 0, n: 0 }
  for (let lo = Math.min(...hrs); lo <= Math.max(...hrs); lo++) {
    const n = hrs.filter((h) => h >= lo && h <= lo + 5).length
    if (n > best.n) best = { lo, n }
  }
  const inBand = clean.filter((a) => a.avgHr! >= best.lo && a.avgHr! <= best.lo + 5)
  const byMonth = new Map<string, number[]>()
  for (const a of inBand) byMonth.set(a.day.slice(0, 7), [...(byMonth.get(a.day.slice(0, 7)) ?? []), pace(a)])
  const monthly = [...byMonth.entries()]
    .filter(([, v]) => v.length >= 3)
    .map(([month, v]) => ({ month, paceSPerKm: Math.round(median(v)!), runs: v.length }))
    .sort((a, b) => a.month.localeCompare(b.month))
  const q = (from: number, to: number) => {
    const v = inBand.filter((a) => diffDays(today, a.day) >= from && diffDays(today, a.day) < to).map(pace)
    return v.length >= 3 ? Math.round(median(v)!) : null
  }
  const firstQuarter = q(274, 365)
  const lastQuarter = q(0, 91)
  return {
    bandLo: best.lo,
    bandHi: best.lo + 5,
    runsInBand: inBand.length,
    monthly,
    firstQuarter,
    lastQuarter,
    deltaSPerKm: firstQuarter != null && lastQuarter != null ? lastQuarter - firstQuarter : null,
    excluded,
  }
}

// --- Intensität und Gewohnheit ------------------------------------------------------

export interface EasyRun {
  id: string
  day: string
  hr: number | null
  paceSPerKm: number
  km: number
}

export interface Intensity {
  zoneMinutes: [number, number, number, number, number]
  easyShare: number | null
  easyRuns12w: EasyRun[]
  easyAboveZ3: number
  easyMedianHr: number | null
  easyMedianPace: number | null
  hardSessions12w: number
  hardAtOrAboveThreshold: number
  hardBackToBack: number
}

export function intensity(acts: StoredActivity[], today: string, thr: number | null, marathonPace: number | null): Intensity {
  const within = (a: StoredActivity, days: number) => diffDays(today, a.day) >= 0 && diffDays(today, a.day) < days
  const bounds = thr ? zoneBounds(thr) : null
  const zm: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  const runs12m = acts.filter((a) => isRunOrTrail(a) && within(a, 365))
  if (bounds) for (const a of runs12m) if (a.avgHr != null && seconds(a)) zm[zoneOf(a.avgHr, bounds) - 1] += seconds(a)! / 60
  const total = zm.reduce((x, y) => x + y, 0)
  const races = new Set(raceActivities(acts, today).map((a) => a.id))
  const easy = acts.filter(
    (a) => isRun(a) && within(a, 84) && km(a) >= 5 && km(a) <= 22 && seconds(a) && marathonPace != null && seconds(a)! / km(a) > marathonPace && !soundsLikeQuality(a.name),
  )
  const easyRuns12w: EasyRun[] = easy.map((a) => ({ id: a.id, day: a.day, hr: a.avgHr, paceSPerKm: Math.round(seconds(a)! / km(a)), km: Math.round(km(a) * 10) / 10 })).sort((x, y) => x.day.localeCompare(y.day))
  const hard = acts.filter((a) => isRun(a) && within(a, 84) && soundsHard(a.name) && !races.has(a.id))
  const hardDays = new Set<string>([...hard.map((a) => a.day), ...acts.filter((a) => races.has(a.id) && within(a, 84)).map((a) => a.day)])
  let back = 0
  for (const d of hardDays) if (hardDays.has(shiftDay(d, 1))) back++
  return {
    zoneMinutes: zm,
    easyShare: total > 0 ? (zm[0] + zm[1]) / total : null,
    easyRuns12w,
    easyAboveZ3: bounds ? easyRuns12w.filter((r) => r.hr != null && zoneOf(r.hr, bounds) >= 3).length : 0,
    easyMedianHr: median(easyRuns12w.map((r) => r.hr).filter((v): v is number => v != null)),
    easyMedianPace: median(easyRuns12w.map((r) => r.paceSPerKm)),
    hardSessions12w: hard.length,
    hardAtOrAboveThreshold: thr ? hard.filter((a) => a.avgHr != null && a.avgHr >= thr).length : 0,
    hardBackToBack: back,
  }
}

export interface Habit {
  grid: number[][] // [Wochentag 0–6][Stunde 0–23]
  before9Share: number | null
  mostCommon: { weekday: number; hour: number; runs: number } | null
}

export function habit(acts: StoredActivity[], today: string): Habit {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  let n = 0
  let before = 0
  for (const a of acts) {
    if (!isRunOrTrail(a) || diffDays(today, a.day) < 0 || diffDays(today, a.day) >= 365) continue
    grid[weekdayOf(a.day)][a.hour]++
    n++
    if (a.hour < 9) before++
  }
  let best: Habit['mostCommon'] = null
  grid.forEach((row, w) => row.forEach((c, h) => (c > 0 && (best == null || c > best.runs) ? (best = { weekday: w, hour: h, runs: c }) : null)))
  return { grid, before9Share: n ? before / n : null, mostCommon: best }
}

// --- Rekorde, Summen, Schuhe -----------------------------------------------------------

export interface Records {
  best5k: { s: number; day: string } | null
  best10k: { s: number; day: string } | null
  bestHalf: { s: number; day: string } | null
  longestRunKm: { km: number; day: string } | null
  biggestWeek: { km: number; start: string } | null
  mostElevation: { m: number; day: string; sport: string } | null
  earliestHour: { hour: number; day: string } | null
  bestMonth: { month: string; km: number } | null
}

function bestOver(acts: StoredActivity[], lo: number, hi: number, norm: number): { s: number; day: string } | null {
  let best: { s: number; day: string } | null = null
  for (const a of acts) {
    const s = seconds(a)
    if (!isRun(a) || a.distanceM == null || !s || a.distanceM < lo || a.distanceM > hi) continue
    // Bis 2 % Überlänge zählt die echte Zeit, darüber wird aufs Normmass umgerechnet.
    const t = a.distanceM <= norm * 1.02 ? s : (s * norm) / a.distanceM
    if (best == null || t < best.s) best = { s: Math.round(t), day: a.day }
  }
  return best
}

export function records(acts: StoredActivity[], today: string): Records {
  const w = weeklyVolume(acts, today)
  const wk = w.reduce<WeekRow | null>((b, r) => (b == null || r.km > b.km ? r : b), null)
  const runs = acts.filter(isRunOrTrail)
  const longest = runs.reduce<StoredActivity | null>((b, a) => (b == null || km(a) > km(b) ? a : b), null)
  const elev = acts.reduce<StoredActivity | null>((b, a) => (a.elevM != null && (b == null || a.elevM > (b.elevM ?? 0)) ? a : b), null)
  const early = acts.reduce<StoredActivity | null>((b, a) => (b == null || a.hour < b.hour ? a : b), null)
  const months = new Map<string, number>()
  for (const a of runs) months.set(a.day.slice(0, 7), (months.get(a.day.slice(0, 7)) ?? 0) + km(a))
  const bm = [...months.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    best5k: bestOver(acts, 4950, 5300, 5000),
    best10k: bestOver(acts, 9900, 10500, 10000),
    bestHalf: bestOver(acts, 21000, 21500, 21097.5),
    longestRunKm: longest && km(longest) > 0 ? { km: Math.round(km(longest) * 10) / 10, day: longest.day } : null,
    biggestWeek: wk && wk.km > 0 ? { km: Math.round(wk.km * 10) / 10, start: wk.start } : null,
    mostElevation: elev && elev.elevM ? { m: Math.round(elev.elevM), day: elev.day, sport: elev.sport } : null,
    earliestHour: early ? { hour: early.hour, day: early.day } : null,
    bestMonth: bm ? { month: bm[0], km: Math.round(bm[1] * 10) / 10 } : null,
  }
}

export interface Totals12m {
  runKm: number
  elevM: number
  hours: number
  calories: number
  sessions: number
  runs: number
  steps: number
}

export function totals12m(acts: StoredActivity[], today: string): Totals12m {
  const w = acts.filter((a) => diffDays(today, a.day) >= 0 && diffDays(today, a.day) < 365)
  const runs = w.filter(isRunOrTrail)
  return {
    runKm: Math.round(runs.reduce((x, a) => x + km(a), 0) * 10) / 10,
    elevM: Math.round(runs.reduce((x, a) => x + (a.elevM ?? 0), 0)),
    hours: Math.round((w.reduce((x, a) => x + (seconds(a) ?? 0), 0) / 3600) * 10) / 10,
    calories: Math.round(w.reduce((x, a) => x + (a.calories ?? 0), 0)),
    sessions: w.length,
    runs: runs.length,
    steps: Math.round(runs.reduce((x, a) => x + (a.cadence ?? 0) * ((seconds(a) ?? 0) / 60), 0)),
  }
}

export interface ShoeRow {
  name: string
  km: number
  first: string
  last: string
  kmLast4Weeks: number
}

export function shoes(acts: StoredActivity[], today: string): ShoeRow[] {
  const by = new Map<string, StoredActivity[]>()
  for (const a of acts) if (isRunOrTrail(a) && a.gear) by.set(a.gear, [...(by.get(a.gear) ?? []), a])
  return [...by.entries()]
    .map(([name, list]) => ({
      name,
      km: Math.round(list.reduce((x, a) => x + km(a), 0) * 10) / 10,
      first: list.reduce((m, a) => (a.day < m ? a.day : m), list[0].day),
      last: list.reduce((m, a) => (a.day > m ? a.day : m), list[0].day),
      kmLast4Weeks: Math.round(list.filter((a) => diffDays(today, a.day) >= 0 && diffDays(today, a.day) < 28).reduce((x, a) => x + km(a), 0) * 10) / 10,
    }))
    .sort((a, b) => b.km - a.km)
}

// --- Alles zusammen -----------------------------------------------------------------------

export interface RunMetrics {
  today: string
  restHr: number
  restHrAssumed: boolean
  maxHr: number | null
  threshold: Threshold | null
  zones: [number, number, number, number] | null
  series: DailySeries | null
  estimatedLoadCount: number
  form: { value: number; word: FormWord; fitness: number; fatigue: number } | null
  ramp: number | null
  acuteChronic: number | null
  monotony: number | null
  weeks: WeekRow[]
  jump: ReturnType<typeof volumeJump>
  weeklyGoal: number | null
  consistency: Consistency
  predictions: ReturnType<typeof predictions>
  easyPace: { fast: number; slow: number } | null
  paceAtHr: PaceAtHr | null
  intensity: Intensity
  habit: Habit
  records: Records
  totals: Totals12m
  shoes: ShoeRow[]
}

/** `restHr` fehlt: 50 und als «angenommen» gekennzeichnet. */
export function computeRunMetrics(acts: StoredActivity[], opts: { restHr?: number | null } = {}): RunMetrics | null {
  const today = todayOf(acts)
  if (!today) return null
  const restHr = opts.restHr ?? 50
  const thr = thresholdHr(acts)
  const series = dailySeries(acts, { restHr, thresholdHr: thr?.hr ?? null }, today)
  const pred = predictions(acts, today)
  const marathon = pred?.list.find((p) => p.key === 'marathon')
  const marathonPace = marathon ? marathon.vdotTime / 42.195 : null
  return {
    today,
    restHr,
    restHrAssumed: opts.restHr == null,
    maxHr: maxHeartRate(acts),
    threshold: thr,
    zones: thr ? zoneBounds(thr.hr) : null,
    series,
    estimatedLoadCount: acts.filter((a) => activityLoad(a, { restHr, thresholdHr: thr?.hr ?? null }).estimated).length,
    form: series
      ? { value: series.form[series.form.length - 1], word: formWord(series.form[series.form.length - 1]), fitness: series.fitness[series.fitness.length - 1], fatigue: series.fatigue[series.fatigue.length - 1] }
      : null,
    ramp: series ? ramp(series) : null,
    acuteChronic: series ? acuteChronic(series) : null,
    monotony: series ? monotony(series) : null,
    weeks: weeklyVolume(acts, today),
    jump: volumeJump(weeklyVolume(acts, today)),
    weeklyGoal: derivedWeeklyGoal(weeklyVolume(acts, today)),
    consistency: consistency(acts, today),
    predictions: pred,
    easyPace: pred ? { fast: Math.round(paceAtVo2Fraction(pred.vdot.vdot, 0.7)), slow: Math.round(paceAtVo2Fraction(pred.vdot.vdot, 0.62)) } : null,
    paceAtHr: paceAtSameHr(acts, today),
    intensity: intensity(acts, today, thr?.hr ?? null, marathonPace),
    habit: habit(acts, today),
    records: records(acts, today),
    totals: totals12m(acts, today),
    shoes: shoes(acts, today).filter((s) => diffDays(today, s.last) < 90),
  }
}
