/**
 * Die Ereignisliste im Client — Kopie von supabase/functions/_shared/eventRegistry.ts.
 *
 * Zwei Kopien, weil der Client nicht aus dem Ordner der Edge Functions
 * importiert (architecture.md §17) und die Edge Function nicht aus `src`.
 * `tests/analytics-registry.spec.ts` vergleicht beide; weichen sie ab,
 * schlägt der Lauf fehl.
 *
 * Der Client schickt nur, was hier steht. Der Server prüft es trotzdem noch
 * einmal — er verlässt sich nicht auf den Client.
 */

export type PropType = 'string' | 'number' | 'boolean'

export const EVENTS: Record<string, Record<string, PropType>> = {
  session_start: { standalone: 'boolean', lang: 'string' },
  page_view: { path: 'string' },
  page_leave: { path: 'string', seconds: 'number', reason: 'string' },
  pwa_installed: {},
  analytics_consent_given: {},
  language_changed: { lang: 'string' },
  signup: { role: 'string', confirmationPending: 'boolean' },
  login: {},
  logout: {},
  checkout_started: { plan: 'string', interval: 'string' },
  gate_shown: { feature: 'string' },
  test_completed: { slug: 'string', inAssessment: 'boolean' },
  group_test_recorded: { slug: 'string', athletes: 'number' },
  result_deleted: {},
  diary_saved: {},
  workout_saved: {},
  meal_saved: {},
  decision_saved: {},
  observation_saved: { kind: 'string' },
  biometric_saved: {},
  assessment_saved: {},
  test_day_saved: {},
  focus_saved: {},
  athlete_added: {},
  onboarding_step: { step: 'number' },
  onboarding_complete: { category: 'string' },
  export_downloaded: { scope: 'string' },
  insight_action: { rule: 'string', action: 'string' },
  // Eigene Fehlererfassung: Art, Seite, Fassung, oberster Rahmen — nie die
  // Meldung (sie kann Eingaben enthalten) und nie der ganze Stack.
  client_error: { errorType: 'string', route: 'string', release: 'string', frame: 'string' },
}

/**
 * Eigenschaften, die NIE zu einem Ereignis gehören — auch wenn jemand sie
 * versehentlich in die Liste oben schriebe. Ein Prüffall stellt sicher, dass
 * keine davon in EVENTS auftaucht.
 */
export const FORBIDDEN_PROPERTIES = [
  'email', 'name', 'message', 'stack', 'value', 'values', 'score', 'weight', 'note', 'userId', 'user_id',
  'ip', 'userAgent', 'token', 'birthDate', 'phone', 'health', 'symptom', 'medication', 'photo',
]

/** Nur die erlaubten Eigenschaften mit dem erlaubten Typ. Unbekanntes Ereignis: null. */
export function allowProperties(eventName: string, properties: Record<string, unknown>): Record<string, unknown> | null {
  const spec = EVENTS[eventName]
  if (!spec) return null
  const out: Record<string, unknown> = {}
  for (const [key, type] of Object.entries(spec)) {
    const v = properties[key]
    if (typeof v === type && (type !== 'number' || Number.isFinite(v))) out[key] = v
  }
  return out
}
