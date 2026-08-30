import { getTest } from '@/data/testCatalog'
import { deltaPercent, isPersonalBest } from '@/lib/scoring'
import type { AppLocale, TestSummary } from '@/types/domain'
import type { StoredResult } from '@/lib/store/localStore'

/** Kurzformen der abgeleiteten Metriken für die Ergebnisliste. */
const METRIC_UNITS: Record<string, string> = {
  vo2max_ml_kg_min: 'ml/kg/min',
  one_rm_kg: 'kg',
  relative_strength_bw: '× KG',
  sinclair_points: 'Sinclair',
  avg_pace_s_per_500m: 's/500m',
  avg_power_w: 'W',
  watts_per_kg: 'W/kg',
  total_reps: 'Wdh.',
  reps_per_minute: '/min',
  calories_per_minute: 'kcal/min',
}

/** Übersetzt gespeicherte Ergebnisse in die Darstellungsform der Listen. */
export function toSummaries(results: StoredResult[], locale: AppLocale): TestSummary[] {
  return results
    .map((result): TestSummary | null => {
      const test = getTest(result.testSlug)
      if (!test || result.score == null) return null

      // Die aussagekräftigste abgeleitete Metrik als Zusatz unter dem Namen.
      const derived: TestSummary['derived'] = {}
      for (const key of test.derivedMetrics) {
        const value = result.metrics[key]
        if (value != null) derived[key] = { value, unit: METRIC_UNITS[key] ?? null }
      }

      return {
        id: result.id,
        slug: test.slug,
        name: test.name[locale],
        category: test.category,
        dimension: test.dimension,
        performedAt: result.performedAt,
        value: result.score,
        unit: test.primaryUnit,
        direction: test.direction,
        deltaPercent: deltaPercent(results, result),
        isPersonalBest: isPersonalBest(results, result),
        // Der Index-Signaturtyp liefert `number`, obwohl der Schlüssel fehlen
        // kann — deshalb hier ausdrücklich auf `number | null` festlegen.
        rpe: (result.values.rpe as number | undefined) ?? null,
        derived,
      }
    })
    .filter((x): x is TestSummary => x !== null)
}
