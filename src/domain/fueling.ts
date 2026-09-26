import { rollingMean, toDay } from '@/domain/diary'
import type { InsightRule, RuleHit } from '@/domain/insightEngine'
import type { StoredDiaryEntry, StoredDiarySession } from '@/lib/store/localStore'

/**
 * Energie- und Kohlenhydratbedarf, Verpflegung je Einheit, Gewichtsband
 * (Master-Spezifikation E, Entscheidung 6: «Ernährung eher grösser»).
 *
 * WIE ÜBERALL IN DER ERNÄHRUNG: Spannen nach benannter Quelle, daneben das,
 * was gegessen wurde. Keine Anweisung, kein «iss mehr». Energieverfügbarkeit
 * (EA) wird bewusst NICHT gerechnet (Entscheidung 6): sie braucht die
 * fettfreie Masse und die Trainingsenergie, beides hätte hier nur geschätzt
 * werden können — und eine geschätzte EA mit einer Schwelle von 30 kcal/kg
 * FFM wäre eine Gesundheitsaussage auf Sand.
 *
 * QUELLEN (published):
 *   Kohlenhydrate je Tag nach Belastung und Protein je Tag:
 *     Thomas, Erdman, Burke (2016). ACSM/AND/DC Joint Position Statement:
 *     Nutrition and Athletic Performance. Med Sci Sports Exerc 48(3):543–568.
 *     Burke et al. (2011). Carbohydrates for training and competition.
 *     J Sports Sci 29 Suppl 1:S17–S27.
 *   Kohlenhydrate während der Einheit (30–60 g/h ab etwa 1 h, bis 90 g/h
 *     über 2,5 h mit Glukose-Fruktose-Gemischen):
 *     Thomas et al. (2016); Jeukendrup (2014). A step towards personalized
 *     sports nutrition: carbohydrate intake during exercise. Sports Med 44
 *     Suppl 1:S25–S33.
 *   Körpermasseverlust über 2 % als Marke für eingeschränkte Leistung:
 *     Sawka et al. (2007). ACSM Position Stand: Exercise and Fluid
 *     Replacement. Med Sci Sports Exerc 39(2):377–390.
 *
 * FESTLEGUNG DIESER APP (vorläufig, formulaRegistry): Die Stufe des Tagesbedarfs
 * wird aus den mittleren Trainingsminuten der letzten sieben Tage abgeleitet.
 * Die Quelle beschreibt die Stufen über Dauer UND Intensität («moderate
 * exercise ~1 h/day», «1–3 h/day moderate-to-high intensity», «>4–5 h/day»);
 * die Grenzen in Minuten sind die Übersetzung dieser App.
 */

export const FUELING_VERSION = '1.0.0'

export type LoadLevel = 'light' | 'moderate' | 'high' | 'very_high'

/** g Kohlenhydrate je kg Körpermasse und Tag (Thomas et al. 2016, Tab. 2). */
export const CARB_BANDS: Record<LoadLevel, [number, number]> = {
  light: [3, 5],
  moderate: [5, 7],
  high: [6, 10],
  very_high: [8, 12],
}
/** g Protein je kg und Tag (Thomas et al. 2016). */
export const PROTEIN_BAND: [number, number] = [1.2, 2.0]

/** Mittlere Trainingsminuten je Tag → Stufe. Festlegung dieser App. */
export function loadLevel(minutesPerDay: number): LoadLevel {
  if (minutesPerDay < 45) return 'light'
  if (minutesPerDay < 90) return 'moderate'
  if (minutesPerDay < 240) return 'high'
  return 'very_high'
}

function shift(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}

export interface DailyFuelNeed {
  minutesPerDay: number
  level: LoadLevel
  weightKg: number
  carbsG: [number, number]
  proteinG: [number, number]
  /** Tage mit Tagebucheintrag in den letzten sieben. */
  daysWithEntry: number
}

/**
 * Tagesspanne aus Körpermasse und mittlerer Trainingsdauer. Null ohne
 * Gewicht oder ohne einen einzigen Tagebucheintrag in sieben Tagen — ohne
 * Eintrag ist die Belastung unbekannt, nicht null.
 */
export function dailyFuelNeed(diary: StoredDiaryEntry[], today: string, weightKg: number | null): DailyFuelNeed | null {
  if (weightKg == null || weightKg <= 0) return null
  const byDay = new Map(diary.map((e) => [e.day, e]))
  let minutes = 0
  let days = 0
  for (let i = 0; i < 7; i++) {
    const e = byDay.get(shift(today, -i))
    if (!e) continue
    days++
    minutes += e.sessions.reduce((a, s) => a + s.durationMin, 0)
  }
  if (days === 0) return null
  // Mittel über die Tage MIT Eintrag: ein nicht erfasster Tag ist kein Ruhetag (§89).
  const minutesPerDay = minutes / days
  const level = loadLevel(minutesPerDay)
  const [cLo, cHi] = CARB_BANDS[level]
  return {
    minutesPerDay: Math.round(minutesPerDay),
    level,
    weightKg,
    carbsG: [Math.round(cLo * weightKg), Math.round(cHi * weightKg)],
    proteinG: [Math.round(PROTEIN_BAND[0] * weightKg), Math.round(PROTEIN_BAND[1] * weightKg)],
    daysWithEntry: days,
  }
}

// --- Verpflegung je Einheit ---------------------------------------------------

/** Empfohlene Spanne während der Einheit nach Dauer, in g/h — oder eine Kategorie ohne Zahl. */
export type IntraBand = { kind: 'none' } | { kind: 'small' } | { kind: 'range'; lo: number; hi: number }

export function intraSessionBand(durationMin: number): IntraBand {
  if (durationMin < 45) return { kind: 'none' }
  if (durationMin < 75) return { kind: 'small' }
  if (durationMin <= 150) return { kind: 'range', lo: 30, hi: 60 }
  return { kind: 'range', lo: 60, hi: 90 }
}

export interface SessionFueling {
  sessionId: string
  day: string
  durationMin: number
  carbsPerHour: number | null
  band: IntraBand
  /** Liegt die Zufuhr unter der unteren Grenze der Spanne? null ohne Angabe oder ohne Spanne. */
  belowBand: boolean | null
  /** Schweissrate in l/h: (Masse vorher − nachher + Trinkmenge) / Stunden. */
  sweatRateLph: number | null
  /** Körpermasseverlust in Prozent der Masse vorher. */
  massLossPct: number | null
  giScore: number | null
}

export function sessionFueling(s: StoredDiarySession, day: string): SessionFueling {
  const hours = s.durationMin / 60
  const band = intraSessionBand(s.durationMin)
  const carbsPerHour = s.carbsG != null && hours > 0 ? Math.round(s.carbsG / hours) : null
  const belowBand = carbsPerHour == null || band.kind !== 'range' ? null : carbsPerHour < band.lo
  let sweatRateLph: number | null = null
  let massLossPct: number | null = null
  if (s.massBeforeKg != null && s.massAfterKg != null && s.massBeforeKg > 0 && hours > 0) {
    const lossKg = s.massBeforeKg - s.massAfterKg
    massLossPct = Math.round((lossKg / s.massBeforeKg) * 1000) / 10
    // 1 kg Körpermasse ≈ 1 l Schweiss; Urin und Atemwasser sind nicht abgezogen.
    sweatRateLph = Math.round(((lossKg + (s.fluidMl ?? 0) / 1000) / hours) * 100) / 100
  }
  return { sessionId: s.id, day, durationMin: s.durationMin, carbsPerHour, band, belowBand, sweatRateLph, massLossPct, giScore: s.giScore ?? null }
}

/** Alle Einheiten mit irgendeiner Verpflegungsangabe in den letzten `days` Tagen, jüngste zuerst. */
export function recentFueling(diary: StoredDiaryEntry[], today: string, days = 28): SessionFueling[] {
  const from = shift(today, -(days - 1))
  return diary
    .filter((e) => e.day >= from && e.day <= today)
    .sort((a, b) => b.day.localeCompare(a.day))
    .flatMap((e) =>
      e.sessions
        .filter((s) => s.carbsG != null || s.fluidMl != null || s.giScore != null || (s.massBeforeKg != null && s.massAfterKg != null))
        .map((s) => sessionFueling(s, e.day)),
    )
}

// --- Gewichtsband ------------------------------------------------------------

/**
 * Wöchentliche Gewichtsänderung in Prozent der Körpermasse: 7-Tage-Mittel
 * bis `end` gegen das 7-Tage-Mittel eine Woche davor. Null ohne je zwei
 * Wägungen in beiden Wochen — ein Tagesgewicht schwankt um mehr als ein
 * Wochentrend.
 */
export function weeklyWeightRate(diary: StoredDiaryEntry[], end: string): number | null {
  const now = rollingMean(diary, 'weightKg', end, 7)
  const before = rollingMean(diary, 'weightKg', shift(end, -7), 7)
  if (now.mean == null || before.mean == null || now.n < 2 || before.n < 2 || before.mean <= 0) return null
  return Math.round(((now.mean - before.mean) / before.mean) * 1000) / 10
}

export type BandPosition = 'below' | 'within' | 'above'

export function bandPosition(rate: number, band: { minPctWeek: number; maxPctWeek: number }): BandPosition {
  return rate < band.minPctWeek ? 'below' : rate > band.maxPctWeek ? 'above' : 'within'
}

// --- Regeln ----------------------------------------------------------------------

const fuelingBelowPlan: InsightRule = {
  id: 'fueling_below_plan',
  version: FUELING_VERSION,
  category: 'nutrition',
  severity: 'info',
  cooldownDays: 14,
  requires: 'nutrition',
  evaluate: (ctx) => {
    const below = recentFueling(ctx.diary, ctx.today, 14).filter((f) => f.belowBand === true)
    if (below.length < 2) return []
    const hit: RuleHit = {
      values: { count: below.length, perHour: below[0].carbsPerHour ?? 0 },
      evidence: below.slice(0, 4).map((f) => ({ kind: 'diary' as const, id: f.sessionId, key: 'carbs_per_hour', value: f.carbsPerHour ?? 0, day: f.day })),
      whyNow: 'sessions_below_band',
      confidence: below.length >= 3 ? 0.8 : 0.6,
      link: { kind: 'route', target: '/ernaehrung' },
    }
    return [hit]
  },
}

const giIssuePattern: InsightRule = {
  id: 'gi_issue_pattern',
  version: FUELING_VERSION,
  category: 'nutrition',
  severity: 'notice',
  cooldownDays: 14,
  requires: 'nutrition',
  evaluate: (ctx) => {
    const gi = recentFueling(ctx.diary, ctx.today, 14).filter((f) => (f.giScore ?? 0) >= 2)
    if (gi.length < 2) return []
    return [
      {
        values: { count: gi.length },
        evidence: gi.slice(0, 4).map((f) => ({ kind: 'diary' as const, id: f.sessionId, key: 'gi_score', value: f.giScore ?? 0, day: f.day })),
        whyNow: 'gi_repeated',
        confidence: gi.length >= 3 ? 0.8 : 0.6,
        link: { kind: 'route', target: '/ernaehrung' },
      },
    ]
  },
}

const weightRateOutsideTarget: InsightRule = {
  id: 'weight_rate_outside_target',
  version: FUELING_VERSION,
  category: 'nutrition',
  severity: 'notice',
  cooldownDays: 14,
  requires: 'nutrition',
  evaluate: (ctx) => {
    const band = ctx.nutrition.weightRateBand
    if (!band) return []
    const thisWeek = weeklyWeightRate(ctx.diary, ctx.today)
    const lastWeek = weeklyWeightRate(ctx.diary, shift(ctx.today, -7))
    if (thisWeek == null || lastWeek == null) return []
    const a = bandPosition(thisWeek, band)
    const b = bandPosition(lastWeek, band)
    // Zwei Wochen in Folge auf derselben Seite — eine Woche ist Wasser.
    if (a === 'within' || a !== b) return []
    return [
      {
        subject: a,
        values: { rate: thisWeek, previous: lastWeek, min: band.minPctWeek, max: band.maxPctWeek },
        evidence: [
          { kind: 'metric', key: 'weight_rate_pct_week', value: lastWeek, day: shift(ctx.today, -7) },
          { kind: 'metric', key: 'weight_rate_pct_week', value: thisWeek, day: ctx.today },
        ],
        whyNow: a === 'below' ? 'two_weeks_below_band' : 'two_weeks_above_band',
        confidence: 0.7,
        link: { kind: 'route', target: '/ernaehrung' },
      },
    ]
  },
}

export const FUELING_RULES: InsightRule[] = [fuelingBelowPlan, giIssuePattern, weightRateOutsideTarget]
