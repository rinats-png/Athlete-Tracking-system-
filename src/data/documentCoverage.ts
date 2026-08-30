/**
 * Abgleich zwischen der Masterliste des Zielgruppendokuments und dem, was die
 * App tatsächlich anbietet.
 *
 * WOZU DIESE DATEI EXISTIERT
 *
 * Die Zusage lautet: ein Test, den das Dokument für eine Disziplin nennt, wird
 * durch spätere Ergänzungen nicht verdrängt. Ohne festgehaltene Herkunft ist
 * das eine Behauptung — man kann sie weder prüfen noch bemerken, wenn sie
 * bricht. Ein Test, der in einem halben Jahr beim Aufräumen aus einer Liste
 * fällt, fällt still.
 *
 * Deshalb steht hier je Disziplin, welche Tests das Dokument nennt und welcher
 * Slug sie umsetzt. `catalogSlug: null` heisst: noch nicht gebaut, mit Grund.
 * Der Bautest in `documentCoverage.spec.ts` prüft beide Richtungen:
 *
 *   1. Jeder Dokumenttest mit Slug ist der Disziplin auch wirklich zugeordnet.
 *   2. Jede Zuordnung, die nicht aus dem Dokument stammt, hat eine Begründung.
 *
 * WAS HIER NICHT STEHT
 *
 * Keine Bewertung, ob ein Testverfahren gut ist. Diese Datei ist Buchführung
 * über eine Quelle, nicht über die Fachlage. Ob der Special Judo Fitness Test
 * taugt, entscheidet die Literatur; hier steht nur, dass das Dokument ihn nennt
 * und die App ihn hat.
 */

export type GapKind =
  /** Baubar mit dem, was die App schon kann — nur noch nicht gebaut. */
  | 'buildable'
  /** Braucht Geräte, die ausserhalb eines Instituts selten verfügbar sind. */
  | 'equipment'
  /** Das Dokument nennt den Test und sagt zugleich, dass es ihn kaum gibt. */
  | 'no_protocol'
  /** In der App vorhanden, aber ausserhalb des Testkatalogs. */
  | 'elsewhere'

export interface DocumentTest {
  /** Bezeichnung wie im Dokument, damit die Zeile wiederauffindbar bleibt. */
  label: string
  /** Umsetzender Slug aus dem Testkatalog, oder null bei einer Lücke. */
  catalogSlug: string | null
  /** Nur bei `catalogSlug: null`: warum noch nicht. */
  gap?: { kind: GapKind; reason: string }
}

export interface DisciplineCoverage {
  disciplineId: string
  /** Was das Dokument für diese Disziplin nennt. */
  documentTests: DocumentTest[]
  /**
   * Zuordnungen, die NICHT aus dem Dokument stammen. Jede braucht einen Grund.
   * Sie kommen hinzu und ersetzen nie einen Dokumenttest.
   */
  additions: { slug: string; reason: string }[]
}

/** Kurzform: mehrere Dokumenttests, die derselbe Slug abdeckt. */
const t = (label: string, catalogSlug: string | null, gap?: DocumentTest['gap']): DocumentTest => ({
  label,
  catalogSlug,
  ...(gap ? { gap } : {}),
})

const add = (slug: string, reason: string) => ({ slug, reason })

// Wiederkehrende Begründungen. Ausgeschrieben, weil eine Abkürzung wie
// «Standard» in einem Jahr niemandem mehr sagt, warum der Test dort steht.
const R = {
  squat: 'Maximalkraft der Beinstreckung als Bezugsgrösse für alle Sprung- und Antrittswerte.',
  deadlift:
    'Ganzkörper-Maximalkraft. Das Dokument nennt für diese Disziplin Zugkraft, benennt aber keinen konkreten Test dafür.',
  pullup: 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.',
  cooper: 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.',
  bike: 'Ausdauer ohne Laufbelastung, für Athleten mit Beschwerden an der unteren Extremität.',
  plank: 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.',
  ttest: 'Richtungswechsel über mehrere Ebenen, ergänzend zum Shuttle mit nur einer.',
  broad: 'Horizontale Schnellkraft neben der vertikalen des CMJ.',
  grip: 'Griffkraft als Bezugswert für alle griffgebundenen Aufgaben.',
} as const

export const DOCUMENT_COVERAGE: DisciplineCoverage[] = [
  // --- Kampfsport (MVP-Stufe 1 und 2) --------------------------------------
  {
    disciplineId: 'judo',
    documentTests: [
      t('Special Judo Fitness Test (SJFT)', 'special_judo_fitness_test'),
      t('Uchi-komi Fitness Test (UFT)', 'uchi_komi_fitness_test'),
      t('Judogi-Grip-Tests', 'grip_hang_time'),
      t('Pull-up/Chin-up-Varianten', 'pull_up_max_reps'),
      t('Sprint', 'sprint_10m'),
      t('Jump', 'countermovement_jump'),
      t('repeated throws', 'repeated_throws_30s'),
    ],
    additions: [
      add('grip_strength', 'Isolierte Griffkraft neben der Haltezeit — Maximum und Ausdauer trennen.'),
      add('deadlift_1rm', R.deadlift),
      add('shuttle_5_10_5', 'Richtungswechsel unter Last, im Griffkampf ständig gefordert.'),
      add('run_1_5_mile', R.cooper),
    ],
  },
  {
    disciplineId: 'wrestling',
    documentTests: [
      t('Special Wrestling Fitness Test (SWFT)', 'special_wrestling_fitness_test'),
      t('rope climbs', 'rope_climb'),
      t('dummy throws / repeated takedowns', 'repeated_throws_30s'),
      t('grip endurance', 'grip_hang_time'),
      t('sprint', 'sprint_10m'),
      t('jump', 'countermovement_jump'),
      t('wrestling-specific performance test', null, {
        kind: 'no_protocol',
        reason:
          'Das Dokument nennt keinen bestimmten Test, sondern die Kategorie. Der SWFT deckt sie ab; ein zweiter, unbestimmter Eintrag wäre eine leere Zeile.',
      }),
    ],
    additions: [
      add('grip_strength', R.grip),
      add('pull_up_max_reps', R.pullup),
      add('deadlift_1rm', R.deadlift),
      add('plank_hold', R.plank),
      add('shuttle_5_10_5', 'Richtungswechsel im Stand, für die Angriffsvorbereitung bestimmend.'),
      add('run_1_5_mile', R.cooper),
    ],
  },
  {
    disciplineId: 'bjj',
    documentTests: [
      t('JJAPT', 'jjapt'),
      t('grip strength', 'grip_strength'),
      t('chin-up', 'pull_up_max_reps'),
      t('specific grappling circuits', 'grappling_circuit_5min'),
      t('anaerobic jump/throw tests', 'countermovement_jump'),
      t('positional endurance', 'grip_hang_time'),
    ],
    additions: [
      add('plank_hold', R.plank),
      add('deadlift_1rm', R.deadlift),
      add('run_1_5_mile', R.cooper),
      add('cindy_20min_amrap', 'Kraftausdauer über zwanzig Minuten, nah an der Länge eines Rollens.'),
    ],
  },
  {
    disciplineId: 'boxing',
    documentTests: [
      t('1-min punch test', 'punch_test_60s'),
      t('3-min punch test', 'punch_test_180s'),
      t('rope skipping', 'rope_skipping_3min'),
      t('sprint', 'sprint_30m'),
      t('core endurance', 'plank_hold'),
      t('Boxing Conditioning/Fitness Test', 'punch_test_180s'),
      t('punch-force plate test', null, {
        kind: 'equipment',
        reason: 'Braucht eine Kraftmessplatte oder einen instrumentierten Sack. Ohne Gerät nicht messbar, geschätzte Schlagkraft wäre eine erfundene Zahl.',
      }),
    ],
    additions: [
      add('countermovement_jump', 'Schnellkraft der Beine — Grundlage der Schlagkette von unten.'),
      add('shuttle_5_10_5', 'Beinarbeit mit Richtungswechsel.'),
      add('run_1_5_mile', R.cooper),
      add('grip_strength', R.grip),
      add('pull_up_max_reps', R.pullup),
      add('assault_bike_10min_cal', R.bike),
    ],
  },
  {
    disciplineId: 'kickboxing',
    documentTests: [
      t('repeated kick test', 'kick_test_60s'),
      t('kick/punch interval test', 'punch_test_60s'),
      t('sprint', 'sprint_30m'),
      t('jump / lower-body power', 'countermovement_jump'),
      t('agility', 'shuttle_5_10_5'),
      t('fatigue circuits', 'fatigue_circuit_4x30s'),
    ],
    additions: [
      add('plank_hold', R.plank),
      add('standing_broad_jump', R.broad),
      add('run_1_5_mile', R.cooper),
      add('assault_bike_10min_cal', R.bike),
    ],
  },
  {
    disciplineId: 'taekwondo',
    documentTests: [
      t('Taekwondo anaerobic intermittent kick test', 'kick_test_60s'),
      t('sport-specific kick tests', 'kick_test_60s'),
      t('agility', 'shuttle_5_10_5'),
      t('sprint', 'sprint_10m'),
      t('jump', 'countermovement_jump'),
      t('repeated technical actions', 'fatigue_circuit_4x30s'),
    ],
    additions: [
      add('standing_broad_jump', R.broad),
      add('t_test_agility', R.ttest),
      add('repeated_jump_15s', 'Wiederholte Schnellkraft — der Unterschied zwischen einem und zwanzig Tritten.'),
      add('run_1_5_mile', R.cooper),
    ],
  },
  {
    disciplineId: 'mma',
    documentTests: [
      t('strength/power tests', 'deadlift_1rm'),
      t('sprint', 'sprint_30m'),
      t('isometric strength', 'plank_hold'),
      t('grip', 'grip_strength'),
      t('intermittent circuits', 'fatigue_circuit_4x30s'),
      t('MMA-specific anaerobic assessment', 'grappling_circuit_5min'),
    ],
    additions: [
      add('pull_up_max_reps', R.pullup),
      add('punch_test_60s', 'Schlagfrequenz unter Ermüdung — die Striking-Hälfte der Belastung.'),
      add('countermovement_jump', 'Schnellkraft als Grundlage von Takedown und Absprung.'),
      add('repeated_throws_30s', 'Wurfwiederholungen — die Grappling-Hälfte.'),
      add('run_1_5_mile', R.cooper),
      add('shuttle_5_10_5', 'Richtungswechsel im Stand, für Distanzarbeit und Angriffsvorbereitung bestimmend.'),
      add('assault_bike_10min_cal', R.bike),
    ],
  },
  {
    disciplineId: 'karate',
    documentTests: [
      t('speed-power tests', 'countermovement_jump'),
      t('agility', 'shuttle_5_10_5'),
      t('kick/punch combinations', 'punch_test_60s'),
      t('CMJ', 'countermovement_jump'),
      t('sprint', 'sprint_10m'),
      t('Karate-specific performance tests', 'fatigue_circuit_4x30s'),
    ],
    additions: [
      add('standing_broad_jump', R.broad),
      add('t_test_agility', R.ttest),
      add('kick_test_60s', 'Trittfrequenz unter Ermüdung, im Wettkampf mit hohem Anteil.'),
      add('run_1_5_mile', R.cooper),
    ],
  },
  {
    disciplineId: 'ju_jutsu',
    documentTests: [
      t('combined striking/grappling circuits', 'grappling_circuit_5min'),
      t('grip', 'grip_strength'),
      t('sprint', 'sprint_30m'),
      t('jump', 'countermovement_jump'),
      t('intermittent endurance', 'fatigue_circuit_4x30s'),
    ],
    additions: [
      add('repeated_throws_30s', 'Wurfwiederholungen als messbarer Teil der Mischbelastung.'),
      add('pull_up_max_reps', R.pullup),
      add('punch_test_60s', 'Schlaganteil der Mischbelastung.'),
      add('plank_hold', R.plank),
      add('run_1_5_mile', R.cooper),
      add('shuttle_5_10_5', 'Richtungswechsel im Stand, für Distanzarbeit und Angriffsvorbereitung bestimmend.'),
    ],
  },
  {
    disciplineId: 'pencak_silat',
    documentTests: [
      t('general field tests', 'shuttle_5_10_5'),
      t('fatigue index', 'fatigue_circuit_4x30s'),
      t('sprint', 'sprint_10m'),
      t('jump', 'countermovement_jump'),
      t('agility', 'shuttle_5_10_5'),
      t('specific combat circuits', null, {
        kind: 'no_protocol',
        reason:
          'Das Dokument hält für Pencak Silat ausdrücklich fest, dass spezifische Protokolle teils fehlen und derzeit allgemeine Feldtests benutzt werden. Ein erfundenes Protokoll wäre schlechter als die offene Lücke.',
      }),
    ],
    additions: [
      add('plank_hold', R.plank),
      add('standing_broad_jump', R.broad),
      add('kick_test_60s', 'Trittanteil der Technik, mit vorhandenem Protokoll messbar.'),
      add('run_1_5_mile', R.cooper),
    ],
  },
  {
    disciplineId: 'fencing',
    documentTests: [
      t('agility', 'shuttle_5_10_5'),
      t('repeated attacks', 'fatigue_circuit_4x30s'),
      t('jump', 'countermovement_jump'),
      t('sprint', 'sprint_10m'),
      t('specific fencing circuits', 'fatigue_circuit_4x30s'),
      t('lunge speed', null, {
        kind: 'equipment',
        reason: 'Braucht Lichtschranken oder Videoanalyse mit hoher Bildrate. Von Hand gestoppt läge der Messfehler über dem Unterschied zwischen Athleten.',
      }),
      t('reaction time', null, {
        kind: 'equipment',
        reason: 'Braucht eine Reizanlage mit Millisekundenauflösung. Ein Wert vom Telefon würde die Reaktionszeit des Geräts mitmessen.',
      }),
    ],
    additions: [
      add('t_test_agility', R.ttest),
      add('standing_broad_jump', R.broad),
      add('repeated_jump_15s', 'Wiederholte Explosivität — der Ausfall wird hunderte Male ausgeführt.'),
      add('run_1_5_mile', R.cooper),
      add('plank_hold', R.plank),
    ],
  },

  // --- Hybrid ---------------------------------------------------------------
  {
    disciplineId: 'hyrox',
    documentTests: [
      t('run splits', 'run_5k'),
      t('sled push', 'sled_push'),
      t('sled pull', 'sled_drag'),
      t('ski erg', 'ski_erg_1000m'),
      t('row erg', 'row_1000m'),
      t('wall ball test', 'wall_balls_75'),
      t('burpee broad jump', 'burpee_broad_jump_80m'),
      t('carry tests', 'farmers_carry'),
      t('repeated station simulation', 'fatigue_circuit_4x30s'),
    ],
    additions: [
      add('deadlift_1rm', 'Maximalkraft als Reserve hinter Schlitten und Carry — wer nah an seinem Maximum trägt, ermüdet schneller.'),
      add('run_1_5_mile', R.cooper),
      add('assault_bike_10min_cal', R.bike),
    ],
  },
  {
    disciplineId: 'functional_fitness',
    documentTests: [
      t('mixed modality circuits', 'cindy_20min_amrap'),
      t('engine tests', 'row_2000m'),
      t('strength endurance', 'fran'),
      t('repeated sprint ability', 'fatigue_circuit_4x30s'),
      t('erg tests', 'assault_bike_10min_cal'),
    ],
    additions: [
      add('back_squat_1rm', R.squat),
      add('clean_and_jerk_1rm', 'Olympische Hebung als Schnellkraftmass — in dieser Disziplin Wettkampfinhalt.'),
      add('pull_up_max_reps', R.pullup),
      add('grace', 'Kraftausdauer an der Langhantel mit fester Vorgabe, dadurch über Jahre vergleichbar.'),
      add('countermovement_jump', 'Schnellkraft als Grundlage der Hebungen.'),
      add('run_5k', 'Laufanteil, in Wettkämpfen regelmässig enthalten.'),
    ],
  },
  {
    disciplineId: 'ocr',
    documentTests: [
      t('run-under-load', 'loaded_march'),
      t('carry', 'farmers_carry'),
      t('climb', 'rope_climb'),
      t('crawl', 'crawl_30m'),
      t('grip', 'grip_strength'),
      t('sprint', 'sprint_30m'),
      t('obstacle simulation', 'obstacle_course_sim'),
    ],
    additions: [
      add('grip_hang_time', 'Griffausdauer — an Hangelhindernissen die begrenzende Grösse.'),
      add('pull_up_max_reps', R.pullup),
      add('run_5k', 'Laufanteil zwischen den Hindernissen.'),
      add('sled_push', 'Schiebearbeit, auf vielen Strecken enthalten.'),
      add('run_1_5_mile', R.cooper),
      add('plank_hold', R.plank),
    ],
  },

  // --- Laufen ---------------------------------------------------------------
  {
    disciplineId: 'run_5k_discipline',
    documentTests: [
      t('time trial', 'run_5k'),
      t('threshold test', 'threshold_run_30min'),
      t('VO2max test', 'cooper_12min'),
      t('lactate test', 'lactate_step_test'),
      t('interval test', 'fatigue_circuit_4x30s'),
      t('running economy test', null, {
        kind: 'equipment',
        reason: 'Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und braucht eine Spiroergometrie. Ohne Atemgasmessung gibt es sie nicht, nur Näherungen unter anderem Namen.',
      }),
    ],
    additions: [
      add('sprint_30m', 'Schnelligkeitsreserve — sie entscheidet den Zielsprint und begrenzt das Tempo an der Schwelle nach oben.'),
      add('countermovement_jump', 'Neuromuskuläre Frische; ein Einbruch zeigt Ermüdung vor der Zeitmessung.'),
      add('beep_test_20m', 'Feldalternative zum Cooper-Test bei begrenztem Platz.'),
    ],
  },
  {
    disciplineId: 'run_10k_discipline',
    documentTests: [
      t('time trial', 'run_10k'),
      t('threshold test', 'threshold_run_30min'),
      t('VO2max test', 'cooper_12min'),
      t('lactate test', 'lactate_step_test'),
      t('running economy test', null, {
        kind: 'equipment',
        reason:
          'Braucht Spiroergometrie: Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und ohne Atemgasmessung nicht bestimmbar.',
      }),
    ],
    additions: [
      add('run_5k', 'Kürzere Distanz als Kontrollpunkt und für die Hochrechnung.'),
      add('beep_test_20m', 'Feldalternative zum Cooper-Test.'),
    ],
  },
  {
    disciplineId: 'half_marathon',
    documentTests: [
      t('10-km-Prognose', 'run_10k'),
      t('threshold test', 'threshold_run_30min'),
      t('long-run pace test', 'run_5k'),
      t('economy test', null, {
        kind: 'equipment',
        reason:
          'Braucht Spiroergometrie: Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und ohne Atemgasmessung nicht bestimmbar.',
      }),
    ],
    additions: [
      add('cooper_12min', 'Aerobe Kapazität als Feldwert.'),
      add('plank_hold', 'Rumpfstabilität; sie hält die Laufhaltung über die zweite Hälfte.'),
    ],
  },
  {
    disciplineId: 'marathon',
    documentTests: [
      t('lactate threshold', 'lactate_step_test'),
      t('CPET/VO2max', 'cooper_12min'),
      t('body composition', null, {
        kind: 'elsewhere',
        reason:
          'Körperzusammensetzung wird als Körperwert erfasst und im Zeitverlauf geführt, nicht als Test durchgeführt. Sie steht im Profil unter den Körperwerten.',
      }),
      t('race simulation', 'threshold_run_30min'),
      t('running economy', null, {
        kind: 'equipment',
        reason:
          'Braucht Spiroergometrie: Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und ohne Atemgasmessung nicht bestimmbar.',
      }),
      t('pace variance metrics', null, {
        kind: 'buildable',
        reason: 'Braucht Rundenzeiten oder eine GPS-Datei je Wettkampf. Die App erfasst heute Ergebnisse, keine Verläufe innerhalb eines Tests.',
      }),
    ],
    additions: [
      add('run_10k', 'Kontrollpunkt und Grundlage der Hochrechnung.'),
      add('run_5k', 'Kurzer Kontrollpunkt zwischen den langen Einheiten.'),
      add('plank_hold', 'Rumpfstabilität über die Distanz.'),
    ],
  },
  {
    disciplineId: 'trail_running',
    documentTests: [
      t('uphill running test', 'uphill_run_test'),
      t('downhill running test', 'downhill_run_test'),
      t('terrain-specific time trial', 'run_10k'),
      t('fatigue resistance', 'threshold_run_30min'),
    ],
    additions: [
      add('plank_hold', 'Rumpfstabilität auf unebenem Untergrund.'),
      add('repeated_jump_15s', 'Reaktive Kraft — im Gefälle die begrenzende Eigenschaft.'),
      add('run_5k', 'Kontrollpunkt auf ebener Strecke, um Gelände- von Formänderung zu trennen.'),
      add('standing_broad_jump', R.broad),
      add('farmers_carry', 'Tragen der Pflichtausrüstung, auf langen Strecken vorgeschrieben.'),
    ],
  },
  {
    disciplineId: 'ultramarathon',
    documentTests: [
      t('submaximal efficiency', 'threshold_run_30min'),
      t('long-duration pacing', 'run_10k'),
      t('fatigue monitoring', 'hr_drift_test'),
      t('HR drift', 'hr_drift_test'),
      t('fuel management', null, {
        kind: 'no_protocol',
        reason:
          'Verpflegungsverträglichkeit ist eine Ernährungsfrage und keine Leistungsmessung. BASELINE gibt keine Ernährungsempfehlungen ab; ein Testergebnis dazu hätte hier keine Folge.',
      }),
    ],
    additions: [
      add('plank_hold', 'Rumpfstabilität über viele Stunden.'),
      add('run_5k', 'Kurzer Kontrollpunkt zwischen den langen Einheiten, ohne mehrere Tage Erholung zu kosten.'),
      add('lactate_step_test', 'Schwellenbestimmung im Labor, wenn verfügbar.'),
      add('farmers_carry', 'Tragen von Ausrüstung und Verpflegung.'),
    ],
  },

  // --- Radsport -------------------------------------------------------------
  {
    disciplineId: 'road_race',
    documentTests: [
      t('FTP/ramp test', 'ftp_20min'),
      t('20-min TT', 'ftp_20min'),
      t('ramp test', 'ramp_test_bike'),
      t('lactate threshold', 'lactate_step_test'),
      t('submax test', 'submax_efficiency_bike'),
      t('power profile', 'peak_power_5s'),
    ],
    additions: [
      add('assault_bike_10min_cal', 'Ausdauer auf dem Ergometer, wenn kein Leistungsmesser am Rad vorhanden ist.'),
      add('row_2000m', 'Ganzkörperausdauer im Winter, wenn draussen nicht gefahren wird.'),
    ],
  },
  {
    disciplineId: 'time_trial',
    documentTests: [
      t('TT-specific tests', 'ftp_20min'),
      t('power-duration tests', 'ramp_test_bike'),
      t('aero position tests', null, {
        kind: 'equipment',
        reason: 'Braucht Windkanal oder Leistungsmessung mit Geschwindigkeitsprofil auf gesperrter Strecke. Beides ist keine Feldmessung.',
      }),
    ],
    additions: [
      add('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als die Feldschätzung.'),
      add('peak_power_5s', 'Antrittsvermögen für Start und Wende.'),
      add('submax_efficiency_bike', 'Wirkungsgrad in Wettkampfposition, wiederholbar ohne Windkanal.'),
    ],
  },
  {
    disciplineId: 'track_cycling',
    documentTests: [
      t('peak power', 'peak_power_5s'),
      t('sprint tests', 'peak_power_5s'),
      t('repeated sprint', 'repeated_sprint_bike'),
      t('Wingate-style tests', 'wingate_30s'),
      t('lactate', 'lactate_step_test'),
    ],
    additions: [
      add('back_squat_1rm', R.squat),
      add('countermovement_jump', 'Schnellkraft der Beine, direkte Entsprechung zum Antritt.'),
      add('ftp_20min', 'Schwellenleistung für die Ausdauerdisziplinen auf der Bahn.'),
    ],
  },
  {
    disciplineId: 'mtb',
    documentTests: [
      t('climbing test', 'uphill_run_test'),
      t('repeated bursts', 'repeated_sprint_bike'),
      t('power-duration profile', 'ftp_20min'),
      t('technical terrain test', null, {
        kind: 'no_protocol',
        reason:
          'Eine Zeit auf einer technischen Strecke misst die Strecke mit. Ohne festgelegte, wiederholbare Strecke ist der Wert zwischen zwei Terminen nicht vergleichbar; die App kann keine Strecke vorgeben.',
      }),
    ],
    additions: [
      add('peak_power_5s', 'Antritte an Steilstücken und aus technischen Passagen heraus, im Gelände ständig gefordert.'),
      add('ramp_test_bike', 'Maximale aerobe Leistung als Deckelwert.'),
      add('plank_hold', 'Rumpfstabilität im Gelände.'),
      add('grip_strength', 'Griffkraft — auf ruppigen Abfahrten begrenzend.'),
      add('wingate_30s', 'Anaerobe Kapazität im Labor, wenn verfügbar.'),
    ],
  },
  {
    disciplineId: 'gravel',
    documentTests: [
      t('long TT', 'ftp_20min'),
      t('submax endurance', 'submax_efficiency_bike'),
      t('fatigue resistance', 'ramp_test_bike'),
      t('terrain variability', null, {
        kind: 'no_protocol',
        reason:
          'Wie beim Mountainbike: ohne festgelegte, wiederholbare Strecke misst der Wert das Gelände mit und nicht den Athleten.',
      }),
    ],
    additions: [
      add('peak_power_5s', 'Antritte an kurzen Rampen und aus Kurven heraus, auf Schotter häufiger als auf der Strasse.'),
      add('plank_hold', 'Rumpfstabilität über lange Distanzen im Gelände.'),
      add('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als jede Feldschätzung.'),
    ],
  },

  // --- Schwimmen ------------------------------------------------------------
  {
    disciplineId: 'freestyle',
    documentTests: [
      t('incremental swim test', 'swim_incremental'),
      t('race-pace test', 'swim_100m'),
      t('lactate step test', 'lactate_step_test'),
      t('stroke rate/length', 'swim_incremental'),
      t('split analysis', 'swim_400m'),
    ],
    additions: [
      add('pull_up_max_reps', R.pullup),
      add('grip_strength', 'Griffkraft — der Wasserfassung vorgelagert.'),
      add('plank_hold', 'Rumpfspannung, sie trägt die Wasserlage.'),
    ],
  },
  {
    disciplineId: 'backstroke',
    documentTests: [
      t('stroke-specific time trials', 'swim_100m_backstroke'),
      t('incremental test', 'swim_incremental'),
      t('stroke metrics', 'swim_incremental'),
    ],
    additions: [
      add('swim_100m', 'Freistilzeit als Bezugswert — der Unterschied zwischen den Lagen ist die eigentliche Aussage.'),
      add('swim_400m', 'Aerobe Grundlage, lagenunabhängig.'),
      add('plank_hold', 'Rumpfspannung, in Rückenlage besonders bestimmend.'),
      add('pull_up_max_reps', R.pullup),
    ],
  },
  {
    disciplineId: 'breaststroke',
    documentTests: [
      t('stroke-specific test', 'swim_100m_breaststroke'),
      t('lactate response', 'lactate_step_test'),
      t('stroke rate/efficiency', 'swim_incremental'),
    ],
    additions: [
      add('swim_100m', 'Freistilzeit als Bezugswert.'),
      add('swim_400m', 'Aerobe Grundlage im Wasser, unabhängig von der Lage.'),
      add('countermovement_jump', 'Beinschnellkraft — im Brustbeinschlag der Antrieb.'),
    ],
  },
  {
    disciplineId: 'butterfly',
    documentTests: [
      t('short-interval test', 'swim_100m_butterfly'),
      t('power/endurance test', 'swim_100m_butterfly'),
      t('race-pace set', 'swim_100m'),
    ],
    additions: [
      add('pull_up_max_reps', 'Zugkraft — im Delfin über beide Arme gleichzeitig gefordert.'),
      add('plank_hold', 'Rumpfspannung, sie trägt die Wellenbewegung.'),
      add('swim_400m', 'Aerobe Grundlage im Wasser, unabhängig von der Lage.'),
      add('countermovement_jump', 'Schnellkraft für Start und Wende.'),
    ],
  },
  {
    disciplineId: 'open_water',
    documentTests: [
      t('endurance trial', 'swim_400m'),
      t('pace control test', 'swim_incremental'),
      t('drafting simulation', null, {
        kind: 'no_protocol',
        reason:
          'Windschattenschwimmen braucht mindestens einen zweiten Schwimmer und misst dessen Tempo mit. Als Einzelmessung nicht wiederholbar.',
      }),
      t('feeding/temperature markers', null, {
        kind: 'no_protocol',
        reason:
          'Verpflegung und Wassertemperatur sind Rahmenbedingungen, keine Leistung. Sie gehören zu den Messbedingungen eines Ergebnisses und werden dort erfasst.',
      }),
    ],
    additions: [
      add('swim_100m', 'Kurze Bezugszeit für die Tempoverteilung.'),
      add('threshold_run_30min', 'Aerobe Grundlage ausserhalb des Wassers, wenn keine Bahn verfügbar ist.'),
    ],
  },

  // --- Triathlon ------------------------------------------------------------
  {
    disciplineId: 'triathlon_sprint',
    documentTests: [
      t('swim test', 'swim_400m'),
      t('bike test', 'ftp_20min'),
      t('run test', 'run_5k'),
      t('transition tests', 'brick_bike_run'),
      t('threshold tests', 'threshold_run_30min'),
    ],
    additions: [
      add('ramp_test_bike', 'Maximale aerobe Leistung auf dem Rad als oberer Deckelwert der Schwelle.'),
    ],
  },
  {
    disciplineId: 'triathlon_olympic',
    documentTests: [
      t('swim test', 'swim_400m'),
      t('bike test', 'ftp_20min'),
      t('run test', 'run_10k'),
      t('transition tests', 'brick_bike_run'),
      t('threshold tests', 'threshold_run_30min'),
    ],
    additions: [
      add('ramp_test_bike', 'Maximale aerobe Leistung auf dem Rad als oberer Deckelwert der Schwelle.'),
      add('swim_incremental', 'Schwellenpace im Wasser statt nur einer Zeit.'),
    ],
  },
  {
    disciplineId: 'triathlon_70_3',
    documentTests: [
      t('long aerobic tests', 'threshold_run_30min'),
      t('fatigue resistance', 'brick_bike_run'),
      t('pacing metrics', 'ftp_20min'),
      t('swim test', 'swim_400m'),
      t('run test', 'run_10k'),
      t('nutrition tolerance', null, {
        kind: 'no_protocol',
        reason:
          'Verpflegungsverträglichkeit ist eine Ernährungsfrage und keine Leistungsmessung; BASELINE gibt dazu keine Empfehlungen ab.',
      }),
    ],
    additions: [
      add('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als jede Feldschätzung.'),
      add('plank_hold', 'Rumpfstabilität über die Langdistanz.'),
    ],
  },
  {
    disciplineId: 'triathlon_ironman',
    documentTests: [
      t('long aerobic tests', 'threshold_run_30min'),
      t('fatigue resistance', 'brick_bike_run'),
      t('pacing metrics', 'ftp_20min'),
      t('swim test', 'swim_400m'),
      t('run test', 'run_10k'),
      t('nutrition tolerance', null, {
        kind: 'no_protocol',
        reason:
          'Verpflegungsverträglichkeit ist eine Ernährungsfrage und keine Leistungsmessung; BASELINE gibt dazu keine Empfehlungen ab.',
      }),
    ],
    additions: [
      add('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als jede Feldschätzung.'),
      add('plank_hold', 'Rumpfstabilität über die Langdistanz.'),
      add('farmers_carry', 'Tragen von Rad und Ausrüstung im Wettkampfalltag.'),
      add('hr_drift_test', 'Herzfrequenzdrift als Mass der Dauerbelastbarkeit.'),
    ],
  },

  // --- Tactical -------------------------------------------------------------
  {
    disciplineId: 'police',
    documentTests: [
      t('run tests', 'run_1_5_mile'),
      t('shuttle', 'shuttle_5_10_5'),
      t('drag/carry', 'sled_drag'),
      t('carry', 'farmers_carry'),
      t('stair climb', 'stair_climb'),
      t('grip', 'grip_strength'),
      t('power', 'countermovement_jump'),
      t('obstacle simulation', 'obstacle_course_sim'),
    ],
    additions: [
      add('deadlift_1rm', 'Maximalkraft als Reserve hinter Ziehen und Tragen.'),
      add('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, beim Überwinden von Hindernissen gefordert.'),
      add('plank_hold', R.plank),
    ],
  },
  {
    disciplineId: 'firefighter',
    documentTests: [
      t('load carriage', 'loaded_march'),
      t('stair climb', 'stair_climb'),
      t('drag/carry', 'sled_drag'),
      t('climb', 'rope_climb'),
      t('grip', 'grip_strength'),
      t('anaerobic endurance', 'fatigue_circuit_4x30s'),
    ],
    additions: [
      add('farmers_carry', 'Tragen von Gerät über kurze Wege — die häufigste Form der Last im Einsatz.'),
      add('deadlift_1rm', 'Maximalkraft als Reserve hinter Ziehen und Heben.'),
      add('run_1_5_mile', R.cooper),
      add('pull_up_max_reps', R.pullup),
      add('plank_hold', R.plank),
    ],
  },
  {
    disciplineId: 'military',
    documentTests: [
      t('loaded march', 'loaded_march'),
      t('run', 'run_1_5_mile'),
      t('sprint', 'sprint_30m'),
      t('carry', 'farmers_carry'),
      t('strength', 'deadlift_1rm'),
      t('power', 'countermovement_jump'),
      t('obstacle course', 'obstacle_course_sim'),
    ],
    additions: [
      add('pull_up_max_reps', R.pullup),
      add('sled_drag', 'Ziehen einer Last — Bergen von Personen.'),
      add('stair_climb', 'Steigarbeit unter Last — im Gebäude die häufigste Form der Dauerbelastung.'),
      add('plank_hold', R.plank),
    ],
  },
  {
    disciplineId: 'special_forces',
    documentTests: [
      t('high-load repeated effort tests', 'fatigue_circuit_4x30s'),
      t('obstacle circuits', 'obstacle_course_sim'),
      t('tactical endurance', 'loaded_march'),
    ],
    additions: [
      add('pull_up_max_reps', R.pullup),
      add('farmers_carry', 'Tragen von Ausrüstung unter Zeitdruck über kurze Wege.'),
      add('run_1_5_mile', R.cooper),
      add('deadlift_1rm', 'Maximalkraft als Reserve hinter jedem Heben und Tragen im Einsatz.'),
      add('shuttle_5_10_5', 'Richtungswechsel unter Last, auf engem Raum und mit Ausrüstung.'),
      add('sled_drag', 'Ziehen einer Last am Boden — das Bergen einer bewusstlosen Person.'),
      add('stair_climb', 'Steigarbeit unter Last — im Gebäude die häufigste Form der Dauerbelastung.'),
      add('grip_hang_time', 'Griffausdauer beim Klettern und Hangeln.'),
      add('sprint_30m', 'Antritt aus dem Stand über kurze Distanz, im Einsatz aus dem Ruhezustand heraus.'),
      add('crawl_30m', 'Fortbewegung in Deckung; belastet Schulter und Rumpf anders als jeder Lauftest.'),
    ],
  },
  {
    disciplineId: 'ems',
    documentTests: [
      t('carry', 'farmers_carry'),
      t('stair', 'stair_climb'),
      t('drag', 'sled_drag'),
      t('sprint', 'sprint_30m'),
      t('agility', 'shuttle_5_10_5'),
      t('endurance', 'run_1_5_mile'),
    ],
    additions: [
      add('deadlift_1rm', 'Heben vom Boden — die häufigste Belastung im Rettungsdienst.'),
      add('grip_strength', R.grip),
      add('plank_hold', R.plank),
    ],
  },
]

export const COVERAGE_BY_DISCIPLINE = new Map(
  DOCUMENT_COVERAGE.map((entry) => [entry.disciplineId, entry]),
)

export type Provenance = 'document' | 'addition' | 'unknown'

/**
 * Woher kommt die Zuordnung dieses Tests zu dieser Disziplin?
 *
 * `unknown` darf im Auslieferungsstand nicht vorkommen — der Bautest schlägt
 * dann fehl. Der Wert existiert trotzdem, weil ein Absturz an dieser Stelle
 * die schlechtere Antwort wäre als eine fehlende Kennzeichnung.
 */
export function provenanceOf(disciplineId: string, slug: string): Provenance {
  const entry = COVERAGE_BY_DISCIPLINE.get(disciplineId)
  if (!entry) return 'unknown'
  if (entry.documentTests.some((d) => d.catalogSlug === slug)) return 'document'
  if (entry.additions.some((a) => a.slug === slug)) return 'addition'
  return 'unknown'
}

/** Begründung einer Ergänzung; bei Dokumenttests null. */
export function additionReason(disciplineId: string, slug: string): string | null {
  return COVERAGE_BY_DISCIPLINE.get(disciplineId)?.additions.find((a) => a.slug === slug)?.reason ?? null
}

/** Alle offenen Lücken, für die Offenlegung in der Oberfläche. */
export function openGaps(): { disciplineId: string; label: string; kind: GapKind; reason: string }[] {
  return DOCUMENT_COVERAGE.flatMap((entry) =>
    entry.documentTests
      .filter((d) => d.catalogSlug === null && d.gap)
      .map((d) => ({
        disciplineId: entry.disciplineId,
        label: d.label,
        kind: d.gap!.kind,
        reason: d.gap!.reason,
      })),
  )
}
