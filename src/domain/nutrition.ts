import { buildMetric, type DerivedMetric } from '@/domain/metricContract'
import { coreFoodByKey, type Per100 } from '@/data/foods'
import { rollingMean, toDay, window as diaryWindow } from '@/domain/diary'
import type { StoredDiaryEntry, StoredMeal, StoredMealItem } from '@/lib/store/localStore'

/**
 * Ernährung rechnen — Schicht S4 aus docs/ausbau.md.
 *
 * DIE EINE REGEL, DIE ALLES HIER PRÄGT (docs/ausbau.md, Abschnitt 4): Die
 * App rechnet REFERENZWERTE nach benannter Formel mit benannter Quelle und
 * benanntem Fehler — und stellt daneben, was gegessen wurde. Sie sagt nie
 * «iss 3.265 kcal». Sie sagt: «Die Formel schätzt 3.265. Du lagst bei
 * 2.398. Dein beobachteter Umsatz liegt bei 2.909.» Das ist dieselbe
 * Konstruktion wie ein Perzentil: ein Massstab, kein Befehl (§81).
 *
 * Formeln aus dem Coaching-System v4.0.0, geprüft gegen dessen Testbericht
 * (tests/nutrition.spec.ts):
 *
 *   Grundumsatz     Mifflin-St Jeor 1990: 10·kg + 6,25·cm − 5·Jahre + s
 *                   (s = +5 Männer, −161 Frauen). Schätzfehler etwa ±10 %.
 *   Gesamtumsatz    Grundumsatz × PAL — der PAL ist eine Selbstauskunft.
 *   Beobachteter    Ø Zufuhr − (Δ Gewicht · 7.700 / Tage), erst ab 14
 *   Umsatz          Datentagen: darunter dominieren Wasser und Glykogen.
 *   Energie         KH·4 + Protein·4 + Fett·9
 *   Mikro-          Anteil der Lebensmittel mit hinterlegten Mikronährstoffen
 *   Abdeckung       — eine Aussage über die DATEN, nicht über die Ernährung.
 *
 * Gemessen schlägt geschätzt: wo der beobachtete Umsatz vorliegt, steht er
 * vor dem berechneten.
 */

export const KCAL_PER_KG_BODY_MASS = 7700
export const OBSERVED_MIN_DAYS = 14
export const OBSERVED_WINDOW_DAYS = 28
export const MIFFLIN_ERROR_PCT = 10

/** Die PAL-Stufen, wie v4 sie führt. Eine Selbstauskunft, keine Messung. */
export const PAL_LEVELS = [1.2, 1.375, 1.55, 1.725, 1.9] as const
export type Pal = (typeof PAL_LEVELS)[number]

export interface Macros {
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }

/** Energie aus den Makros — v4 rechnet so, wo keine kcal-Angabe vorliegt. */
export function kcalFromMacros(m: Pick<Macros, 'protein' | 'fat' | 'carbs'>): number {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9
}

/** Die Nährwerte einer Position: per100 des Lebensmittels, auf die Grammzahl. */
export function itemMacros(item: StoredMealItem): Macros {
  const f = item.grams / 100
  const p = item.per100
  return { kcal: p.kcal * f, protein: p.protein * f, fat: p.fat * f, carbs: p.carbs * f, fiber: p.fiber * f }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce((s, m) => ({ kcal: s.kcal + m.kcal, protein: s.protein + m.protein, fat: s.fat + m.fat, carbs: s.carbs + m.carbs, fiber: s.fiber + m.fiber }), { ...EMPTY_MACROS })
}

export function mealMacros(meal: Pick<StoredMeal, 'items'>): Macros {
  return sumMacros(meal.items.map(itemMacros))
}

export function dayMacros(meals: StoredMeal[], day: string): Macros {
  return sumMacros(meals.filter((m) => m.day === day).map(mealMacros))
}

/** Anteil der Positionen mit hinterlegten Mikronährstoffen — Kern-Einträge, die welche tragen. */
export function microCoverage(meals: StoredMeal[], day: string): { covered: number; total: number } {
  const items = meals.filter((m) => m.day === day).flatMap((m) => m.items)
  const covered = items.filter((i) => i.source === 'core' && i.foodKey != null && coreFoodByKey(i.foodKey)?.micro != null).length
  return { covered, total: items.length }
}

/** Grundumsatz nach Mifflin-St Jeor 1990. Null, wenn eine Grösse fehlt — kein geratener Körper. */
export function bmrMifflin(input: { weightKg: number | null; heightCm: number | null; ageYears: number | null; sex: 'male' | 'female' | 'other' | null }): number | null {
  const { weightKg, heightCm, ageYears, sex } = input
  if (weightKg == null || heightCm == null || ageYears == null) return null
  // Für 'other' gibt es keine belegte Konstante. Lieber keine Zahl als eine erfundene.
  if (sex !== 'male' && sex !== 'female') return null
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === 'male' ? 5 : -161)
}

export function tdeeFromBmr(bmr: number | null, pal: number): number | null {
  return bmr == null ? null : Math.round(bmr * pal)
}

/**
 * Beobachteter Umsatz über die letzten 28 Tage: mittlere Zufuhr an Tagen mit
 * Mahlzeiten, korrigiert um die Gewichtsänderung (7-Tage-Mittel am Ende
 * gegen 7-Tage-Mittel am Anfang, weil Tagesgewichte schwanken).
 *
 * Null unter 14 Tagen mit Zufuhr ODER ohne Gewicht an beiden Enden. Ein
 * Umsatz aus einer Woche wäre eine Wasserbilanz, kein Umsatz.
 */
export function observedTdee(meals: StoredMeal[], diary: StoredDiaryEntry[], endDay = toDay(new Date())): { tdee: number; intakeMean: number; weightDelta: number; days: number } | null {
  const days = diaryWindow([], endDay, OBSERVED_WINDOW_DAYS).map((w) => w.day)
  const intakes = days.map((d) => dayMacros(meals, d).kcal).filter((k) => k > 0)
  if (intakes.length < OBSERVED_MIN_DAYS) return null
  const endW = rollingMean(diary, 'weightKg', endDay, 7)
  const startW = rollingMean(diary, 'weightKg', days[6], 7)
  if (endW.mean == null || startW.mean == null || endW.n < 2 || startW.n < 2) return null
  const intakeMean = intakes.reduce((a, b) => a + b, 0) / intakes.length
  const weightDelta = endW.mean - startW.mean
  const tdee = Math.round(intakeMean - (weightDelta * KCAL_PER_KG_BODY_MASS) / OBSERVED_WINDOW_DAYS)
  return { tdee, intakeMean, weightDelta, days: intakes.length }
}

/** Reine Formelvariante für Prüffälle und für die Anzeige der Herleitung. */
export function observedTdeeFormula(intakeMean: number, weightDeltaKg: number, days: number): number {
  return Math.round(intakeMean - (weightDeltaKg * KCAL_PER_KG_BODY_MASS) / days)
}

/** Eine Position aus einem Kern-Lebensmittel bauen. */
export function itemFromCore(foodKey: string, grams: number, id: string): StoredMealItem | null {
  const f = coreFoodByKey(foodKey)
  if (!f) return null
  return { id, foodKey, name: f.name, source: 'core', grams, per100: strip(f.per100), barcode: null }
}

function strip(p: Per100): StoredMealItem['per100'] {
  return { kcal: p.kcal, protein: p.protein, fat: p.fat, carbs: p.carbs, fiber: p.fiber }
}

/**
 * Der beobachtete Umsatz nach dem Metric Contract: als Schätzung markiert,
 * mit Stichprobe (Tage mit Zufuhr) und Vollständigkeit über 28 Tage.
 */

export function observedTdeeMetric(meals: StoredMeal[], diary: StoredDiaryEntry[], today: string): DerivedMetric<number> & { weightDelta: number | null } {
  const o = observedTdee(meals, diary, today)
  const metric = buildMetric(
    {
      key: 'observed_tdee',
      algorithm: 'observed_tdee_energy_balance',
      algorithmVersion: '1.0.0',
      unit: 'kcal',
      minSample: OBSERVED_MIN_DAYS,
      targetSample: 24,
      estimate: true,
    },
    {
      value: o?.tdee ?? null,
      sampleSize: o?.days ?? 0,
      period: { from: toDay(new Date(Date.parse(`${today}T00:00:00Z`) - (OBSERVED_WINDOW_DAYS - 1) * 86_400_000)), to: today },
      completeness: o ? o.days / OBSERVED_WINDOW_DAYS : undefined,
      warnings: ['self_report'],
    },
  )
  return { ...metric, weightDelta: o?.weightDelta ?? null }
}
