import type { EvidenceRule } from '@/domain/trainingTypes'
import type { StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * Prüfstand eines Trainingsblocks (Regel 11, Nachtrag 1 der Doktrin).
 *
 * - `reviewed`: jede Einheit stammt aus einer fachlich geprüften Regel oder
 *   einem geprüften Bibliotheksplan.
 * - `unreviewed`: mindestens eine Einheit nicht — der Block wird sichtbar als
 *   «fachlich noch nicht geprüft» gekennzeichnet.
 * - `own`: nur selbst zusammengestellte Einheiten. Dahinter steht keine Regel
 *   von KYDON, also gibt es auch nichts zu prüfen.
 *
 * Ein Bibliotheksplan gilt nur dann als geprüft, wenn der Aufrufer das
 * ausdrücklich sagt (`libraryReviewed`). Ohne Angabe: ungeprüft. Das ist die
 * sichere Richtung — lieber ein Hinweis zu viel als eine stille Freigabe.
 */
export type ReviewState = 'reviewed' | 'unreviewed' | 'own'

type SessionLike = Pick<StoredTrainingBlock['sessions'][number], 'kind' | 'ruleId'>

/** Prüfstand einer einzelnen Einheit — dieselben Regeln wie für den Block. */
export function sessionReviewState(
  session: SessionLike,
  rules: readonly EvidenceRule[],
  libraryPlanId: string | null,
  libraryReviewed: (planId: string) => boolean = () => false,
): ReviewState {
  if (session.kind === 'own') return 'own'
  if (session.kind === 'library') return libraryPlanId && libraryReviewed(libraryPlanId) ? 'reviewed' : 'unreviewed'
  if (session.kind === 'open') return 'unreviewed'
  const rule = session.ruleId ? rules.find((r) => r.id === session.ruleId) : undefined
  return rule?.review.state === 'reviewed' ? 'reviewed' : 'unreviewed'
}

export function blockReviewState(
  block: Pick<StoredTrainingBlock, 'sessions' | 'libraryPlanId'>,
  rules: readonly EvidenceRule[],
  libraryReviewed: (planId: string) => boolean = () => false,
): ReviewState {
  const sessions = block.sessions.filter((s) => !s.removed)
  if (sessions.length === 0) return 'own'
  let anyChecked = false
  for (const s of sessions) {
    const state = sessionReviewState(s, rules, block.libraryPlanId, libraryReviewed)
    if (state === 'unreviewed') return 'unreviewed'
    if (state === 'reviewed') anyChecked = true
  }
  return anyChecked ? 'reviewed' : 'own'
}
