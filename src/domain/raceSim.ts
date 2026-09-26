import { HYROX_STATIONS, type HyroxStation } from '@/data/testCatalogRaceSim'
import { DETECTION_FACTOR } from '@/domain/change'
import { durabilityPoints, durabilitySeries, typicalErrorPp, DURABILITY_MIN_BASELINE, type DurabilitySource } from '@/domain/durability'
import type { InsightRule, RuleHit } from '@/domain/insightEngine'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Auswertung der Wettkampfsimulationen (Master-Spezifikation D7).
 *
 * HYROX: acht Läufe, acht Stationen, Roxzone. Daraus der Laufabfall, der
 * Anteil jeder Station an der Gesamtzeit und die Abweichung jeder Station
 * vom eigenen Median früherer Simulationen.
 *
 * KAMPFSPORT: Aktionen je Runde, der Abfall von der ersten zur letzten.
 *
 * KEINE NORMEN. Es gibt keine belastbaren Testnormen für eine Simulation
 * (references.ts, Lückenliste). Verglichen wird nur mit sich selbst, und
 * «langsamer/schneller» wird nur ausgesprochen, wenn die Abweichung grösser
 * ist als die eigene Streuung dieser Station (ab vier früheren Simulationen,
 * × 1,96·√2) — sonst steht die Zahl ohne Urteil da (§19 Regel 7).
 *
 * «GRÖSSTER ANTEIL» ist eine Beschreibung, kein Befund: die Station, die am
 * meisten Zeit kostet, ist nicht automatisch der Limiter — die Rudern-Station
 * dauert bei fast allen länger als die Schlitten. Deshalb steht daneben die
 * Station, die gegen die EIGENEN früheren Simulationen am weitesten zurückliegt.
 */

export const RACE_SIM_VERSION = '1.0.0'

export type StationVerdict = 'slower' | 'faster' | 'within_noise' | 'no_history'

export interface StationRow {
  station: HyroxStation
  seconds: number
  /** Anteil an der Gesamtzeit in Prozent. */
  sharePct: number
  /** Median dieser Station in früheren Simulationen. */
  ownMedian: number | null
  /** Abweichung vom eigenen Median in Prozent. Positiv = langsamer. */
  deltaPct: number | null
  /** Erkennbare Abweichung in Prozent, oder null ohne genug Vorlauf. */
  detectablePct: number | null
  verdict: StationVerdict
}

export interface HyroxBreakdown {
  resultId: string
  day: string
  runs: number[]
  stations: StationRow[]
  roxzone: number | null
  total: number
  runTotal: number
  stationTotal: number
  /** Läufe 7–8 gegen 1–2 in Prozent. Positiv = langsamer geworden. */
  runDecayPct: number
  /** Station mit dem grössten Zeitanteil — beschreibend. */
  largestShare: HyroxStation
  /** Station am weitesten über dem eigenen Median, jenseits der Streuung — oder null. */
  ownLimiter: HyroxStation | null
  priorSims: number
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const round1 = (v: number) => Math.round(v * 10) / 10

function hyroxValues(r: StoredResult): { runs: number[]; stations: number[]; roxzone: number | null } | null {
  const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => num(r.values[`run${n}Seconds`]))
  const stations = HYROX_STATIONS.map((s) => num(r.values[`${s}Seconds`]))
  if (runs.some((x) => x == null) || stations.some((x) => x == null)) return null
  return { runs: runs as number[], stations: stations as number[], roxzone: num(r.values.roxzoneSeconds) }
}

/** Die jüngste vollständige Simulation, gegen alle davor. */
export function hyroxBreakdown(results: StoredResult[]): HyroxBreakdown | null {
  const sims = results
    .filter((r) => r.testSlug === 'hyrox_simulation')
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .map((r) => ({ r, v: hyroxValues(r) }))
    .filter((x): x is { r: StoredResult; v: NonNullable<ReturnType<typeof hyroxValues>> } => x.v != null)
  const last = sims.at(-1)
  if (!last) return null
  const prior = sims.slice(0, -1)
  const { runs, stations, roxzone } = last.v
  const runTotal = runs.reduce((a, b) => a + b, 0)
  const stationTotal = stations.reduce((a, b) => a + b, 0)
  const total = runTotal + stationTotal + (roxzone ?? 0)

  const rows: StationRow[] = HYROX_STATIONS.map((station, i) => {
    const seconds = stations[i]
    const history = prior.map((p) => p.v.stations[i])
    const ownMedian = median(history)
    const deltaPct = ownMedian == null || ownMedian <= 0 ? null : round1(((seconds - ownMedian) / ownMedian) * 100)
    let detectablePct: number | null = null
    let verdict: StationVerdict = ownMedian == null ? 'no_history' : 'within_noise'
    if (history.length >= DURABILITY_MIN_BASELINE && ownMedian != null) {
      // Streuung der Station in Prozent ihres Medians.
      const te = typicalErrorPp(history.map((h) => (h / ownMedian) * 100)) ?? 0
      detectablePct = round1(Math.max(3, te * DETECTION_FACTOR))
      if (deltaPct != null && deltaPct > detectablePct) verdict = 'slower'
      else if (deltaPct != null && deltaPct < -detectablePct) verdict = 'faster'
    }
    return { station, seconds, sharePct: round1((seconds / total) * 100), ownMedian, deltaPct, detectablePct, verdict }
  })

  const largestShare = rows.reduce((a, b) => (b.seconds > a.seconds ? b : a)).station
  const slower = rows.filter((r) => r.verdict === 'slower').sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))
  const early = (runs[0] + runs[1]) / 2
  const late = (runs[6] + runs[7]) / 2

  return {
    resultId: last.r.id,
    day: last.r.performedAt.slice(0, 10),
    runs,
    stations: rows,
    roxzone,
    total,
    runTotal,
    stationTotal,
    runDecayPct: round1(((late - early) / early) * 100),
    largestShare,
    ownLimiter: slower[0]?.station ?? null,
    priorSims: prior.length,
  }
}

export interface CombatBreakdown {
  resultId: string
  day: string
  rounds: number[]
  roundSeconds: number | null
  /** Letzte gegen erste Runde in Prozent. Positiv = weniger Aktionen am Ende. */
  decayPct: number | null
}

export function combatBreakdown(results: StoredResult[]): CombatBreakdown | null {
  const last = results
    .filter((r) => r.testSlug === 'combat_rounds')
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .at(-1)
  if (!last) return null
  const v = last.values
  const rounds = [v.round1Actions, v.round2Actions, v.round3Actions, v.round4Actions, v.round5Actions].map(num).filter((x): x is number => x != null)
  if (rounds.length < 3) return null
  return {
    resultId: last.id,
    day: last.performedAt.slice(0, 10),
    rounds,
    roundSeconds: num(v.roundSeconds),
    decayPct: rounds[0] > 0 ? round1(((rounds[0] - rounds[rounds.length - 1]) / rounds[0]) * 100) : null,
  }
}

// --- Regeln -------------------------------------------------------------------

/**
 * Der Abfall über das Rennen bzw. die Runden nimmt zu: die beiden jüngsten
 * Simulationen liegen im Erhalt (frisch gegen ermüdet) jenseits der eigenen
 * Streuung unter dem früheren Median. Dieselbe Rechnung wie bei der
 * Ermüdungsresistenz — nur hier, unter `sportAnalysis`, und nur einmal.
 */
function decayRule(id: 'hyrox_run_decay' | 'combat_round_decay', source: DurabilitySource): InsightRule {
  return {
    id,
    version: RACE_SIM_VERSION,
    category: 'durability',
    severity: 'notice',
    cooldownDays: 28,
    requires: 'sportAnalysis',
    evaluate: (ctx) => {
      const series = durabilitySeries(durabilityPoints(ctx.results), source)
      if (series.verdict !== 'worsened') return []
      const hit: RuleHit = {
        subject: source,
        values: {
          latest: series.latest.value ?? 0,
          baseline: series.baselineMedian ?? 0,
          detectable: series.detectablePp ?? 0,
        },
        evidence: series.points.slice(-2).map((p) => ({ kind: 'result' as const, id: p.resultId, key: source, value: p.retentionPct, day: p.day })),
        whyNow: 'two_lower_beyond_noise',
        confidence: series.points.length >= 8 ? 0.8 : 0.6,
        link: { kind: 'route', target: '/sportanalyse' },
      }
      return [hit]
    },
  }
}

/** Eine Station liegt in der jüngsten Simulation jenseits der eigenen Streuung über ihrem Median. */
const hyroxStationSlower: InsightRule = {
  id: 'hyrox_station_slower',
  version: RACE_SIM_VERSION,
  category: 'performance',
  severity: 'info',
  cooldownDays: 28,
  requires: 'sportAnalysis',
  evaluate: (ctx) => {
    const b = hyroxBreakdown(ctx.results)
    if (!b?.ownLimiter) return []
    const row = b.stations.find((s) => s.station === b.ownLimiter)!
    return [
      {
        subject: `${b.resultId}:${row.station}`,
        values: { station: row.station, delta: row.deltaPct ?? 0, detectable: row.detectablePct ?? 0 },
        evidence: [{ kind: 'result', id: b.resultId, key: 'hyrox_simulation', value: row.seconds, day: b.day }],
        whyNow: 'station_beyond_own_noise',
        confidence: b.priorSims >= 6 ? 0.8 : 0.6,
        link: { kind: 'route', target: '/sportanalyse' },
      },
    ]
  },
}

export const RACE_SIM_RULES: InsightRule[] = [decayRule('hyrox_run_decay', 'hyrox_simulation'), decayRule('combat_round_decay', 'combat_rounds'), hyroxStationSlower]
