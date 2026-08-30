import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import { testsForDimension } from '@/domain/insights'
import type { PerformanceDimension } from '@/types/domain'
import type { Evidence } from '@/domain/insights'

/**
 * Trainingsschwerpunkte je Achse (§30).
 *
 * Ausdrücklich als PERFORMANCE-Empfehlung gekennzeichnet und nicht als
 * medizinische oder trainingsplanerische Beratung — genau die Unterscheidung,
 * die der Auftrag verlangt.
 *
 * Was hier steht, ist bewusst eng: die Qualitäten, die eine Achse per
 * Definition ausmachen, plus ein Zeitfenster, in dem sich bei dieser Qualität
 * überhaupt eine messbare Veränderung einstellen kann. Kein Übungsplan, keine
 * Sätze, keine Wiederholungen — das ist die Arbeit eines Trainers, und die
 * App kennt weder Vorgeschichte noch Belastbarkeit des Athleten.
 *
 * Der Umfang ist als Bandbreite angegeben, weil eine Punktzahl («3,5 Einheiten
 * pro Woche») eine Genauigkeit vortäuschen würde, die niemand belegen kann.
 */

export interface Emphasis {
  dimension: PerformanceDimension
  /** Qualitäten, die diese Achse ausmachen. i18n-Schlüssel. */
  focusKeys: string[]
  /** Einheiten je Woche, als Spanne. */
  sessionsPerWeek: [number, number]
  /** Zeitfenster in Wochen, nach dem eine Wiederholungsmessung sinnvoll ist. */
  weeksToRetest: [number, number]
  /** Tests, mit denen sich der Fortschritt auf dieser Achse prüfen lässt. */
  verifyWith: string[]
}

/**
 * Die Zeitfenster folgen der Faustregel, dass neuromuskuläre Anpassungen
 * früher messbar werden als strukturelle und diese früher als aerobe. Sie
 * sind als Voreinstellung dieser App gekennzeichnet und nicht als Vorgabe aus
 * der Literatur — dieselbe Ehrlichkeit wie beim Terminvorschlag.
 */
const EMPHASIS: Record<PerformanceDimension, Omit<Emphasis, 'dimension' | 'verifyWith'>> = {
  power: {
    focusKeys: ['emphasis.focus.explosiveStrength', 'emphasis.focus.jumpTechnique', 'emphasis.focus.rateOfForce'],
    sessionsPerWeek: [2, 3],
    weeksToRetest: [4, 6],
  },
  agility: {
    focusKeys: ['emphasis.focus.changeOfDirection', 'emphasis.focus.deceleration', 'emphasis.focus.acceleration'],
    sessionsPerWeek: [2, 3],
    weeksToRetest: [4, 6],
  },
  max_strength: {
    focusKeys: ['emphasis.focus.heavyCompound', 'emphasis.focus.technique', 'emphasis.focus.progressiveOverload'],
    sessionsPerWeek: [2, 4],
    weeksToRetest: [8, 12],
  },
  relative_strength: {
    focusKeys: ['emphasis.focus.bodyweightStrength', 'emphasis.focus.strengthToMass'],
    sessionsPerWeek: [2, 4],
    weeksToRetest: [8, 12],
  },
  strength_endurance: {
    focusKeys: ['emphasis.focus.repeatedEfforts', 'emphasis.focus.lactateTolerance', 'emphasis.focus.pacing'],
    sessionsPerWeek: [2, 3],
    weeksToRetest: [6, 8],
  },
  endurance: {
    focusKeys: ['emphasis.focus.aerobicBase', 'emphasis.focus.threshold', 'emphasis.focus.runningEconomy'],
    sessionsPerWeek: [3, 5],
    weeksToRetest: [8, 12],
  },
}

export function emphasisFor(dimension: PerformanceDimension): Emphasis {
  return {
    dimension,
    ...EMPHASIS[dimension],
    // Womit sich der Fortschritt prüfen lässt: dieselben Tests, die die
    // Achse belegen. Eine Empfehlung ohne Nachweis wäre nicht überprüfbar.
    verifyWith: testsForDimension(dimension).slice(0, 3),
  }
}

/** Alle Achsen — für die Vollständigkeitsprüfung im Test. */
export function allEmphasis(): Emphasis[] {
  return PERFORMANCE_DIMENSIONS.map(emphasisFor)
}

/**
 * Wie belastbar ist ein Schwerpunkt?
 *
 * Er erbt die Belegstärke der Achse, auf die er sich bezieht. Ein
 * Schwerpunkt, der auf einer einzigen Messung fusst, darf nicht so
 * auftreten wie einer aus fünf.
 */
export function emphasisConfidence(evidence: Evidence): 'high' | 'medium' | 'low' {
  return evidence === 'strong' ? 'high' : evidence === 'moderate' ? 'medium' : 'low'
}
