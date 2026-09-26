import type { TestBlueprint, TestField } from './testCatalog'

/**
 * Wettkampfsimulationen für HYROX und Kampfsport (Master-Spezifikation D7).
 *
 * Beide Tests messen nicht eine Zahl, sondern einen VERLAUF: acht Läufe
 * zwischen acht Stationen, drei bis fünf Runden. Die Auswertung (src/domain/
 * raceSim.ts) liest daraus Laufabfall, Stationsanteile und Rundenabfall —
 * immer gegen die eigenen früheren Simulationen, nie gegen Normen. Eine
 * HYROX-Rennzeit ist kein Testwert (references.ts, Lückenliste); eine
 * Simulation unter festen eigenen Bedingungen ist nur mit sich selbst
 * vergleichbar, und genau so wird sie behandelt.
 */

/** Reihenfolge der Stationen im HYROX-Format. */
export const HYROX_STATIONS = [
  'skiErg',
  'sledPush',
  'sledPull',
  'burpeeBroadJump',
  'row',
  'farmersCarry',
  'sandbagLunges',
  'wallBalls',
] as const
export type HyroxStation = (typeof HYROX_STATIONS)[number]

const runField = (n: number): TestField => ({ key: `run${n}Seconds`, type: 'duration', unit: 's', required: true, min: 120, max: 1200 })
const stationField = (s: HyroxStation): TestField => ({
  key: `${s}Seconds`,
  type: 'duration',
  unit: 's',
  required: true,
  min: 20,
  max: 1800,
})

const sum = (xs: (number | undefined)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0)
const all = (xs: (number | undefined)[]): xs is number[] => xs.every((x) => x != null && Number.isFinite(x))

export const RACE_SIM_TESTS: TestBlueprint[] = [
  {
    slug: 'hyrox_simulation',
    primaryMetric: 'total_time_s',
    primaryUnit: 's',
    fields: [
      ...[1, 2, 3, 4, 5, 6, 7, 8].map(runField),
      ...HYROX_STATIONS.map(stationField),
      { key: 'roxzoneSeconds', type: 'duration', unit: 's', required: false, min: 0, max: 1800 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['total_time_s', 'run_total_s', 'station_total_s', 'run_decay_percent'],
    derive: (values, _ctx, put) => {
      const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => values[`run${n}Seconds`])
      const stations = HYROX_STATIONS.map((s) => values[`${s}Seconds`])
      if (!all(runs) || !all(stations)) return
      const runTotal = sum(runs)
      const stationTotal = sum(stations)
      put('run_total_s', runTotal)
      put('station_total_s', stationTotal)
      put('total_time_s', runTotal + stationTotal + (values.roxzoneSeconds ?? 0))
      // Laufabfall: Läufe 7–8 gegen Läufe 1–2, in Prozent. Positiv = langsamer geworden.
      const early = (runs[0] + runs[1]) / 2
      const late = (runs[6] + runs[7]) / 2
      put('run_decay_percent', Math.round(((late - early) / early) * 1000) / 10)
    },
    sortOrder: 535,
    name: { de: 'HYROX-Simulation', en: 'HYROX simulation' },
    shortName: { de: 'HYROX-Sim.', en: 'HYROX sim' },
    summary: {
      de: 'Acht Läufe und acht Stationen, jede Zeit einzeln. Die Aussage steckt im Verlauf: wie stark die Läufe nachlassen und welche Station einen wachsenden Anteil der Zeit frisst — gegen deine eigenen früheren Simulationen.',
      en: 'Eight runs and eight stations, each time recorded separately. The finding lies in the course: how much the runs slow down and which station takes a growing share of the time — against your own earlier simulations.',
    },
    instructions: {
      de: 'Format wie im Wettkampf: 1 km Lauf, dann eine Station, achtmal — SkiErg 1000 m, Schlitten schieben 50 m, Schlitten ziehen 50 m, Burpee Broad Jumps 80 m, Rudern 1000 m, Farmers Carry 200 m, Sandbag Lunges 100 m, Wall Balls 100. Jeden Lauf und jede Station einzeln stoppen; die Wechselzeiten auf Wunsch gesamt als Roxzone. Lasten, Strecke und Untergrund über die Termine gleich halten — sonst vergleicht der Verlauf die Bedingungen statt dich.',
      en: 'Race format: 1 km run, then one station, eight times — SkiErg 1000 m, sled push 50 m, sled pull 50 m, burpee broad jumps 80 m, row 1000 m, farmers carry 200 m, sandbag lunges 100 m, wall balls 100. Time every run and every station separately; optionally the transitions in total as roxzone. Keep loads, course and surface constant across sessions — otherwise the trend compares conditions instead of you.',
    },
    equipmentIds: [['measured_course', 'treadmill'], ['ski_erg'], ['sled'], ['rowing_erg'], ['kettlebell', 'dumbbells'], ['added_load'], ['wall_ball'], ['stopwatch']],
    equipment: {
      de: 'Laufstrecke oder Laufband, SkiErg, Schlitten, Rudergerät, Gewichte für den Carry, Sandsack, Wall Ball, Stoppuhr',
      en: 'Running route or treadmill, SkiErg, sled, rowing erg, carry weights, sandbag, wall ball, stopwatch',
    },
  },
  {
    slug: 'combat_rounds',
    primaryMetric: 'total_actions',
    primaryUnit: 'Aktionen',
    fields: [
      { key: 'round1Actions', type: 'integer', unit: 'Aktionen', required: true, min: 0, max: 400 },
      { key: 'round2Actions', type: 'integer', unit: 'Aktionen', required: true, min: 0, max: 400 },
      { key: 'round3Actions', type: 'integer', unit: 'Aktionen', required: true, min: 0, max: 400 },
      { key: 'round4Actions', type: 'integer', unit: 'Aktionen', required: false, min: 0, max: 400 },
      { key: 'round5Actions', type: 'integer', unit: 'Aktionen', required: false, min: 0, max: 400 },
      { key: 'roundSeconds', type: 'integer', unit: 's', required: true, min: 60, max: 600 },
      { key: 'restSeconds', type: 'integer', unit: 's', required: true, min: 15, max: 180 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['total_actions', 'round_decay_percent'],
    derive: (values, _ctx, put) => {
      const rounds = [values.round1Actions, values.round2Actions, values.round3Actions, values.round4Actions, values.round5Actions].filter(
        (v): v is number => v != null && Number.isFinite(v),
      )
      if (rounds.length < 3) return
      put('total_actions', sum(rounds))
      // Rundenabfall: letzte gegen erste Runde, in Prozent. Positiv = weniger Aktionen am Ende.
      if (rounds[0] > 0) put('round_decay_percent', Math.round(((rounds[0] - rounds[rounds.length - 1]) / rounds[0]) * 1000) / 10)
    },
    sortOrder: 510,
    name: { de: 'Kampfsport-Runden', en: 'Combat rounds' },
    shortName: { de: 'Runden', en: 'Rounds' },
    summary: {
      de: 'Drei bis fünf Runden in Wettkampflänge mit derselben technischen Aktion, jede Runde einzeln gezählt. Nicht die Gesamtzahl ist die Aussage, sondern wie viel in der letzten Runde noch übrig ist.',
      en: 'Three to five rounds at competition length with the same technical action, each round counted separately. The finding is not the total but how much is left in the last round.',
    },
    instructions: {
      de: 'Rundenlänge und Pause wie im eigenen Wettkampf (z. B. 3 × 3 min, 1 min Pause). In jeder Runde so viele saubere Aktionen wie möglich — Schlagkombinationen am Sack, Eindreher am Partner oder Takedowns — und je Runde einzeln zählen. Aktion, Partner und Rundenformat über die Termine gleich halten.',
      en: 'Round length and rest as in your own competition (e.g. 3 × 3 min, 1 min rest). In each round as many clean actions as possible — combinations on the bag, entries on a partner or takedowns — counted per round. Keep action, partner and round format constant across sessions.',
    },
    equipmentIds: [['stopwatch'], ['heavy_bag', 'partner'], ['counter', 'partner']],
    equipment: { de: 'Stoppuhr, Sandsack oder Partner, Zähler oder zählender Partner', en: 'Stopwatch, bag or partner, counter or a partner who counts' },
  },
]
