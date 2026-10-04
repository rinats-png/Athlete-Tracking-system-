import type { RunMetrics } from '@/domain/runMetrics'

/**
 * Der eine Befund und die sechs Insights zu den Läufen (docs/laeufe.md, Stufe 3).
 * Regelbasiert und beschreibend: die Zahlen kommen aus `runMetrics`, die Worte
 * aus den Wörterbüchern. Keine Anweisung, keine Diagnose. «Hinweis» heisst
 * dünne oder alte Grundlage, «belegt» heisst genug Einheiten dahinter.
 */

export type FindingKind = 'easy_too_hard' | 'volume_jump' | 'hard_too_hard' | 'overload' | 'progress' | 'steady'

export interface Finding {
  kind: FindingKind
  /** Drei Belegzahlen als fertige Texte (Schlüssel + Wert). */
  numbers: { key: string; value: number; unit?: string }[]
  params: Record<string, number | string>
  basis: 'evidenced' | 'hint'
}

/** Ein Befund: die Sache, die am deutlichsten steht — in beide Richtungen. */
export function findFinding(m: RunMetrics): Finding {
  const i = m.intensity
  const easyN = i.easyRuns12w.length
  if (easyN >= 6 && i.easyAboveZ3 / easyN >= 0.5) {
    return {
      kind: 'easy_too_hard',
      numbers: [
        { key: 'easyAboveZ3', value: i.easyAboveZ3 },
        { key: 'easyTotal', value: easyN },
        { key: 'medianHr', value: Math.round(i.easyMedianHr ?? 0), unit: 'bpm' },
      ],
      params: { above: i.easyAboveZ3, total: easyN, zone3: m.zones?.[1] ?? 0 },
      basis: 'evidenced',
    }
  }
  if (m.jump) {
    return {
      kind: 'volume_jump',
      numbers: [
        { key: 'jumpPct', value: m.jump.pct, unit: '%' },
        { key: 'weekKm', value: Math.round(m.jump.km), unit: 'km' },
        { key: 'ramp', value: Math.round((m.ramp ?? 0) * 10) / 10 },
      ],
      params: { pct: m.jump.pct, km: Math.round(m.jump.km) },
      basis: 'evidenced',
    }
  }
  if (i.hardSessions12w >= 3 && i.hardAtOrAboveThreshold / i.hardSessions12w >= 0.5) {
    return {
      kind: 'hard_too_hard',
      numbers: [
        { key: 'hardAbove', value: i.hardAtOrAboveThreshold },
        { key: 'hardTotal', value: i.hardSessions12w },
        { key: 'threshold', value: m.threshold?.hr ?? 0, unit: 'bpm' },
      ],
      params: { above: i.hardAtOrAboveThreshold, total: i.hardSessions12w, thr: m.threshold?.hr ?? 0 },
      basis: 'hint',
    }
  }
  if (m.form && m.form.value < -25) {
    return {
      kind: 'overload',
      numbers: [
        { key: 'form', value: Math.round(m.form.value) },
        { key: 'fitness', value: Math.round(m.form.fitness) },
        { key: 'fatigue', value: Math.round(m.form.fatigue) },
      ],
      params: { form: Math.round(m.form.value) },
      basis: 'evidenced',
    }
  }
  const d = m.paceAtHr?.deltaSPerKm
  if (d != null && d <= -10 && m.paceAtHr) {
    return {
      kind: 'progress',
      numbers: [
        { key: 'deltaPace', value: Math.abs(d), unit: 's/km' },
        { key: 'runsInBand', value: m.paceAtHr.runsInBand },
        { key: 'vdot', value: Math.round((m.predictions?.vdot.vdot ?? 0) * 10) / 10 },
      ],
      params: { delta: Math.abs(d), lo: m.paceAtHr.bandLo, hi: m.paceAtHr.bandHi },
      basis: m.paceAtHr.runsInBand >= 10 ? 'evidenced' : 'hint',
    }
  }
  return {
    kind: 'steady',
    numbers: [
      { key: 'weeksHit', value: m.consistency.hitsLastSix },
      { key: 'activeDays', value: m.consistency.activeDays },
      { key: 'runs', value: m.totals.runs },
    ],
    params: { hits: m.consistency.hitsLastSix },
    basis: 'hint',
  }
}

export type InsightKey = 'progress' | 'risk' | 'race' | 'consistency' | 'habit' | 'gear'

export interface Insight {
  key: InsightKey
  /** Der grosse Wert: Zahl (UI formatiert nach Sprache), Zeit in Sekunden oder Text. */
  value: { type: 'number'; n: number; digits: number } | { type: 'seconds'; s: number } | { type: 'text'; text: string }
  unit?: 'vdot' | 'km' | 'percent'
  params: Record<string, number | string>
  basis: 'evidenced' | 'hint'
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000)

/** Bis zu sechs Insights, jedes aus einer anderen Ecke; was nicht rechenbar ist, fällt weg. */
export function findInsights(m: RunMetrics): Insight[] {
  const out: Insight[] = []
  if (m.predictions) {
    const v = Math.round(m.predictions.vdot.vdot * 10) / 10
    const age = daysBetween(m.today, m.predictions.vdot.day)
    out.push({ key: 'progress', value: { type: 'number', n: v, digits: 1 }, unit: 'vdot', params: { vdot: v, days: age }, basis: age <= 90 ? 'evidenced' : 'hint' })
  }
  if (m.acuteChronic != null) {
    out.push({ key: 'risk', value: { type: 'number', n: Math.round(m.acuteChronic * 100) / 100, digits: 2 }, params: { ac: Math.round(m.acuteChronic * 100) / 100, mono: m.monotony != null ? Math.round(m.monotony * 10) / 10 : 0 }, basis: 'hint' })
  }
  if (m.predictions) {
    const p = m.predictions.list.find((x) => x.key === 'half')!
    out.push({ key: 'race', value: { type: 'seconds', s: p.low }, params: { low: p.low, high: p.high }, basis: m.predictions.baseRaceId ? 'evidenced' : 'hint' })
  }
  out.push({ key: 'consistency', value: { type: 'text', text: `${m.consistency.hitsLastSix}/6` }, params: { hits: m.consistency.hitsLastSix }, basis: 'evidenced' })
  if (m.habit.before9Share != null) {
    out.push({ key: 'habit', value: { type: 'number', n: Math.round(m.habit.before9Share * 100), digits: 0 }, unit: 'percent', params: { share: Math.round(m.habit.before9Share * 100), weekday: m.habit.mostCommon?.weekday ?? 0, hour: m.habit.mostCommon?.hour ?? 0 }, basis: m.totals.runs >= 20 ? 'evidenced' : 'hint' })
  }
  if (m.shoes.length > 0) {
    const s = m.shoes[0]
    out.push({ key: 'gear', value: { type: 'number', n: Math.round(s.km), digits: 0 }, unit: 'km', params: { name: s.name, km: Math.round(s.km) }, basis: 'evidenced' })
  }
  return out
}
