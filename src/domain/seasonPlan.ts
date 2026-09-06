import { coreSlugs, disciplineById } from '@/data/sportProfiles'
import { UNIVERSAL_TEST_SLUGS } from '@/domain/diagnosticProfile'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Der Wettkampf als Rahmen — drei Kontrollpunkte rückwärts vom Datum.
 *
 * WARUM DAS EIN RAHMEN IST UND KEIN TRAININGSPLAN: die App legt fest, WANN
 * gemessen wird und WAS. Sie legt nicht fest, was zwischen den Messungen
 * trainiert wird (§81). Drei Termine auf ein Ziel sind der Rhythmus, den
 * die Diagnostik selbst vorgibt: erst die Grundlage, dann das Spezifische,
 * zuletzt ein Formcheck kurz genug vor dem Tag, dass er ihn nicht stört.
 *
 * DIE ABSTÄNDE sind Produktentscheidungen und stehen offen: 12, 6 und 2
 * Wochen. Sie folgen dem Wiederholungsabstand der App (42 Tage, nextTest.ts)
 * — zwischen zwei Kontrollpunkten liegt mindestens der Abstand, ab dem ein
 * zweiter Test etwas anderes misst als der erste.
 */

export type CheckpointKind = 'foundation' | 'specific' | 'form'
export type CheckpointStatus = 'done' | 'due' | 'upcoming' | 'missed'

export interface Checkpoint {
  kind: CheckpointKind
  /** Kalendertag des Kontrollpunkts (YYYY-MM-DD). */
  on: string
  weeksBefore: number
  slugs: string[]
  status: CheckpointStatus
  /** Wie viele der Tests innerhalb des Fensters gemessen wurden. */
  measured: number
}

export interface SeasonPlan {
  competitionOn: string
  daysToGo: number
  checkpoints: Checkpoint[]
  /** Der nächste offene Kontrollpunkt, oder null nach dem letzten. */
  next: Checkpoint | null
}

export const CHECKPOINT_WEEKS: Record<CheckpointKind, number> = {
  foundation: 12,
  specific: 6,
  form: 2,
}

/** Ein Kontrollpunkt gilt als getroffen, wenn im Fenster ±7 Tage gemessen wurde. */
export const CHECKPOINT_WINDOW_DAYS = 7
/** Höchstens so viele Tests je Kontrollpunkt — mehr ist ein Testtag, kein Check. */
export const MAX_TESTS_PER_CHECKPOINT = 4

function dayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function slugsFor(kind: CheckpointKind, disciplineId: string | null, results: StoredResult[]): string[] {
  const discipline = disciplineId ? disciplineById(disciplineId) : undefined
  const core = discipline ? coreSlugs(discipline) : []
  if (kind === 'foundation') {
    return [...UNIVERSAL_TEST_SLUGS].slice(0, MAX_TESTS_PER_CHECKPOINT)
  }
  if (kind === 'specific') {
    const chosen = core.length > 0 ? core : [...UNIVERSAL_TEST_SLUGS]
    return chosen.slice(0, MAX_TESTS_PER_CHECKPOINT)
  }
  // Formcheck: die Kerntests mit der längsten eigenen Historie — nur dort
  // lässt sich ein Wert zwei Wochen vor dem Tag gegen die Streuung lesen.
  const counts = new Map<string, number>()
  for (const r of results) {
    if (r.score == null) continue
    counts.set(r.testSlug, (counts.get(r.testSlug) ?? 0) + 1)
  }
  const pool = core.length > 0 ? core : [...UNIVERSAL_TEST_SLUGS]
  return [...pool]
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .slice(0, Math.min(2, MAX_TESTS_PER_CHECKPOINT))
}

export function seasonPlan(
  competitionOn: string,
  disciplineId: string | null,
  results: StoredResult[],
  asOf: Date = new Date(),
): SeasonPlan {
  const target = new Date(`${competitionOn}T12:00:00.000Z`).getTime()
  const now = asOf.getTime()
  const daysToGo = Math.round((target - now) / 86_400_000)

  const checkpoints: Checkpoint[] = (Object.keys(CHECKPOINT_WEEKS) as CheckpointKind[]).map((kind) => {
    const weeksBefore = CHECKPOINT_WEEKS[kind]
    const at = target - weeksBefore * 7 * 86_400_000
    const slugs = slugsFor(kind, disciplineId, results)
    const window = CHECKPOINT_WINDOW_DAYS * 86_400_000
    const measured = slugs.filter((slug) =>
      results.some((r) => {
        if (r.testSlug !== slug || r.score == null) return false
        const t = new Date(r.performedAt).getTime()
        return Math.abs(t - at) <= window
      }),
    ).length

    let status: CheckpointStatus
    if (measured > 0) status = 'done'
    else if (now > at + window) status = 'missed'
    else if (now >= at - window) status = 'due'
    else status = 'upcoming'

    return { kind, on: dayOf(at), weeksBefore, slugs, status, measured }
  })

  const next = checkpoints.find((c) => c.status === 'due') ?? checkpoints.find((c) => c.status === 'upcoming') ?? null

  return { competitionOn, daysToGo, checkpoints, next }
}
