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

/** Quellen aus dem Quellenregister der Recherche (Kap. 68). Alle nur auf Abstract-Ebene gelesen. */
const src = (id: string, citation: string, doiId: string | null): TrainingSource => ({ id, citation, url: doiId ? `https://doi.org/${doiId}` : null, fullTextChecked: false })

Object.assign(TRAINING_SOURCES, {
  rst_meta_2023: src('rst_meta_2023', 'Thurlow F, et al. (2024). Effects of Repeated-Sprint Training on Physical Fitness and Physiological Adaptation in Athletes. Sports Med.', '10.1007/s40279-023-01959-1'),
  acsm_2026: src('acsm_2026', 'Currier BS, et al. (2026). ACSM Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults. Med Sci Sports Exerc.', '10.1249/MSS.0000000000003897'),
  combat_strength_2023: src('combat_strength_2023', 'Cid-Calfucura I, et al. (2023). Effects of Strength Training on Physical Fitness of Olympic Combat Sports Athletes. Int J Environ Res Public Health.', '10.3390/ijerph20043516'),
  combat_plyo_2023: src('combat_plyo_2023', 'Ojeda-Aravena A, et al. (2023). Plyometric-Jump Training on Physical Fitness of Combat Sport Athletes. Sports (Basel).', '10.3390/sports11020033'),
  concurrent_2024: src('concurrent_2024', 'Huiberts RO, et al. (2024). Concurrent Strength and Endurance Training: impact of sex and training status. Sports Med.', '10.1007/s40279-023-01943-9'),
  concurrent_umbrella_2026: src('concurrent_umbrella_2026', 'Held S, et al. (2026). Maximizing Adaptations in Concurrent Training: An Umbrella Review of Meta-analyses. Sports Med.', '10.1007/s40279-026-02401-y'),
  heavy_strength_cyclists_2025: src('heavy_strength_cyclists_2025', 'Llanos-Lagos C, et al. (2025). Heavy strength training effects on physiological determinants of endurance cyclist performance. Eur J Appl Physiol.', '10.1007/s00421-025-05883-2'),
  hyrox_demand_2025: src('hyrox_demand_2025', 'Brandt T, et al. (2025). Acute physiological responses and performance determinants in Hyrox. Front Physiol.', '10.3389/fphys.2025.1519240'),
  hift_scoping_2025: src('hift_scoping_2025', 'Villarroel López P, Juárez Santos-García D. (2025). HIFT in Hybrid Competitions: A Scoping Review of Performance Models and Physiological Adaptations. J Funct Morphol Kinesiol.', '10.3390/jfmk10040365'),
})

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
  {
    id: 'rst_30m',
    version: '1.0.0',
    title: 'Wiederholte Sprints, 3 Sätze × 6 × 30 m',
    intent: 'REPEATED_SPRINT',
    targetAdaptation: ['repeated_sprint_ability', 'vo2max', 'sprint'],
    eligibleFamilies: ['combat_grappling', 'combat_striking', 'hybrid'],
    eligiblePhases: ['GPP', 'BUILD', 'SPECIFIC'],
    prescription: {
      frequencyPerWeek: [2, 2],
      intensity: { type: 'max_effort' },
      sets: [3, 3],
      repetitions: [6, 6],
      distanceM: [30, 30],
      // Pause: die Studienlage nennt «höchstens 60 Sekunden»; eine genauere Pause legt sie nicht fest.
      recoverySeconds: [0, 60],
      blockDurationWeeks: [6, 6],
    },
    evidence: {
      strength: 'MODERATE',
      specificity: { combat_grappling: 'RELATED', combat_striking: 'RELATED', hybrid: 'EXTRAPOLATED' },
      evidenceTypes: ['meta_analysis'],
      sourceIds: ['rst_meta_2023'],
      limitations: [
        'Läufe bis 10 Sekunden, Pause bis 60 Sekunden; Alter 14 bis 35 Jahre, 2 bis 12 Wochen.',
        'Mehr Frequenz, Dauer, Volumen oder Distanz brachte keinen belegten Zusatznutzen.',
        'Für Hybrid nur übertragen; für Grappling verwandt (Team- und Kampfsport), nicht direkt untersucht.',
      ],
    },
    safety: { contraindicationTags: [], requiresCoachApproval: false, forbiddenForAutoPrescription: false },
    requiredContextChecks: ['high_intensity_sessions_per_week', 'fixed_sparring_sessions'],
    retestMetric: 'sprint_30m',
    review: { state: 'unreviewed' },
  },
  {
    id: 'max_strength_80',
    version: '1.0.0',
    title: 'Maximalkraft ab 80 % 1RM',
    intent: 'MAX_STRENGTH',
    targetAdaptation: ['max_strength', 'relative_strength'],
    eligibleFamilies: ['combat_grappling', 'combat_striking', 'hybrid'],
    eligiblePhases: ['GPP', 'BUILD', 'SPECIFIC'],
    prescription: {
      // «Mindestens zwei Einheiten pro Woche»: eine Obergrenze nennt die Quelle nicht, der Plan nutzt die Untergrenze.
      frequencyPerWeek: [2, 2],
      intensity: { type: 'percent_1rm', min: 80, max: 100 },
      sets: [2, 3],
    },
    evidence: {
      strength: 'MODERATE',
      // Die Kampfsport-Übersicht nennt Judo und Boxen unter den Sportarten mit Effekt in spezifischen Aktionen; für die übrigen gilt «verwandt».
      specificity: { combat_grappling: 'RELATED', combat_striking: 'RELATED', hybrid: 'GENERAL' },
      specificityByDiscipline: { judo: 'DIRECT', boxing: 'DIRECT' },
      evidenceTypes: ['consensus', 'systematic_review'],
      sourceIds: ['acsm_2026', 'combat_strength_2023', 'heavy_strength_cyclists_2025'],
      limitations: [
        'Allgemeine Trainingsphysiologie: HIGH (ACSM 2026). Im Kampfsport: MODERATE, Frauen unterrepräsentiert. Hier gilt die vorsichtigere Stufe.',
        'Wiederholungszahl, Übung und Reihenfolge legt die Quelle nicht fest: die Wahl der Übung bleibt beim Trainer.',
        'Periodisierung selbst ist für den Krafteffekt nicht belegt.',
        'Bei Ausdauersportlern (Radsport, Evidenz niedrig) verbesserte schweres Krafttraining Effizienz und Leistung ohne Änderung der VO₂max; in Hybridplänen bleibt Kraft deshalb erhalten.',
      ],
    },
    safety: { contraindicationTags: [], requiresCoachApproval: false, forbiddenForAutoPrescription: false },
    requiredContextChecks: ['training_age'],
    minimumTrainingAgeYears: 1,
    retestMetric: 'deadlift_1rm',
    review: { state: 'unreviewed' },
  },
  {
    id: 'power_30_70',
    version: '1.0.0',
    title: 'Power bei 30 bis 70 % 1RM',
    intent: 'POWER',
    targetAdaptation: ['power'],
    eligibleFamilies: ['combat_grappling', 'combat_striking', 'hybrid'],
    eligiblePhases: ['GPP', 'BUILD', 'SPECIFIC'],
    prescription: {
      intensity: { type: 'percent_1rm', min: 30, max: 70 },
      repsPerSet: [1, 24],
    },
    evidence: {
      strength: 'MODERATE',
      specificity: { combat_grappling: 'RELATED', combat_striking: 'RELATED', hybrid: 'GENERAL' },
      specificityByDiscipline: { judo: 'DIRECT', boxing: 'DIRECT' },
      evidenceTypes: ['consensus', 'systematic_review'],
      sourceIds: ['acsm_2026', 'combat_strength_2023'],
      limitations: [
        'Höchstens 24 Wiederholungen pro Satz, maximale konzentrische Bewegungsabsicht; eine Frequenz nennt die Quelle nicht.',
        'Im Kampfsport verbesserte Krafttraining auch spezifische Aktionen (Judo, Karate, Fechten, Boxen); Frauen unterrepräsentiert.',
      ],
    },
    safety: { contraindicationTags: [], requiresCoachApproval: false, forbiddenForAutoPrescription: false },
    requiredContextChecks: ['training_age'],
    minimumTrainingAgeYears: 1,
    retestMetric: 'countermovement_jump',
    review: { state: 'unreviewed' },
  },
  {
    id: 'plyo_combat',
    version: '1.0.0',
    title: 'Plyometrie im Kampfsport',
    intent: 'PLYOMETRIC',
    targetAdaptation: ['jump', 'power', 'change_of_direction'],
    eligibleFamilies: ['combat_grappling', 'combat_striking'],
    eligiblePhases: ['GPP', 'BUILD'],
    prescription: {
      frequencyPerWeek: [2, 3],
      blockDurationWeeks: [4, 12],
    },
    evidence: {
      // GRADE «niedrig bis moderat»: hier die niedrigere Stufe.
      strength: 'LOW',
      // Die Meta-Analyse umfasst Taekwondo, Silat, Ringen, Judo, Fechten und Karate; Boxen, Kickboxen und BJJ kommen nicht vor.
      specificity: { combat_grappling: 'RELATED', combat_striking: 'RELATED' },
      specificityByDiscipline: { judo: 'DIRECT', wrestling: 'DIRECT' },
      evidenceTypes: ['meta_analysis'],
      sourceIds: ['combat_plyo_2023'],
      limitations: [
        'Die Stichproben waren überwiegend männlich und mehrheitlich unter 18 Jahre alt; keine automatische Übertragung auf Frauen, Masters oder Elite.',
        'Kein Effekt auf Körper-, Fett- oder Muskelmasse.',
        'Sprungformen, Anzahl der Kontakte und Aufbau legt die Quelle nicht fest: sie wählt der Trainer.',
      ],
    },
    safety: { contraindicationTags: [], requiresCoachApproval: true, forbiddenForAutoPrescription: false },
    requiredContextChecks: ['training_age'],
    minimumTrainingAgeYears: 1,
    retestMetric: 'countermovement_jump',
    review: { state: 'unreviewed' },
  },
]
