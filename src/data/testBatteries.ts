import { TEST_CATALOG } from './testCatalog'
import type { PerformanceDimension } from '@/types/domain'

/**
 * Testbatterien: vordefinierte Zusammenstellungen für eine Diagnostik.
 *
 * Eine Batterie ist keine willkürliche Liste, sondern eine Aussage darüber,
 * welche Achsen für ein Profil zusammen erhoben werden müssen. Wer nur Kraft
 * misst, bekommt kein Leistungsprofil — er bekommt eine Kraftzahl.
 *
 * Die Reihenfolge ist trainingswissenschaftlich begründet: erst neuromuskulär
 * anspruchsvolle und ermüdungsempfindliche Tests (Schnellkraft, Agilität,
 * Maxkraft), dann Kraftausdauer, zuletzt Ausdauer. Umgekehrt gemessen wären
 * die späteren Werte durch Ermüdung verfälscht.
 */

export interface TestBattery {
  slug: string
  testSlugs: string[]
  /** Grob geschätzte Netto-Dauer inklusive Pausen, in Minuten. */
  durationMinutes: number
  name: { de: string; en: string }
  description: { de: string; en: string }
}

export const TEST_BATTERIES: TestBattery[] = [
  {
    slug: 'general_fitness',
    testSlugs: ['standing_broad_jump', 'illinois_agility', 'back_squat_1rm', 'bench_press_1rm', 'cooper_12min'],
    durationMinutes: 90,
    name: { de: 'Allgemeine Fitness', en: 'General fitness' },
    description: {
      de: 'Fünf Tests über alle sechs Achsen. Der schnellste Weg zu einem vollständigen Profil.',
      en: 'Five tests across all six axes. The fastest route to a complete profile.',
    },
  },
  {
    slug: 'strength',
    testSlugs: ['back_squat_1rm', 'deadlift_1rm', 'bench_press_1rm'],
    durationMinutes: 75,
    name: { de: 'Maxkraft (Big Three)', en: 'Max strength (big three)' },
    description: {
      de: 'Kniebeuge, Kreuzheben, Bankdrücken. Liefert absolute Maxkraft und Relativkraft.',
      en: 'Squat, deadlift, bench press. Yields absolute and relative strength.',
    },
  },
  {
    slug: 'endurance',
    testSlugs: ['cooper_12min', 'row_2000m'],
    durationMinutes: 60,
    name: { de: 'Ausdauer', en: 'Endurance' },
    description: {
      de: 'Cooper-Test und 2000 m Rudern. An verschiedenen Tagen durchführen.',
      en: 'Cooper test and 2000 m row. Perform on separate days.',
    },
  },
  {
    slug: 'hybrid',
    testSlugs: [
      'standing_broad_jump',
      'back_squat_1rm',
      'deadlift_1rm',
      'bear_complex',
      'assault_bike_10min_cal',
      'cooper_12min',
    ],
    durationMinutes: 150,
    name: { de: 'Hybrid-Athlet', en: 'Hybrid athlete' },
    description: {
      de: 'Kraft und Ausdauer gleichgewichtig. Auf zwei Termine verteilen.',
      en: 'Strength and endurance in balance. Spread over two sessions.',
    },
  },
  {
    slug: 'tactical',
    testSlugs: [
      'illinois_agility',
      'standing_broad_jump',
      'deadlift_1rm',
      'cindy_20min_amrap',
      'cooper_12min',
    ],
    durationMinutes: 120,
    name: { de: 'Tactical / Behörden', en: 'Tactical' },
    description: {
      de: 'Agilität, Tragkraft, Kraftausdauer und Laufleistung — die Anforderungen im Einsatz.',
      en: 'Agility, carrying strength, strength endurance and running — the demands of duty.',
    },
  },
  {
    slug: 'conditioning',
    testSlugs: ['cindy_20min_amrap', 'assault_bike_10min_cal', 'row_2000m'],
    durationMinutes: 75,
    name: { de: 'Conditioning / MetCon', en: 'Conditioning / MetCon' },
    description: {
      de: 'Drei Belastungsformen über unterschiedliche Zeitfenster.',
      en: 'Three modalities across different time domains.',
    },
  },
  {
    slug: 'power_agility',
    testSlugs: ['standing_broad_jump', 'illinois_agility', 'snatch_1rm', 'clean_and_jerk_1rm'],
    durationMinutes: 90,
    name: { de: 'Schnellkraft & Agilität', en: 'Power & agility' },
    description: {
      de: 'Explosivität und Richtungswechsel. Nur mit ausgeruhtem Nervensystem sinnvoll.',
      en: 'Explosiveness and change of direction. Only meaningful when fully rested.',
    },
  },
]

export const BATTERY_BY_SLUG = new Map(TEST_BATTERIES.map((b) => [b.slug, b]))

/**
 * Welche Achsen deckt eine Batterie ab? Zeigt vor dem Start, ob am Ende ein
 * vollständiges Profil herauskommt oder ein Ausschnitt.
 */
export function batteryDimensions(battery: TestBattery): PerformanceDimension[] {
  const dimensions = new Set<PerformanceDimension>()
  for (const slug of battery.testSlugs) {
    const test = TEST_CATALOG.find((t) => t.slug === slug)
    if (!test) continue
    for (const dimension of Object.keys(test.dimensionMetrics)) {
      dimensions.add(dimension as PerformanceDimension)
    }
  }
  return [...dimensions]
}
