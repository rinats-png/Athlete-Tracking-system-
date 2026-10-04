import type { StoredAthlete, StoredDiaryEntry } from '@/lib/store/localStore'

/**
 * Der 15-Sekunden-Check-in (Produktdoktrin §4, §32).
 *
 * Drei Zahlen von 1 bis 5 — Energie, Muskelkater, Stress. Sie stehen im
 * Tagebuch (dieselben Felder), der Check-in ist nur der schnellste Weg
 * dorthin. Es ist eine SELBSTEINSCHÄTZUNG: keine Messung, keine Freigabe,
 * kein Bereitschaftsurteil (§82). Ausgewertet wird nur gegen die EIGENE
 * Baseline des Athleten — nie gegen andere und nie gegen einen Normwert.
 */

export const CHECKIN_FIELDS = ['energy', 'soreness', 'stress'] as const
export type CheckinField = (typeof CHECKIN_FIELDS)[number]

export interface CheckIn {
  day: string
  energy: number | null
  soreness: number | null
  stress: number | null
}

/** Die Tage, deren Mittel die persönliche Baseline bilden. */
export const BASELINE_DAYS = 28
/** Die jüngsten Tage, die gegen die Baseline gestellt werden. */
export const RECENT_DAYS = 3
/** Mindestzahl an Werten in der Baseline und im jüngsten Fenster, sonst keine Aussage. */
export const BASELINE_MIN = 7
export const RECENT_MIN = 2
/**
 * Ab wie vielen Skalenpunkten Abstand zur eigenen Baseline etwas auffällt.
 * Eine Produktentscheidung, keine Messung: bei einer Fünferskala heißt ein
 * Punkt einen Schritt auf dem Bogen. Die Schwelle ist offen benannt und wird
 * mit Trainern geprüft (docs/umbauplan.md).
 */
export const DEVIATION_POINTS = 1

const DAY = 86_400_000
const dayOf = (d: Date) => d.toISOString().slice(0, 10)
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY

const has = (e: Pick<CheckIn, CheckinField>) => e.energy != null || e.soreness != null || e.stress != null

/** Die Check-ins aus dem Tagebuch: jeder Eintrag, der mindestens einen der drei Werte trägt. */
export function checkinsOf(diary: Pick<StoredDiaryEntry, 'day' | 'energy' | 'soreness' | 'stress'>[]): CheckIn[] {
  return diary
    .map((e) => ({ day: e.day, energy: e.energy ?? null, soreness: e.soreness ?? null, stress: e.stress ?? null }))
    .filter(has)
    .sort((a, b) => a.day.localeCompare(b.day))
}

/** Alle drei Werte angegeben. */
export const isComplete = (c: Pick<CheckIn, CheckinField>): boolean => c.energy != null && c.soreness != null && c.stress != null

export interface Deviation {
  field: CheckinField
  recent: number
  baseline: number
  /** Jüngstes Mittel minus Baseline-Mittel, in Skalenpunkten. */
  delta: number
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/**
 * Abweichung der letzten drei Tage von der eigenen Baseline der 28 Tage davor.
 *
 * Auffällig heißt: Muskelkater oder Stress um mindestens einen Punkt höher,
 * Energie um mindestens einen Punkt niedriger. Das ist eine BESCHREIBUNG («im
 * gleichen Zeitraum höher als sonst»), keine Ursache und keine Handlungsanweisung.
 * Ohne genug Werte (BASELINE_MIN, RECENT_MIN) gibt es keine Aussage.
 */
export function baselineDeviations(checkins: CheckIn[], asOf: Date = new Date()): Deviation[] {
  const today = dayNumber(dayOf(asOf))
  const out: Deviation[] = []
  for (const field of CHECKIN_FIELDS) {
    const recent: number[] = []
    const base: number[] = []
    for (const c of checkins) {
      const v = c[field]
      if (v == null) continue
      const age = today - dayNumber(c.day)
      if (age < 0) continue
      if (age < RECENT_DAYS) recent.push(v)
      else if (age < RECENT_DAYS + BASELINE_DAYS) base.push(v)
    }
    if (recent.length < RECENT_MIN || base.length < BASELINE_MIN) continue
    const r = mean(recent)
    const b = mean(base)
    const delta = Math.round((r - b) * 10) / 10
    const worse = field === 'energy' ? delta <= -DEVIATION_POINTS : delta >= DEVIATION_POINTS
    if (worse) out.push({ field, recent: Math.round(r * 10) / 10, baseline: Math.round(b * 10) / 10, delta })
  }
  return out
}

export interface TeamCheckinRow {
  id: string
  name: string
  /** Tage dieser Woche (Montag bis heute) mit mindestens einem Wert. */
  daysThisWeek: number
  lastDay: string | null
  deviations: Deviation[]
}

export interface TeamCheckins {
  /** Athleten, die diese Woche mindestens einmal einen Check-in haben. */
  withCheckin: number
  total: number
  rows: TeamCheckinRow[]
  /** Auffällige gegenüber der eigenen Baseline, stärkste Abweichung zuerst. */
  flagged: TeamCheckinRow[]
}

export function weekStartOf(asOf: Date): string {
  const weekday = (asOf.getUTCDay() + 6) % 7
  return new Date((dayNumber(dayOf(asOf)) - weekday) * DAY).toISOString().slice(0, 10)
}

/** Aus Check-ins je Athlet die Lage des Teams: wer hat sich gemeldet, wer weicht von sich selbst ab. */
export function teamCheckins(people: { id: string; name: string; checkins: CheckIn[] }[], asOf: Date = new Date()): TeamCheckins {
  const from = weekStartOf(asOf)
  const today = dayOf(asOf)
  const rows: TeamCheckinRow[] = people.map((p) => {
    const week = p.checkins.filter((c) => c.day >= from && c.day <= today)
    return {
      id: p.id,
      name: p.name,
      daysThisWeek: new Set(week.map((c) => c.day)).size,
      lastDay: p.checkins.length > 0 ? p.checkins[p.checkins.length - 1].day : null,
      deviations: baselineDeviations(p.checkins, asOf),
    }
  })
  const strength = (r: TeamCheckinRow) => Math.max(0, ...r.deviations.map((d) => Math.abs(d.delta)))
  return {
    withCheckin: rows.filter((r) => r.daysThisWeek > 0).length,
    total: rows.length,
    rows,
    flagged: rows.filter((r) => r.deviations.length > 0).sort((a, b) => strength(b) - strength(a) || a.name.localeCompare(b.name)),
  }
}

/** Die Check-ins der lokal geführten Athleten eines Trainers. */
export function teamCheckinsLocal(athletes: StoredAthlete[], asOf: Date = new Date()): TeamCheckins {
  return teamCheckins(
    athletes.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name || a.profile.firstName || '', checkins: checkinsOf(a.diary) })),
    asOf,
  )
}
