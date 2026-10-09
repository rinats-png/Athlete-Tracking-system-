import type { MethodRule } from '@/domain/libraryTypes'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'
import type { ValidatedPlanAdjustment } from '@/lib/store/schema'
import { blockWeek } from '@/domain/trainingBlock'

/**
 * Adaptive Schwierigkeit für Bibliothekspläne (Gesamtmaster v3 §11, Programm-
 * bibliothek §7).
 *
 * Grundsätze, die hier technisch durchgesetzt werden:
 *  - ±10/20/30 % ist ein WUNSCH, kein Multiplikator: er wählt, welche eine
 *    Stellgröße sich bewegt (Anstrengung, Sätze, Dauer), nie alle zugleich;
 *  - jede neue Dosis bleibt in den Grenzen der Methodenregel der Position —
 *    was die Grenze sprengen würde, bleibt unverändert;
 *  - nur künftige, nicht erledigte Einheiten; Entlastungswochen bleiben;
 *  - Schmerz in den letzten 14 Tagen sperrt jede Steigerung;
 *  - nichts ändert sich ohne «Übernehmen»: das Ergebnis ist ein Vorschlag,
 *    die Übernahme erzeugt eine neue Planversion mit Änderungsliste.
 *
 * Die Zuordnung Wunsch → Stellgröße ist eine PRODUKTENTSCHEIDUNG, keine
 * Literaturregel; sie steht in docs/training-engine.md und gehört zum Review.
 */

export type IntentPct = -30 | -20 | -10 | 10 | 20 | 30
export const INTENT_STEPS: IntentPct[] = [-30, -20, -10, 10, 20, 30]

export interface FeedbackReview {
  /** Frühester Review: ≥ 3 Tage seit Start und ≥ 2 Rückmeldungen in den letzten 14 Tagen. */
  eligible: boolean
  reason: 'too_early' | 'too_few' | 'fits' | 'too_easy' | 'too_hard' | 'pain'
  /** Vorgeschlagene Richtung; `null`, wenn es nichts vorzuschlagen gibt. */
  suggestedPct: IntentPct | null
  feedbackCount: number
  mean: number | null
}

const DAY_MS = 86_400_000
const dayNum = (d: string) => Date.parse(`${d}T00:00:00Z`) / DAY_MS

export function reviewFeedback(block: StoredTrainingBlock, today: string): FeedbackReview {
  const recent = block.completions.filter((c) => dayNum(today) - dayNum(c.day) <= 14 && dayNum(c.day) <= dayNum(today))
  const rated = recent.filter((c) => c.feedback != null)
  const mean = rated.length ? rated.reduce((a, c) => a + (c.feedback ?? 3), 0) / rated.length : null
  const base = { feedbackCount: rated.length, mean }
  if (dayNum(today) - dayNum(block.startDay) < 3) return { ...base, eligible: false, reason: 'too_early', suggestedPct: null }
  if (recent.some((c) => c.pain)) return { ...base, eligible: true, reason: 'pain', suggestedPct: -10 }
  if (rated.length < 2 || mean == null) return { ...base, eligible: false, reason: 'too_few', suggestedPct: null }
  if (mean <= 2) return { ...base, eligible: true, reason: 'too_easy', suggestedPct: 10 }
  if (mean >= 4) return { ...base, eligible: true, reason: 'too_hard', suggestedPct: -10 }
  return { ...base, eligible: true, reason: 'fits', suggestedPct: null }
}

export type Change = ValidatedPlanAdjustment['changes'][number]

export interface Proposal {
  pct: IntentPct
  changes: Change[]
  /** Positionen, die an der Regelgrenze stehen und deshalb gleich bleiben. */
  atLimit: number
  /** Steigerung gesperrt (Schmerz). */
  blocked: boolean
}

const bound = (r: MethodRule | undefined, key: string): [number, number] | null => {
  const b = r?.dose_bounds[key]
  return Array.isArray(b) ? b : null
}
const within = (v: number, b: [number, number] | null) => b == null || (v >= b[0] && v <= b[1])

/** Künftige, nicht erledigte Einheiten außerhalb von Entlastungswochen. */
function adjustable(block: StoredTrainingBlock, today: string): StoredPlannedSession[] {
  const w = blockWeek(block, today)
  const fromWeek = w === 'before' ? 1 : w === 'after' ? block.weeks + 1 : w
  const done = new Set(block.completions.map((c) => c.sessionId))
  return block.sessions.filter((s) => s.kind === 'library' && !s.removed && s.note !== 'reduced' && s.weekFrom >= fromWeek && !done.has(s.id))
}

export function proposeAdjustment(block: StoredTrainingBlock, pct: IntentPct, rules: MethodRule[], today: string): Proposal {
  const painRecent = block.completions.some((c) => c.pain && dayNum(today) - dayNum(c.day) <= 14)
  if (pct > 0 && painRecent) return { pct, changes: [], atLimit: 0, blocked: true }
  const byId = new Map(rules.map((r) => [r.rule_id, r]))
  const step = Math.abs(pct) / 10
  const sign = pct > 0 ? 1 : -1
  const changes: Change[] = []
  let atLimit = 0
  for (const s of adjustable(block, today)) {
    s.blocks.forEach((p, i) => {
      if (p.type === 'library_exercise') {
        const rule = p.ruleId ? byId.get(p.ruleId) : undefined
        // ±10 → Anstrengung (RPE ±1); ±20 → Sätze ±1; ±30 → Sätze ±2. Je Position genau eine Stellgröße.
        if (step === 1 && p.rpe != null) {
          const next = p.rpe + sign
          if (next >= 1 && next <= 10 && within(next, bound(rule, 'rpe'))) changes.push({ sessionId: s.id, part: i, field: 'rpe', from: String(p.rpe), to: String(next), ruleId: p.ruleId })
          else atLimit++
        } else if (step >= 2 && p.sets != null) {
          const next = p.sets + sign * (step - 1)
          if (next >= 1 && next <= 20 && within(next, bound(rule, 'sets'))) changes.push({ sessionId: s.id, part: i, field: 'sets', from: String(p.sets), to: String(next), ruleId: p.ruleId })
          else atLimit++
        }
      } else if (p.type === 'library_conditioning' && p.durationMin != null) {
        const rule = s.ruleId ? byId.get(s.ruleId) : undefined
        const next = Math.round(p.durationMin * (1 + pct / 100))
        const b = bound(rule, 'duration_min')
        // Dauer nur, wo die Regel eine Dauergrenze kennt; sonst bleibt sie (keine Dosis ohne Regel).
        if (b && next !== p.durationMin && within(next, b)) changes.push({ sessionId: s.id, part: i, field: 'durationMin', from: String(p.durationMin), to: String(next), ruleId: s.ruleId })
        else atLimit++
      }
    })
  }
  return { pct, changes, atLimit, blocked: false }
}

/** Übernimmt einen Vorschlag: neue Planversion, Änderungsliste bleibt im Block (rekonstruierbar). */
export function applyAdjustment(block: StoredTrainingBlock, p: Proposal, meta: { id: string; now: string; source: 'feedback' | 'manual' | 'substitution' }): StoredTrainingBlock {
  if (p.changes.length === 0) return block
  const bySession = new Map<string, Change[]>()
  for (const c of p.changes) bySession.set(c.sessionId, [...(bySession.get(c.sessionId) ?? []), c])
  const sessions = block.sessions.map((s) => {
    const cs = bySession.get(s.id)
    if (!cs) return s
    return {
      ...s,
      blocks: s.blocks.map((part, i) => {
        const c = cs.find((x) => x.part === i)
        if (!c) return part
        if (part.type === 'library_exercise' && (c.field === 'rpe' || c.field === 'sets')) return { ...part, [c.field]: Number(c.to) }
        if (part.type === 'library_conditioning' && c.field === 'durationMin') return { ...part, durationMin: Number(c.to) }
        if (part.type === 'library_exercise' && c.field === 'exercise') {
          const [exerciseId, ...name] = c.to.split('|')
          return { ...part, exerciseId, name: name.join('|') || part.name }
        }
        return part
      }),
    }
  })
  const toVersion = block.planVersion + 1
  const entry: ValidatedPlanAdjustment = { id: meta.id, at: meta.now, fromVersion: block.planVersion, toVersion, source: meta.source, intentPct: p.pct, changes: p.changes.slice(0, 400) }
  return { ...block, sessions, planVersion: toVersion, adjustments: [...block.adjustments, entry].slice(-40), updatedAt: meta.now }
}

/** Macht die letzte Anpassung rückgängig (Änderungsliste rückwärts); die Rücknahme ist selbst eine neue Version. */
export function revertLast(block: StoredTrainingBlock, meta: { id: string; now: string }): StoredTrainingBlock {
  const last = block.adjustments[block.adjustments.length - 1]
  if (!last) return block
  const inverse: Proposal = { pct: (-last.intentPct || 10) as IntentPct, changes: last.changes.map((c) => ({ ...c, from: c.to, to: c.from })), atLimit: 0, blocked: false }
  return applyAdjustment(block, inverse, { ...meta, source: 'manual' })
}

/**
 * Ersatz übernehmen: eine im Training ersetzte Übung auch in den folgenden,
 * nicht erledigten Einheiten des Blocks tauschen. Dosis und Methodenregel der
 * Position bleiben (der Ersatz teilt das Bewegungsmuster, `library.ts`); es
 * entsteht eine neue Planversion mit Änderungsliste, also rücknehmbar.
 * `from`/`to` der Änderung tragen `id|Name`.
 */
export function applySubstitution(block: StoredTrainingBlock, sub: { from: string; fromName: string; to: string; toName: string }, meta: { id: string; now: string; today: string }): StoredTrainingBlock {
  const w = blockWeek(block, meta.today)
  const fromWeek = w === 'before' ? 1 : w === 'after' ? block.weeks + 1 : w
  const done = new Set(block.completions.map((c) => c.sessionId))
  const changes: Change[] = []
  for (const s of block.sessions) {
    if (s.kind !== 'library' || s.removed || done.has(s.id) || (s.weekTo ?? block.weeks) < fromWeek) continue
    s.blocks.forEach((p, i) => {
      if (p.type === 'library_exercise' && p.exerciseId === sub.from) changes.push({ sessionId: s.id, part: i, field: 'exercise', from: `${sub.from}|${sub.fromName}`.slice(0, 120), to: `${sub.to}|${sub.toName}`.slice(0, 120), ruleId: p.ruleId })
    })
  }
  const next = applyAdjustment(block, { pct: 10, changes, atLimit: 0, blocked: false }, { id: meta.id, now: meta.now, source: 'substitution' })
  // Ein Ersatz ist kein Schwierigkeitswunsch: im Protokoll steht 0 %.
  return next === block ? block : { ...next, adjustments: next.adjustments.map((a) => (a.id === meta.id ? { ...a, intentPct: 0 } : a)) }
}
