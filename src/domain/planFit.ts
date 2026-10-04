import { TRAINING_RULES } from '@/data/trainingRules'
import type { Equipment, PlanTemplate, TemplateSlot } from '@/data/planTemplates'
import { eligibleRules, specificityFor, type PlanMode } from '@/domain/trainingRules'
import { blocksFor, durationOf, DEFAULT_FREQUENCY, HIGH_INTENSITY_BUDGET, type FixedSession } from '@/domain/trainingPlan'
import { mondayOnOrAfter, weekdayOf } from '@/domain/trainingBlock'
import type { StoredPlannedSession } from '@/lib/store/localStore'

/**
 * Vorlage auf die Woche des Athleten legen (Individualisieren).
 *
 * DETERMINISTISCH und ohne neue Zahlen: die Dosierung kommt aus der Regel des
 * Platzes, offene Plätze bleiben offen. Gerechnet wird nur die Verteilung auf
 * Tage nach den Planungsregeln des Bauers (`trainingPlan.ts`): eine Einheit je
 * Tag, kein hoher Reiz neben harten Runden, Wochenbudget hoher Intensität.
 * Was nicht passt, entfällt SICHTBAR mit Grund, es wird nie stillschweigend
 * verschoben oder weggelassen.
 */

export interface FitInput {
  template: PlanTemplate
  disciplineId: string | null
  trainingAgeYears: number | null
  /** Tage, an denen eine Einheit möglich ist (1 bis 7). */
  availableDays: number[]
  fixedSessions: FixedSession[]
  equipment: Equipment[]
  hrMaxPlausible: boolean
  mode: PlanMode
  /** Frühester Start; der Block beginnt am Montag danach. */
  startDay: string
  /** Wettkampftermin: der Block endet davor. */
  eventDay: string | null
  /** Heute, um einen zu knappen Termin zu erkennen. */
  today: string
}

export type FitSkipReason = 'equipment' | 'rule_unavailable' | 'hr_max_unknown' | 'no_slot' | 'budget'
export interface FitSkip {
  slotKey: string
  intent: string
  reason: FitSkipReason
}
export interface FitResult {
  sessions: StoredPlannedSession[]
  skipped: FitSkip[]
  startDay: string
  /** Der Termin lässt weniger Wochen Platz als die Vorlage braucht. */
  tooShort: boolean
  retestMetrics: string[]
}

const DAY = 86_400_000
const dayNum = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY
const dayStr = (n: number) => new Date(n * DAY).toISOString().slice(0, 10)
const adjacent = (a: number, b: number) => Math.abs(a - b) === 1 || (a === 1 && b === 7) || (a === 7 && b === 1)

/** Startmontag: ohne Termin der erste Montag ab `startDay`; mit Termin so, dass der Block vor dem Termin endet. */
export function fitStart(weeks: number, startDay: string, eventDay: string | null, today: string): { startDay: string; tooShort: boolean } {
  const earliest = mondayOnOrAfter(startDay > today ? startDay : today)
  if (!eventDay) return { startDay: earliest, tooShort: false }
  const target = dayNum(eventDay) - weeks * 7
  const wd = weekdayOf(dayStr(target))
  const monday = dayStr(target - (wd - 1))
  if (monday < earliest) return { startDay: earliest, tooShort: true }
  return { startDay: monday, tooShort: false }
}

interface Placed {
  day: number
  weekFrom: number
  weekTo: number
  high: boolean
}

export function fitTemplate(input: FitInput): FitResult {
  const { template } = input
  const start = fitStart(template.weeks, input.startDay, input.eventDay, input.today)
  const hardDays = input.fixedSessions.filter((f) => f.kind === 'hard_rounds').map((f) => f.day)
  const placed: Placed[] = []
  const sessions: StoredPlannedSession[] = []
  const skipped: FitSkip[] = []
  const metrics: string[] = []
  const days = [...input.availableDays].sort((a, b) => a - b)

  for (const slot of orderedSlots(template.slots)) {
    const weekTo = Math.min(slot.weekTo ?? template.weeks, template.weeks)
    const skip = (reason: FitSkipReason) => skipped.push({ slotKey: slot.key, intent: slot.intent, reason })
    if (slot.needs && !input.equipment.includes(slot.needs)) {
      skip('equipment')
      continue
    }
    const rule = slot.ruleId ? TRAINING_RULES.find((r) => r.id === slot.ruleId) : null
    if (slot.ruleId) {
      const usable = rule && eligibleRules({ family: template.family, phase: template.phase, intent: slot.intent, mode: input.mode, trainingAgeYears: input.trainingAgeYears }, TRAINING_RULES).some((r) => r.id === rule.id)
      if (!rule || !usable) {
        skip('rule_unavailable')
        continue
      }
      if (rule.prescription.intensity?.type === 'hr_percent_max' && !input.hrMaxPlausible) {
        skip('hr_max_unknown')
        continue
      }
    }
    const frequency = rule ? (rule.prescription.frequencyPerWeek?.[0] ?? DEFAULT_FREQUENCY) : slot.perWeek
    const high = slot.high
    const overlapping = placed.filter((p) => p.weekFrom <= weekTo && slot.weekFrom <= p.weekTo)
    // Wochenbudget: in jeder betroffenen Woche zählen harte Runden und schon gesetzte hohe Reize mit.
    if (high) {
      let worst = 0
      for (let w = slot.weekFrom; w <= weekTo; w++) worst = Math.max(worst, hardDays.length + placed.filter((p) => p.high && p.weekFrom <= w && w <= p.weekTo).length)
      if (worst + frequency > HIGH_INTENSITY_BUDGET) {
        skip('budget')
        continue
      }
    }
    const taken = new Set([...hardDays, ...overlapping.map((p) => p.day)])
    const free = days.filter((d) => !taken.has(d) && !(high && hardDays.some((h) => adjacent(d, h))))
    const chosen: number[] = []
    const pick = (avoidAdjacent: boolean) => {
      for (const d of free) {
        if (chosen.length >= frequency) break
        if (chosen.includes(d)) continue
        if (avoidAdjacent && [...overlapping.map((p) => p.day), ...chosen].some((k) => adjacent(d, k))) continue
        chosen.push(d)
      }
    }
    // Hybrid: Schlüsselreize möglichst nicht an Folgetagen (Planungsregel 6).
    if (template.family === 'hybrid') pick(true)
    pick(false)
    if (chosen.length < frequency) {
      skip('no_slot')
      continue
    }
    const blocks = rule ? blocksFor(rule) : []
    for (const day of chosen.sort((a, b) => a - b)) {
      placed.push({ day, weekFrom: slot.weekFrom, weekTo, high })
      sessions.push({
        id: `${slot.key}-d${day}`,
        day,
        weekFrom: slot.weekFrom,
        weekTo: slot.weekTo == null ? null : weekTo,
        kind: rule ? 'rule' : 'open',
        ruleId: rule?.id ?? null,
        ruleVersion: rule?.version ?? null,
        primaryIntent: slot.intent,
        evidenceStrength: rule?.evidence.strength ?? null,
        evidenceSpecificity: rule ? specificityFor(rule, template.family, input.disciplineId) : null,
        plannedDurationMin: durationOf(blocks),
        highIntensity: high,
        blocks: blocks as StoredPlannedSession['blocks'],
        retestMetric: rule?.retestMetric ?? '',
        coachModified: false,
        coachModificationReason: null,
        removed: false,
      })
    }
    if (rule && !metrics.includes(rule.retestMetric)) metrics.push(rule.retestMetric)
  }
  sessions.sort((a, b) => a.day - b.day || a.weekFrom - b.weekFrom)
  return { sessions, skipped, startDay: start.startDay, tooShort: start.tooShort, retestMetrics: metrics }
}

/** Reihenfolge der Platzvergabe: hohe Reize zuerst (sie haben die engsten Regeln), dann Regelplätze, dann offene. */
function orderedSlots(slots: TemplateSlot[]): TemplateSlot[] {
  const rank = (s: TemplateSlot) => (s.high && s.ruleId ? 0 : s.ruleId ? 1 : s.high ? 2 : 3)
  return [...slots].sort((a, b) => rank(a) - rank(b))
}
