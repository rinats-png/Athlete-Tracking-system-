import type { EvidenceRule, TrainingSource } from '@/domain/trainingTypes'

/**
 * Das Regelregister der Training Engine (docs/training-engine.md).
 *
 * Hier und nur hier stehen Dosierungen. Jede Regel trägt Quelle, Stärke,
 * Spezifität je Sportfamilie, Grenzen, Sicherheitsangaben und Prüfstatus.
 *
 * ALLE REGELN SIND ZUNÄCHST `unreviewed`. Das ist kein Mangel, sondern der
 * Ausgangszustand: eine Regel wird erst `reviewed`, wenn eine fachkundige
 * Person (Sportwissenschaft oder Trainer) Quelle und Aussage gegengelesen
 * hat, mit Namen und Datum. Bis dahin erscheint sie nur im Vorschauschalter.
 *
 * Herkunft der Inhalte: Recherche «Training Engine Deep Research Master v3»
 * (4. Oktober 2026), Kap. 2, 45, 68, 69. Die Recherche arbeitet auf
 * Abstract-Ebene; `fullTextChecked` bleibt `false`, bis jemand den
 * Volltext gelesen hat.
 */

export const TRAINING_SOURCES: Record<string, TrainingSource> = {
  helgerud_2007: {
    id: 'helgerud_2007',
    citation: 'Helgerud J, Høydal K, Wang E, et al. (2007). Aerobic high-intensity intervals improve VO₂max more than moderate training. Med Sci Sports Exerc.',
    url: null,
    fullTextChecked: false,
  },
}

export const TRAINING_RULES: EvidenceRule[] = [
  {
    id: 'vo2_4x4',
    version: '1.0.0',
    title: 'Intervalle 4 × 4 Minuten',
    intent: 'VO2MAX',
    targetAdaptation: ['vo2max'],
    eligibleFamilies: ['hybrid', 'combat_striking', 'combat_grappling'],
    eligiblePhases: ['GPP', 'BUILD'],
    minimumTrainingAgeYears: 1,
    prescription: {
      // Die Interventionsstudien nutzten häufig drei Einheiten je Woche. Im Plan
      // gilt die Obergrenze aus dem Budget für hohe Intensität, nicht diese Zahl.
      frequencyPerWeek: [1, 3],
      intensity: { type: 'hr_percent_max', min: 90, max: 95 },
      repetitions: [4, 4],
      workSeconds: [240, 240],
      recoverySeconds: [180, 180],
      blockDurationWeeks: [6, 8],
    },
    evidence: {
      strength: 'HIGH',
      specificity: { hybrid: 'EXTRAPOLATED', combat_striking: 'EXTRAPOLATED', combat_grappling: 'EXTRAPOLATED' },
      evidenceTypes: ['rct'],
      sourceIds: ['helgerud_2007'],
      limitations: [
        'Stärke gilt für die Entwicklung der VO₂max, nicht für die Leistung in der Sportart.',
        'Direkte Evidenz für Hybrid und Kampfsport zu genau dieser Form ist niedrig.',
        'Andere Intervallformen (3 bis 5 Minuten, kurze Intervalle) können gleichwertig sein; 4 × 4 ist nicht allgemein überlegen.',
      ],
    },
    safety: { contraindicationTags: [], requiresCoachApproval: false, forbiddenForAutoPrescription: false },
    requiredContextChecks: ['high_intensity_sessions_per_week', 'fixed_sparring_sessions', 'training_age', 'plausible_hr_max'],
    retestMetric: 'vo2max_ergospirometry',
    review: { state: 'unreviewed' },
  },
]
