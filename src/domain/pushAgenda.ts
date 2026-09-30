import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Was «ansteht» und per Push erinnert werden soll (docs/push.md).
 *
 * Nur DATEN, keine Inhalte: der Server erfährt je Art ein Datum — den Tag, an
 * dem erinnert wird. Wettkampf: der Vortag. Testtermin: der Tag selbst. Was
 * geplant ist, wie der Wettkampf heisst, welche Tests: bleibt auf dem Gerät.
 */

const DAY = 86_400_000
const shift = (day: string, delta: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY).toISOString().slice(0, 10)

export interface AgendaDates {
  /** Erinnerungstag für den Wettkampf (Vortag), oder null. */
  competition: string | null
  /** Erinnerungstag für den nächsten geplanten Testtermin, oder null. */
  assessment: string | null
}

export function agendaDates(athlete: Pick<StoredAthlete, 'profile' | 'assessments'>, today: string): AgendaDates {
  const comp = athlete.profile.competition
  // Der Vortag muss noch bevorstehen oder heute sein; ein Wettkampf heute oder früher wird nicht mehr angekündigt.
  const competition = comp && comp.on > today ? (shift(comp.on, -1) >= today ? shift(comp.on, -1) : today) : null
  const planned = athlete.assessments
    .filter((a) => a.status === 'planned' && a.performedOn >= today)
    .map((a) => a.performedOn)
    .sort()
  return { competition, assessment: planned[0] ?? null }
}
