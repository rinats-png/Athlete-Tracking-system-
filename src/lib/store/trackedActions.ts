import { trackEvent } from '@/lib/analytics'
import type { AppDataValue } from './AppDataProvider'

/**
 * Welche Speicherfunktionen ein Ereignis auslösen — an EINER Stelle.
 *
 * Die Alternative wäre ein `trackEvent` in jedem Bildschirm, und dann fehlt
 * es in genau dem Bildschirm, den jemand nächsten Monat baut. Hier hängt die
 * Zählung an der Aktion selbst: Wer ein Ergebnis speichert, speichert es über
 * `recordResult`, egal von wo.
 *
 * WAS MITGEHT: dass etwas gespeichert wurde, und höchstens WELCHE ART —
 * welcher Test, wie viele Athleten. NIE der Wert. `recordResult` meldet
 * `cooper_12min`, nicht 3 000 Meter.
 *
 * WAS BEWUSST FEHLT: `updateHealth`, `savePeakWeek`, `deletePeakWeek`. Die
 * Gesundheitsschicht wird nicht gezählt — auch nicht, dass jemand sie nutzt.
 */
type Fn = (...args: never[]) => unknown

const COUNTED: Partial<Record<keyof AppDataValue, (args: unknown[], result: unknown) => [string, Record<string, unknown>] | null>> = {
  recordResult: (args, result) => {
    if (!result) return null
    const input = args[0] as { testSlug?: string; assessmentId?: string | null }
    return ['test_completed', { slug: input?.testSlug ?? '', inAssessment: Boolean(input?.assessmentId) }]
  },
  recordForGroup: (args, result) => ['group_test_recorded', { slug: String(args[0] ?? ''), athletes: typeof result === 'number' ? result : 0 }],
  deleteResult: () => ['result_deleted', {}],
  saveDiaryEntry: () => ['diary_saved', {}],
  saveWorkout: () => ['workout_saved', {}],
  saveMeal: () => ['meal_saved', {}],
  saveDecision: () => ['decision_saved', {}],
  addObservation: (args) => ['observation_saved', { kind: String((args[0] as { key?: string })?.key ?? '') }],
  saveBiometric: () => ['biometric_saved', {}],
  saveAssessment: () => ['assessment_saved', {}],
  saveTestDay: () => ['test_day_saved', {}],
  saveFocus: () => ['focus_saved', {}],
  addAthlete: () => ['athlete_added', {}],
  // Der Einstieg speichert jeden Schritt über saveProfile. Daraus wird der
  // Funnel «wo im Einstieg springen Leute ab».
  saveProfile: (args) => {
    const patch = (args[0] ?? {}) as { onboardingStep?: number; onboardingCompletedAt?: string | null; sportCategoryId?: string | null }
    if (patch.onboardingCompletedAt) return ['onboarding_complete', { category: patch.sportCategoryId ?? '' }]
    if (typeof patch.onboardingStep === 'number' && patch.onboardingStep > 0) return ['onboarding_step', { step: patch.onboardingStep }]
    return null
  },
  exportJson: () => ['export_downloaded', { scope: 'all' }],
  exportAthleteJson: () => ['export_downloaded', { scope: 'athlete' }],
}

/** Legt um die gezählten Funktionen eine Hülle. Alles andere bleibt, wie es ist. */
export function withTracking(value: AppDataValue): AppDataValue {
  const out = { ...value } as Record<string, unknown>
  for (const [name, describe] of Object.entries(COUNTED)) {
    const original = out[name]
    if (typeof original !== 'function' || !describe) continue
    out[name] = (...args: unknown[]) => {
      const result = (original as Fn)(...(args as never[]))
      try {
        const event = describe(args, result)
        if (event) trackEvent(event[0], event[1])
      } catch {
        /* Eine Zählung darf eine Speicherung nie stören. */
      }
      return result
    }
  }
  return out as unknown as AppDataValue
}
