import { TEST_CATALOG, type TestDefinition } from '@/data/testCatalog'
import type { TestCategory } from '@/types/domain'

/**
 * Die vier Leistungsbereiche des Diagnostik-Einstiegs (Konzept §7):
 * Kraft, Ausdauer, Explosivität, Schnelligkeit. Jeder Bereich fasst
 * Testkategorien zusammen; «Sonstige» im Sportfilter (§9) ist, was in
 * keinen fällt.
 */
export type Area = 'strength' | 'endurance' | 'power' | 'speed'
export const AREAS: Area[] = ['strength', 'endurance', 'power', 'speed']

export const AREA_CATEGORIES: Record<Area, TestCategory[]> = {
  strength: ['max_strength', 'strength_endurance'],
  endurance: ['endurance', 'conditioning'],
  power: ['power'],
  speed: ['speed', 'agility'],
}

export function areaOf(test: TestDefinition): Area | null {
  return AREAS.find((area) => AREA_CATEGORIES[area].includes(test.category)) ?? null
}

export function testsForArea(area: Area): TestDefinition[] {
  return TEST_CATALOG.filter((test) => AREA_CATEGORIES[area].includes(test.category)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
}

/** Sportfilter (§9): Bereiche, dazu Technik und Sonstige. */
export type SportFilter = 'all' | Area | 'technique' | 'other'
export const SPORT_FILTERS: SportFilter[] = ['all', 'strength', 'endurance', 'power', 'speed', 'technique', 'other']

const TECHNIQUE_METRICS = ['swim_technique_score', 'strokes_per_100m', 'run_economy_score']

export function matchesSportFilter(test: TestDefinition, filter: SportFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'technique') return test.derivedMetrics.some((m) => TECHNIQUE_METRICS.includes(m))
  if (filter === 'other') return areaOf(test) == null
  return areaOf(test) === filter
}
