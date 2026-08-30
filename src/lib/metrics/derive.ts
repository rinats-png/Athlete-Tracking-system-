import type { TestDefinition } from '@/data/testCatalog'
import type { Sex } from '@/types/domain'
import {
  estimateOneRepMax,
  relativeStrength,
  sinclairPoints,
  vo2maxFromBeepTest,
  vo2maxFromCooper,
  pacePer500m,
  rowingWatts,
  peakPowerSayers,
  averageVelocity,
  pacePerKm,
  sjftIndex,
  fatigueIndexPercent,
  functionalThresholdPower,
  bikeThresholdScore,
  swimTechniqueScore,
  hrDriftPercent,
} from './index'

export interface DeriveContext {
  bodyWeightKg: number | null
  ageYears: number | null
  sex: Sex | null
}

/**
 * Rechnet aus den Rohwerten eines Tests die abgeleiteten Metriken.
 *
 * Entspricht dem, was serverseitig in `result_metrics` landet. Fehlende
 * Voraussetzungen (kein Körpergewicht, kein Alter) führen nicht zu einem
 * Fehler, sondern dazu, dass die betroffene Metrik schlicht fehlt — der Rest
 * bleibt nutzbar.
 */
export function deriveMetrics(
  test: TestDefinition,
  values: Record<string, number>,
  ctx: DeriveContext,
): Record<string, number> {
  const out: Record<string, number> = {}
  const put = (key: string, value: number | null | undefined) => {
    if (value != null && Number.isFinite(value)) out[key] = Math.round(value * 1000) / 1000
  }

  // Rohwerte, die selbst als Metrik dienen, unverändert übernehmen.
  for (const [key, value] of Object.entries(values)) {
    if (Number.isFinite(value)) put(key, value)
  }

  switch (test.slug) {
    case 'cooper_12min':
      put('vo2max_ml_kg_min', vo2maxFromCooper(values.distanceM))
      break

    case 'beep_test_20m':
      put('vo2max_ml_kg_min', vo2maxFromBeepTest(values.level, ctx.ageYears ?? 30))
      break

    case 'row_2000m':
    case 'row_1000m': {
      const seconds = values.durationSeconds
      const meters = test.protocol.targetDistanceM ?? 2000
      put('avg_pace_s_per_500m', pacePer500m(seconds, meters))
      const watts = rowingWatts(seconds, meters)
      put('avg_power_w', watts)
      if (watts != null && ctx.bodyWeightKg) put('watts_per_kg', watts / ctx.bodyWeightKg)
      break
    }

    case 'cindy_20min_amrap': {
      // Eine Runde Cindy sind 5 + 10 + 15 = 30 Wiederholungen.
      const total = (values.rounds ?? 0) * 30 + (values.partialReps ?? 0)
      put('total_reps', total)
      put('reps_per_minute', total / 20)
      break
    }

    case 'assault_bike_10min_cal':
      put('calories_per_minute', values.calories / 10)
      break

    case 'repeated_jump_15s': {
      // Der Mittelwert wird gebildet, nicht eingegeben: zwei Zahlen, die
      // dasselbe beschreiben, könnten auseinanderlaufen.
      const count = values.jumpCount
      if (count != null && count > 0 && values.totalHeightCm != null) {
        put('avg_jump_height_cm', values.totalHeightCm / count)
      }
      break
    }

    case 'weighted_pull_up_1rm': {
      // Gewertet wird die bewegte Gesamtlast. Das Zusatzgewicht allein wäre
      // ohne das Körpergewicht daneben nicht vergleichbar.
      if (ctx.bodyWeightKg != null && values.addedLoadKg != null) {
        const total = estimateOneRepMax(
          ctx.bodyWeightKg + values.addedLoadKg,
          values.reps ?? 1,
          'epley',
        )
        put('total_load_kg', total)
        put('total_load_bw', total / ctx.bodyWeightKg)
      }
      break
    }

    case 'special_judo_fitness_test': {
      const total = (values.throwsA ?? 0) + (values.throwsB ?? 0) + (values.throwsC ?? 0)
      put('totalThrows', total)
      put('sjft_index', sjftIndex(total, values.hrEnd, values.hrAfter1min))
      break
    }

    case 'grip_strength': {
      if (ctx.bodyWeightKg && values.gripKg != null) {
        put('grip_relative', values.gripKg / ctx.bodyWeightKg)
      }
      // Seitenunterschied nur, wenn beide Seiten gemessen wurden. Aus einer
      // Seite eine Asymmetrie zu rechnen wäre eine erfundene Zahl.
      if (values.gripKg != null && values.gripLeftKg != null) {
        const best = Math.max(values.gripKg, values.gripLeftKg)
        const worst = Math.min(values.gripKg, values.gripLeftKg)
        put('grip_asymmetry_percent', fatigueIndexPercent(best, worst))
      }
      break
    }

    case 'punch_test_60s':
    case 'kick_test_60s': {
      // Abfall zwischen erster und zweiter halber Minute.
      const first = values.repsFirst30
      if (first != null && values.reps != null && first > 0) {
        const second = values.reps - first
        put('fatigue_index_percent', fatigueIndexPercent(first, Math.max(0, second)))
      }
      break
    }

    case 'ftp_20min': {
      const ftp = functionalThresholdPower(values.avgPowerW)
      put('ftp_watt', ftp)
      if (ftp != null && ctx.bodyWeightKg) put('ftp_watt_per_kg', ftp / ctx.bodyWeightKg)
      put('bike_threshold_score', bikeThresholdScore(ftp, ctx.bodyWeightKg))
      break
    }

    case 'wingate_30s': {
      put('fatigue_index_percent', fatigueIndexPercent(values.peakPowerW, values.minPowerW))
      break
    }

    case 'swim_incremental': {
      put('swim_technique_score', swimTechniqueScore(values.strokeLengthM, values.thresholdPaceS100))
      break
    }

    case 'brick_bike_run': {
      // Die Pace bezieht sich auf den Laufteil, nicht auf die Gesamtzeit.
      const runSeconds =
        values.durationSeconds != null && values.bikeMinutes != null
          ? values.durationSeconds - values.bikeMinutes * 60
          : null
      if (runSeconds != null && runSeconds > 0) {
        put('avg_pace_s_per_km', pacePerKm(runSeconds, values.runDistanceM))
      }
      break
    }

    case 'special_wrestling_fitness_test': {
      // Gleiche Rechnung wie der SJFT, eigener Schlüssel: die Referenzwerte
      // der beiden Tests sind nicht austauschbar.
      const total = (values.throwsA ?? 0) + (values.throwsB ?? 0) + (values.throwsC ?? 0)
      put('totalThrows', total)
      put('swft_index', sjftIndex(total, values.hrEnd, values.hrAfter1min))
      break
    }

    case 'uchi_komi_fitness_test':
    case 'jjapt':
    case 'punch_test_180s': {
      // Abfall zwischen den ersten 30 s und dem hochgerechneten Rest.
      const first = values.repsFirst30
      const seconds = test.protocol.durationSeconds
      if (first != null && first > 0 && values.reps != null && seconds != null && seconds > 30) {
        const rest = values.reps - first
        const restPer30 = rest / ((seconds - 30) / 30)
        put('fatigue_index_percent', fatigueIndexPercent(first, Math.max(0, restPer30)))
      }
      if (values.reps != null && seconds) put('reps_per_minute', values.reps / (seconds / 60))
      break
    }

    case 'fatigue_circuit_4x30s': {
      const sets = [values.repsSet1, values.repsSet2, values.repsSet3, values.repsSet4].filter(
        (v): v is number => v != null && Number.isFinite(v),
      )
      if (sets.length > 0) {
        put('reps', sets.reduce((a, b) => a + b, 0))
        put('fatigue_index_percent', fatigueIndexPercent(Math.max(...sets), Math.min(...sets)))
      }
      break
    }

    case 'grappling_circuit_5min': {
      put('total_reps', (values.rounds ?? 0) * 3 + (values.partialReps ?? 0))
      break
    }

    case 'rope_climb': {
      if (values.reps != null && values.heightM != null) {
        put('climb_meters_total', values.reps * values.heightM)
      }
      break
    }

    case 'rope_skipping_3min': {
      if (values.reps != null) put('reps_per_minute', values.reps / 3)
      break
    }

    case 'ski_erg_1000m': {
      put('avg_pace_s_per_500m', pacePer500m(values.durationSeconds, 1000))
      break
    }

    case 'obstacle_course_sim': {
      if (values.durationSeconds != null && values.stations != null && values.stations > 0) {
        put('seconds_per_station', values.durationSeconds / values.stations)
      }
      break
    }

    case 'uphill_run_test': {
      // Steigleistung in Höhenmetern je Stunde — die Grösse, in der am Berg
      // gerechnet wird. Die reine Zeit sagt ohne die Höhenmeter nichts.
      if (values.elevationGainM != null && values.durationSeconds != null && values.durationSeconds > 0) {
        put('vertical_speed_m_per_h', (values.elevationGainM / values.durationSeconds) * 3600)
      }
      if (values.elevationGainM != null && values.distanceM != null && values.distanceM > 0) {
        put('grade_percent', (values.elevationGainM / values.distanceM) * 100)
      }
      break
    }

    case 'downhill_run_test': {
      if (values.elevationLossM != null && values.distanceM != null && values.distanceM > 0) {
        put('grade_percent', (values.elevationLossM / values.distanceM) * 100)
      }
      break
    }

    case 'hr_drift_test': {
      put('hr_drift_percent', hrDriftPercent(values.hrFirstHalf, values.hrSecondHalf))
      if (values.distanceM != null) {
        put('avg_pace_s_per_km', pacePerKm(values.durationSeconds, values.distanceM))
      }
      break
    }

    case 'submax_efficiency_bike': {
      // Watt je Herzschlag: steigt der Wert bei gleicher Wattzahl, ist die
      // aerobe Grundlage besser geworden.
      if (values.targetPowerW != null && values.avgHeartRate != null && values.avgHeartRate > 0) {
        put('efficiency_w_per_bpm', values.targetPowerW / values.avgHeartRate)
      }
      if (values.targetPowerW != null && ctx.bodyWeightKg) {
        put('watts_per_kg', values.targetPowerW / ctx.bodyWeightKg)
      }
      break
    }

    case 'repeated_sprint_bike': {
      put('fatigue_index_percent', fatigueIndexPercent(values.peakPowerW, values.lastSprintPowerW))
      break
    }

    case 'swim_100m_backstroke':
    case 'swim_100m_breaststroke':
    case 'swim_100m_butterfly': {
      if (values.strokeCount != null) put('strokes_per_100m', values.strokeCount)
      break
    }

    default:
      break
  }

  // Sprint: Geschwindigkeit über die im Protokoll hinterlegte Distanz.
  if (test.category === 'speed' && test.protocol.targetDistanceM != null) {
    put('avg_velocity_m_s', averageVelocity(test.protocol.targetDistanceM, values.durationSeconds))
  }

  // Laufstrecken mit fester Distanz: Pace je Kilometer.
  if (
    test.derivedMetrics.includes('avg_pace_s_per_km') &&
    test.protocol.targetDistanceM != null
  ) {
    put('avg_pace_s_per_km', pacePerKm(values.durationSeconds, test.protocol.targetDistanceM))
  }

  // Leistung je Körpergewicht, wo eine Leistung gemessen wurde.
  if (test.derivedMetrics.includes('watts_per_kg') && ctx.bodyWeightKg && out.watts_per_kg == null) {
    const watts = values.avgPowerW ?? values.peakPowerW
    if (watts != null) put('watts_per_kg', watts / ctx.bodyWeightKg)
  }

  // Zusatzlast je Körpergewicht bei getragenen Aufgaben (Farmers Carry,
  // Schlitten, Marsch): 60 kg sind für 60 kg Körpergewicht etwas anderes
  // als für 100 kg.
  if (test.derivedMetrics.includes('load_relative') && ctx.bodyWeightKg && values.loadKg != null) {
    put('load_relative', values.loadKg / ctx.bodyWeightKg)
  }

  // Sprungtests: geschätzte Spitzenleistung nach Sayers.
  if (values.jumpHeightCm != null && ctx.bodyWeightKg != null) {
    const watts = peakPowerSayers(values.jumpHeightCm, ctx.bodyWeightKg)
    put('peak_power_w', watts)
    if (watts != null) put('peak_power_w_per_kg', watts / ctx.bodyWeightKg)
  }


  // Kraftmetriken gelten für jeden Test mit Last und Wiederholungen.
  if (values.loadKg != null && values.reps != null) {
    const oneRm = estimateOneRepMax(values.loadKg, values.reps, 'epley')
    put('one_rm_kg', oneRm)
    if (ctx.bodyWeightKg) put('relative_strength_bw', relativeStrength(oneRm, ctx.bodyWeightKg))
    if (ctx.bodyWeightKg && (ctx.sex === 'male' || ctx.sex === 'female')) {
      put('sinclair_points', sinclairPoints(oneRm, ctx.bodyWeightKg, ctx.sex))
    }
  } else if (
    values.loadKg != null &&
    ctx.bodyWeightKg &&
    test.derivedMetrics.includes('relative_strength_bw')
  ) {
    // Bear Complex: Last ohne Wiederholungszahl, aber relativ bewertbar.
    // Getragene Aufgaben (Farmers Carry, Schlitten) haben ebenfalls eine
    // Last ohne Wiederholungen — dort ist sie aber keine Kraftfähigkeit,
    // sondern eine Vorgabe. Deshalb nur, wo der Katalog es ausweist.
    put('relative_strength_bw', relativeStrength(values.loadKg, ctx.bodyWeightKg))
  }

  return out
}

/** Der Wert, der in Listen als Ergebnis des Tests erscheint. */
export function primaryValue(
  test: TestDefinition,
  values: Record<string, number>,
  metrics: Record<string, number>,
): number | null {
  const candidate = metrics[test.primaryMetric] ?? values[test.primaryMetric]
  return candidate != null && Number.isFinite(candidate) ? candidate : null
}
