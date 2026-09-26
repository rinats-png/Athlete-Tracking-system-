import type { StoredDiaryEntry } from '@/lib/store/localStore'
import { dayLoad, toDay } from '@/domain/diary'
import { buildMetric, type DerivedMetric } from '@/domain/metricContract'

/**
 * Trainingslast im Verlauf (Master-Spezifikation D6).
 *
 * GRUNDLAGE: die Session-Last nach Foster (Dauer × Session-RPE, in AU) aus
 * dem Tagebuch — dieselbe Zahl wie in domain/diary.ts, an genau einer Stelle
 * gerechnet. Diese Datei fasst sie nur zusammen.
 *
 * WAS SIE LIEFERT, rein beschreibend:
 *   - Summen über 7, 28 und 90 Tage und die Wochenlasten der letzten zwölf
 *     Wochen,
 *   - die Veränderung dieser Woche gegen die Woche davor in Prozent,
 *   - Monotonie und Strain nach Foster (1998) für die laufende Woche.
 *
 * WAS SIE NICHT LIEFERT: ein Verletzungsrisiko, einen «Sweet Spot», eine
 * Ampel. Der A:C-Quotient bleibt in diary.ts eine beschreibende Zahl; hier
 * kommt er gar nicht vor. Eine Wochenlast ist nur mit den eigenen Wochen
 * vergleichbar — ein RPE von 7 heisst bei zwei Menschen nicht dasselbe.
 */

export const LOAD_ALGORITHM = 'srpe_foster_sums'
export const LOAD_VERSION = '1.0.0'

function shift(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}

export interface WeekLoad {
  /** Letzter Tag der Woche (die Woche endet an diesem Tag). */
  end: string
  load: number
  /** An wie vielen Tagen der Woche es einen Eintrag gab. */
  daysWithEntry: number
}

export interface LoadSummary {
  today: string
  load7: DerivedMetric<number>
  load28: DerivedMetric<number>
  load90: DerivedMetric<number>
  /** Zwölf Wochen, älteste zuerst. Die letzte endet heute. */
  weeks: WeekLoad[]
  /** Diese Woche gegen die Woche davor, in Prozent. */
  weeklyChangePct: DerivedMetric<number>
  /** Mittlere Wochenlast der vier Wochen vor dieser. */
  typicalWeek: number | null
  /** Foster: Mittel der Tageslasten / Standardabweichung, über die laufende Woche. */
  monotony: DerivedMetric<number>
  /** Foster: Wochenlast × Monotonie. */
  strain: DerivedMetric<number>
}

function sumWindow(byDay: Map<string, StoredDiaryEntry>, end: string, days: number): { load: number; daysWithEntry: number } {
  let load = 0
  let daysWithEntry = 0
  for (let i = 0; i < days; i++) {
    const e = byDay.get(shift(end, -i))
    if (e) {
      daysWithEntry++
      load += dayLoad(e)
    }
  }
  return { load, daysWithEntry }
}

export function loadSummary(diary: StoredDiaryEntry[], today: string = toDay(new Date())): LoadSummary {
  const byDay = new Map(diary.map((e) => [e.day, e]))
  const period = (days: number) => ({ from: shift(today, -(days - 1)), to: today })

  const sum = (days: number, min: number) => {
    const w = sumWindow(byDay, today, days)
    return buildMetric(
      { key: `load_${days}d`, algorithm: LOAD_ALGORITHM, algorithmVersion: LOAD_VERSION, unit: 'AU', minSample: min, targetSample: Math.ceil(days * 0.8) },
      { value: w.load, sampleSize: w.daysWithEntry, period: period(days), completeness: w.daysWithEntry / days, warnings: ['self_report'] },
    )
  }

  const weeks: WeekLoad[] = []
  for (let i = 11; i >= 0; i--) {
    const end = shift(today, -7 * i)
    const w = sumWindow(byDay, end, 7)
    weeks.push({ end, ...w })
  }

  const thisWeek = weeks[11]
  const prevWeek = weeks[10]
  const changeValue = prevWeek.load > 0 && prevWeek.daysWithEntry >= 3 ? ((thisWeek.load - prevWeek.load) / prevWeek.load) * 100 : null
  const weeklyChangePct = buildMetric(
    { key: 'load_weekly_change_pct', algorithm: LOAD_ALGORITHM, algorithmVersion: LOAD_VERSION, unit: '%', minSample: 3, targetSample: 6 },
    {
      value: changeValue == null ? null : Math.round(changeValue * 10) / 10,
      sampleSize: Math.min(thisWeek.daysWithEntry, prevWeek.daysWithEntry),
      period: { from: shift(today, -13), to: today },
      warnings: ['self_report'],
    },
  )

  const previousFour = weeks.slice(7, 11).filter((w) => w.daysWithEntry >= 3)
  const typicalWeek = previousFour.length >= 2 ? previousFour.reduce((s, w) => s + w.load, 0) / previousFour.length : null

  // Monotonie nach Foster: Tageslasten der laufenden Woche, Ruhetage mit 0 —
  // aber nur Tage, an denen es einen Eintrag gibt. Ein Tag ohne Eintrag ist
  // «nicht erfasst», nicht «Ruhetag» (§89).
  const dayLoads: number[] = []
  for (let i = 0; i < 7; i++) {
    const e = byDay.get(shift(today, -i))
    if (e) dayLoads.push(dayLoad(e))
  }
  let monotonyValue: number | null = null
  if (dayLoads.length >= 5) {
    const mean = dayLoads.reduce((s, x) => s + x, 0) / dayLoads.length
    const sd = Math.sqrt(dayLoads.reduce((s, x) => s + (x - mean) ** 2, 0) / dayLoads.length)
    monotonyValue = sd > 0 ? Math.round((mean / sd) * 100) / 100 : null
  }
  const monoSpec = { algorithm: 'foster_monotony', algorithmVersion: '1.0.0', minSample: 5, targetSample: 7 }
  const monotony = buildMetric(
    { ...monoSpec, key: 'load_monotony', unit: '' },
    { value: monotonyValue, sampleSize: dayLoads.length, period: period(7), warnings: ['self_report'] },
  )
  const strain = buildMetric(
    { ...monoSpec, key: 'load_strain', unit: 'AU' },
    {
      value: monotonyValue == null ? null : Math.round(thisWeek.load * monotonyValue),
      sampleSize: dayLoads.length,
      period: period(7),
      warnings: ['self_report'],
    },
  )

  return {
    today,
    load7: sum(7, 3),
    load28: sum(28, 10),
    load90: sum(90, 30),
    weeks,
    weeklyChangePct,
    typicalWeek: typicalWeek == null ? null : Math.round(typicalWeek),
    monotony,
    strain,
  }
}

/**
 * Ob die laufende Woche deutlich über dem eigenen Niveau liegt — für die
 * Regel `load_spike_review`. Die Schwelle ist eine Festlegung dieser App
 * (vorläufig, siehe formulaRegistry), kein Grenzwert aus der Literatur.
 */
export const LOAD_SPIKE_PCT = 30

export function loadSpike(summary: LoadSummary): { spike: boolean; pct: number | null } {
  const week = summary.weeks[summary.weeks.length - 1]
  if (summary.typicalWeek == null || summary.typicalWeek <= 0 || week.daysWithEntry < 3) return { spike: false, pct: null }
  const pct = ((week.load - summary.typicalWeek) / summary.typicalWeek) * 100
  return { spike: pct > LOAD_SPIKE_PCT, pct: Math.round(pct) }
}
