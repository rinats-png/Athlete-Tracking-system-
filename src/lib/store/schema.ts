import { z } from 'zod'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import { FOCUS_HARD_LIMIT, FOCUS_NOTE_MAX } from '@/domain/trainingFocus'

/**
 * Schema, Validierung und Migration des lokalen Bestands.
 *
 * Drei Zusagen, die diese Datei einlöst:
 *
 * 1. KEIN DATENVERLUST. Ein unbekannter Schemastand führt nie dazu, dass der
 *    Bestand verworfen wird. Ältere Stände werden migriert, neuere bleiben
 *    unangetastet und werden gemeldet — die App ist dann nur zu alt.
 *
 * 2. KEIN STILLER SCHADEN. Beim Import wird jeder Datensatz geprüft. Was nicht
 *    passt, wird abgewiesen und benannt, statt halb übernommen zu werden.
 *
 * 3. NACHVOLLZIEHBARKEIT. Jede Migration ist eine benannte Funktion mit einem
 *    Testfall, nicht eine Reihe von Feldzuweisungen irgendwo im Ladepfad.
 */

export const CURRENT_SCHEMA_VERSION = 13

// --- Bausteine ---------------------------------------------------------------

const sexSchema = z.enum(['male', 'female', 'other'])
const localeSchema = z.enum(['de', 'en'])
const unitSystemSchema = z.enum(['metric', 'imperial'])

/** Endliche Zahl. Verhindert NaN und Infinity aus manipulierten Dateien. */
const finite = z.number().finite()

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Kein gültiger Zeitstempel' })

const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Erwartet YYYY-MM-DD')

/**
 * Leistungsniveau. Grob und ehrlich gestuft: feinere Abstufungen liessen sich
 * ohne belegte Referenzstichprobe nicht rechtfertigen, und eine Skala, die
 * genauer aussieht, als sie ist, führt zu falschen Vergleichen.
 */
export const performanceLevelSchema = z.enum([
  'recreational',
  'trained',
  'advanced',
  'competitive',
  'elite',
])

/** Dominante Seite — bei Sprung- und Wurftests für die Einordnung relevant. */
export const dominantSideSchema = z.enum(['left', 'right', 'ambidextrous'])

/**
 * Ziel des Nutzers (Konzept §3, Schritt 5). Eine Auswahl, kein Freitext:
 * das Ziel steuert die Gewichtung des nächsten Testvorschlags, und eine
 * Steuerung braucht Kennungen. Der Freitext `goal` bleibt daneben bestehen.
 */
export const goalKeySchema = z.enum([
  'general_performance',
  'competition',
  'diagnostics',
  'elite',
  'hyrox',
  'fitness',
  'orientation',
])
export const GOAL_KEYS = goalKeySchema.options

const profileSchema = z.object({
  firstName: z.string().max(80).default(''),
  lastName: z.string().max(80).nullable().default(null),
  sex: sexSchema.nullable().default(null),
  birthDate: dayString.nullable().default(null),
  heightCm: finite.min(80).max(260).nullable().default(null),
  restingHr: finite.min(20).max(120).nullable().default(null),
  maxHr: finite.min(100).max(240).nullable().default(null),
  locale: localeSchema.default('de'),
  unitSystem: unitSystemSchema.default('metric'),

  // --- Sportlicher Kontext (§6) ------------------------------------------
  // Alles freiwillig. Ein Pflichtfeld, das jemand nicht beantworten kann oder
  // will, führt zu erfundenen Angaben — und erfundener Kontext ist schlimmer
  // als fehlender, weil er unsichtbar in jede Einordnung einfliesst.
  sport: z.string().max(60).default(''),
  /** Position oder Disziplin innerhalb der Sportart. */
  position: z.string().max(60).default(''),
  /**
   * Ausgewählter Cluster und Disziplin aus `src/data/sportProfiles.ts`.
   *
   * Bewusst zusätzlich zu `sport`/`position` und nicht an deren Stelle: die
   * Freitextfelder bleiben die Auffanglösung für alles, was die Liste nicht
   * kennt, und bereits erfasste Angaben gehen nicht verloren. Beide Felder
   * sind Kennungen, keine Anzeigetexte — die Benennung kommt aus der Liste,
   * damit eine Umbenennung dort nicht am gespeicherten Bestand vorbeiläuft.
   */
  sportCategoryId: z.string().max(40).nullable().default(null),
  disciplineId: z.string().max(40).nullable().default(null),
  /**
   * Weitere Sportarten (Konzept §27). Die Hauptsportart bestimmt die
   * Darstellung; diese bleiben verfügbar, ohne die Übersicht zu überladen.
   */
  additionalDisciplineIds: z.array(z.string().max(40)).max(10).default([]),
  goalKey: goalKeySchema.nullable().default(null),
  /**
   * Wann das Onboarding abgeschlossen wurde. Null heisst: die App führt
   * beim nächsten Start durch die Schritte. Ein Zeitpunkt statt eines
   * Schalters, damit erkennbar bleibt, wie alt die Angaben sind.
   */
  onboardingCompletedAt: isoDate.nullable().default(null),
  /** Erinnerungen an fällige Tests (Konzept §24). Standard aus, weil eine
   *  Erinnerung, die niemand bestellt hat, eine Störung ist. */
  remindersEnabled: z.boolean().default(false),
  /** Wiederholungsabstand je Test in Tagen. Fehlt ein Test, gilt die Vorgabe. */
  reminderIntervalDays: z.record(z.string(), finite.min(1).max(730)).default({}),
  /**
   * Selbst gesetzte Zielwerte je Test, in der Haupteinheit des Tests.
   *
   * Bewusst der eigene Zielwert und keine fremde Marke: ein Fortschrittsbalken
   * auf «Elite» ist für die meisten unerreichbar und bei Jugendlichen ein
   * Anreiz, den diese App nicht setzt. Ein selbst gesetztes Ziel ist
   * erreichbar, und es ist eine Entscheidung des Athleten.
   */
  testGoals: z.record(z.string(), finite).default({}),
  /**
   * Wie weit der Einstieg gekommen ist.
   *
   * Ohne diesen Stand verlöre jemand, der den Einstieg auf Schritt sechs
   * unterbricht, alles — und liefe beim nächsten Öffnen wieder von vorn los.
   * Beim Abschluss wird zurückgesetzt, damit ein erneuter Durchlauf wieder
   * am Anfang beginnt.
   */
  onboardingStep: z.number().int().min(0).max(20).default(0),
  performanceLevel: performanceLevelSchema.nullable().default(null),
  /** Jahre systematischen Trainings — nicht das Lebensalter. */
  trainingAgeYears: finite.min(0).max(70).nullable().default(null),
  /** Einheiten je Woche. */
  sessionsPerWeek: finite.min(0).max(21).nullable().default(null),
  dominantSide: dominantSideSchema.nullable().default(null),
  /** Trainingsziel in eigenen Worten. */
  goal: z.string().max(300).default(''),
  /**
   * Einschränkungen in eigenen Worten. Ausdrücklich ein Freitextfeld und
   * keine Liste von Diagnosen: BASELINE bewertet keine Krankheitsbilder und
   * soll auch keine Gesundheitsdaten strukturiert sammeln (§50, §82).
   */
  constraints: z.string().max(300).default(''),
})

const biometricSchema = z.object({
  id: z.string().min(1),
  measuredOn: dayString,
  bodyWeightKg: finite.min(20).max(400).nullable().default(null),
  bodyFatPercent: finite.min(0).max(70).nullable().default(null),
  restingHr: finite.min(20).max(120).nullable().default(null),
  createdAt: isoDate,
})

/**
 * Wie aus mehreren Versuchen ein Wert wird.
 *
 * Bewusst explizit gespeichert statt implizit „bester Versuch“: bei einem
 * Maximalkrafttest zählt der beste, bei einem Sprint-Wiederholungstest der
 * Mittelwert, und wer beides vergleicht, ohne zu wissen welches, vergleicht
 * nichts.
 */
export const attemptSelectionSchema = z.enum(['best', 'worst', 'mean', 'median'])

/**
 * Bedingungen, unter denen gemessen wurde (§27).
 *
 * Alles freiwillig. Der Zweck ist nicht, mehr Daten zu sammeln, sondern
 * später erklären zu können, warum ein Wert aus der Reihe fällt: ein Sprint
 * auf nassem Rasen und einer auf der Bahn sind zwei verschiedene Messungen,
 * und ohne diese Angabe sieht der Unterschied wie Formverlust aus.
 *
 * Bewusst KEINE Gesundheitsdaten: Schlaf, Stress und Ermüdung stehen im
 * Readiness-Block als Selbsteinschätzung auf einer Skala, nicht als
 * medizinische Messwerte, und werden nirgends klinisch gedeutet (§82).
 */
const contextSchema = z.object({
  /** Untergrund, Halle/Bahn/Rasen — freier Text, weil die Vielfalt gross ist. */
  surface: z.string().max(60).default(''),
  /** Temperatur in Grad Celsius. */
  temperatureC: finite.min(-30).max(55).nullable().default(null),
  /** Tageszeit als HH:MM. */
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Erwartet HH:MM')
    .nullable()
    .default(null),
  /** Schuhwerk oder Ausrüstung, sofern relevant. */
  equipment: z.string().max(80).default(''),
  /** Trainingsstand: ausgeruht, im Aufbau, im Wettkampf … */
  trainingStatus: z.string().max(60).default(''),
})

/**
 * Selbsteinschätzung vor dem Test (§28).
 *
 * Skalen von 1 bis 10, ausdrücklich subjektiv. Der Readiness-Wert wird
 * daraus gebildet und nicht separat eingegeben — sonst stünden zwei Zahlen
 * nebeneinander, die sich widersprechen können.
 */
const readinessSchema = z.object({
  /** Schlafdauer in Minuten. */
  sleepMinutes: finite.min(0).max(1080).nullable().default(null),
  /** Schlafqualität 1–10. */
  sleepQuality: finite.min(1).max(10).nullable().default(null),
  fatigue: finite.min(1).max(10).nullable().default(null),
  stress: finite.min(1).max(10).nullable().default(null),
  soreness: finite.min(1).max(10).nullable().default(null),
  motivation: finite.min(1).max(10).nullable().default(null),
  recordedAt: isoDate,
})

/**
 * Obergrenze eines Belegbilds als Base64-Zeichen (~250 KB Bild). Passt
 * mehrfach in die Quote eines Browsers und reicht für ein lesbares Display.
 */
export const MAX_PHOTO_CHARS = 340_000

const resultSchema = z.object({
  id: z.string().min(1),
  testSlug: z.string().min(1),
  performedAt: isoDate,
  values: z.record(z.string(), finite),
  metrics: z.record(z.string(), finite),
  score: finite.nullable(),
  bodyWeightKg: finite.min(20).max(400).nullable().default(null),
  ageYears: finite.min(0).max(120).nullable().default(null),
  sex: sexSchema.nullable().default(null),
  assessmentId: z.string().nullable().default(null),
  /** Alle Versuche im Rohzustand. Leer bei Tests mit nur einem Durchgang. */
  attempts: z.array(z.record(z.string(), finite)).default([]),
  /** Nach welcher Regel `values` aus `attempts` entstanden ist. */
  attemptSelection: attemptSelectionSchema.nullable().default(null),
  /** Bedingungen der Messung. Leer, solange nichts erfasst wurde. */
  context: contextSchema.default(() => contextSchema.parse({})),
  notes: z.string().max(2000).optional(),
  /**
   * Ein Beleg zur Messung (§14): das Display der Zeitmessung, die Anzeige der
   * Waage, der Zettel mit den Runden. Er beantwortet später die Frage «woher
   * kommt diese Zahl», die keine Notiz beantwortet.
   *
   * Absichtlich eng gefasst: genau ein Bild je Ergebnis, verkleinert und als
   * JPEG abgelegt. Der Grenzwert ist die Speicherquote des Geräts — ein
   * ungeprüftes Kamerabild von 4 MB würde den gesamten Bestand
   * unspeicherbar machen, und der Verlust träfe alle Messwerte, nicht nur
   * das Bild.
   */
  photo: z
    .object({ dataUrl: z.string().min(1).max(MAX_PHOTO_CHARS), addedAt: isoDate })
    .nullable()
    .default(null),
  createdAt: isoDate,
})

const assessmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(120).nullable().default(null),
  batterySlug: z.string().nullable().default(null),
  performedOn: dayString,
  status: z.enum(['planned', 'in_progress', 'completed', 'abandoned']).default('in_progress'),
  plannedTestSlugs: z.array(z.string()).default([]),
  notes: z.string().max(4000).optional(),
  /** Selbsteinschätzung vor dem Termin. Null, wenn übersprungen. */
  readiness: readinessSchema.nullable().default(null),
  /**
   * Geplanter nächster Termin (§32).
   *
   * Gespeichert und nicht nur gerechnet: der Vorschlag der App ist eine
   * Voreinstellung, die Planung des Athleten ist eine Entscheidung. Wer den
   * Termin verschiebt, will das beim nächsten Öffnen wiederfinden und nicht
   * den neu gerechneten Vorschlag.
   */
  nextAssessmentOn: dayString.nullable().default(null),
  createdAt: isoDate,
  completedAt: isoDate.nullable().default(null),
})

/**
 * White-Label-Angaben für Berichte.
 *
 * Bewusst rein lokal und rein kosmetisch: ein Name, ein Logo, eine
 * Fusszeile. Nichts davon verlässt das Gerät, und nichts davon verändert
 * eine Zahl im Bericht — ein Bericht, dessen Werte vom Absender abhängen,
 * wäre wertlos.
 */
const brandingSchema = z.object({
  organisation: z.string().max(80).default(''),
  /** Data-URL. Begrenzt, weil sie mit dem Bestand gespeichert wird. */
  logoDataUrl: z.string().max(400_000).nullable().default(null),
  footer: z.string().max(200).default(''),
})

/**
 * Ein Athlet mit seinem gesamten Bestand.
 *
 * Im Einzelmodus gibt es genau einen; im Trainermodus mehrere. Beide Fälle
 * benutzen dieselbe Struktur — ein Trainer, der seinen eigenen Bestand in
 * einem anderen Format führen müsste als den seiner Kunden, hätte zwei
 * Wahrheiten zu pflegen.
 *
 * Kunden eines Trainers haben ausdrücklich kein Konto: `name` ist alles, was
 * BASELINE über sie speichert, solange der Trainer nichts weiter einträgt.
 */
/**
 * Nachweis über Änderungen am Bestand (§57).
 *
 * Bewusst schlank: Zeitpunkt, Art, betroffener Datensatz. KEINE Kopie der
 * geänderten Werte — ein Verlaufsspeicher mit allen alten Ständen wäre ein
 * zweiter Datenbestand mit denselben personenbezogenen Daten, den niemand
 * angefordert hat (§50). Der Nachweis beantwortet «wann ist was passiert»,
 * nicht «was stand vorher drin».
 *
 * Die Liste ist begrenzt: sie soll nachvollziehbar machen, was zuletzt
 * geschah, und nicht unbegrenzt mitwachsen.
 */
export const AUDIT_LIMIT = 200

const auditSchema = z.object({
  id: z.string().min(1),
  at: isoDate,
  action: z.enum(['created', 'edited', 'deleted', 'imported', 'exported']),
  /** Worauf sich die Änderung bezieht. */
  entity: z.enum(['result', 'assessment', 'biometric', 'profile', 'athlete', 'data', 'focus']),
  /** Kennung des betroffenen Datensatzes, sofern es eine gibt. */
  entityId: z.string().max(80).nullable().default(null),
  /** Kurze Bezeichnung für die Anzeige, z. B. der Testname. */
  label: z.string().max(120).default(''),
})


/**
 * Trainingsschwerpunkt (§74).
 *
 * WAS DAS IST — UND WAS NICHT
 *
 * Ein Schwerpunkt verbindet einen BEFUND aus der Diagnostik mit einer
 * PRIORITÄT und EINEM SATZ DES TRAINERS in seinen eigenen Worten, plus einem
 * Datum, an dem nachgemessen wird. Mehr nicht.
 *
 * Es ist ausdrücklich KEIN Trainingsplan: es gibt keine Übungen, keine Sätze,
 * keine Wiederholungen, keine Videos und keine Vorschläge der App. Was hier
 * nicht im Modell steht, kann später auch nicht hineinrutschen — deshalb ist
 * die Liste der Felder kurz und bleibt es.
 *
 * DIE APP SCHREIBT KEINEN INHALT. `note` ist leer, bis der Trainer etwas
 * hineinschreibt, und wird von der App nie ausgewertet. Damit kann an dieser
 * Stelle auch keine scheinwissenschaftliche Aussage entstehen (§81): die App
 * behauptet nichts, sie hält fest, was ein Mensch entschieden hat.
 *
 * DER KREIS SCHLIESST SICH ÜBER DIE NÄCHSTE MESSUNG, nicht über ein Häkchen.
 * Ob ein Schwerpunkt gewirkt hat, sagt die gemessene Veränderung mit ihrem
 * typischen Fehler — dieselbe Rechnung wie überall sonst. Ein Abhaken wäre
 * Selbstauskunft, und Punkte oder Serien wären künstliche Gamification.
 */
const trainingFocusSchema = z.object({
  id: z.string().min(1),
  /**
   * Profilachse, auf die sich der Befund bezieht. Kennung aus
   * `data/profileAxes.ts` — deckt allgemeine Fähigkeiten und
   * sportartspezifische Kennzahlachsen gleichermassen ab.
   */
  axisId: z.string().max(60),
  /** Die zugehörige der sechs allgemeinen Fähigkeiten, sofern es eine gibt. */
  dimension: z.enum(PERFORMANCE_DIMENSIONS).nullable().default(null),
  /**
   * Genau drei Stufen. Eine feinere Skala liesse sich nicht begründen, und
   * eine Liste mit zwölf Prioritäten hat keine.
   */
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Der Satz des Trainers. Kurz gehalten, damit er im Bericht ganz steht. */
  note: z.string().max(FOCUS_NOTE_MAX).default(''),
  /** Wann nachgemessen wird. Null heisst: noch nicht festgelegt. */
  reviewAt: dayString.nullable().default(null),
  createdAt: isoDate,
  /** Abgeschlossen. Der Eintrag bleibt erhalten — er ist Teil des Verlaufs. */
  closedAt: isoDate.nullable().default(null),
})

const athleteSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(120).default(''),
  profile: profileSchema,
  biometrics: z.array(biometricSchema).default([]),
  assessments: z.array(assessmentSchema).default([]),
  results: z.array(resultSchema).default([]),
  /** Archiviert: bleibt vollständig erhalten, taucht nur nicht mehr auf. */
  archived: z.boolean().default(false),
  /** Notizen des Trainers zu dieser Person (§74). */
  notes: z.string().max(4000).default(''),
  /**
   * Trainingsschwerpunkte. Bewusst neben `notes` und nicht an deren Stelle:
   * die Notiz ist unstrukturierter Freitext über den Menschen, ein
   * Schwerpunkt ist eine strukturierte Zuordnung zu einem gemessenen Bereich.
   */
  focuses: z.array(trainingFocusSchema).max(FOCUS_HARD_LIMIT).default([]),
  /** Änderungsnachweis, neueste zuerst. */
  audit: z.array(auditSchema).default([]),
  createdAt: isoDate,
})

export const storedDataSchema = z.object({
  version: z.literal(CURRENT_SCHEMA_VERSION),
  branding: brandingSchema.default(() => brandingSchema.parse({})),
  /**
   * Wann zuletzt exportiert wurde. Grundlage der Sicherungserinnerung — die
   * Daten liegen auf einem Gerät, und ein Gerät geht verloren. Der Export ist
   * die einzige Sicherung, die dem Nutzer selbst gehört (§32), deshalb steht
   * hier ein Datum und keine Zählung von Klicks.
   */
  lastExportAt: isoDate.nullable().default(null),
  /** 'solo' = nur der eigene Bestand, 'coach' = mehrere betreute Athleten. */
  role: z.enum(['solo', 'coach']).default('solo'),
  athletes: z.array(athleteSchema).min(1),
  activeAthleteId: z.string().min(1),
})

export type ValidatedData = z.infer<typeof storedDataSchema>
export type ValidatedAthlete = z.infer<typeof athleteSchema>

/**
 * Sicht auf einen einzelnen Athleten in der Form, die alle Auswertungen
 * erwarten. Damit bleibt jede Rechenfunktion athletenblind: sie bekommt einen
 * Bestand, nicht einen Bestand plus die Frage, wessen er ist.
 */
export interface AthleteView {
  branding: ValidatedBranding
  profile: ValidatedProfile
  biometrics: ValidatedBiometric[]
  assessments: ValidatedAssessment[]
  results: ValidatedResult[]
}
export type ValidatedResult = z.infer<typeof resultSchema>
export type ValidatedAssessment = z.infer<typeof assessmentSchema>
export type ValidatedBiometric = z.infer<typeof biometricSchema>
export type ValidatedProfile = z.infer<typeof profileSchema>
export type ValidatedBranding = z.infer<typeof brandingSchema>
export type AttemptSelection = z.infer<typeof attemptSelectionSchema>
export type ValidatedContext = z.infer<typeof contextSchema>
export type ValidatedReadiness = z.infer<typeof readinessSchema>
export type ValidatedAudit = z.infer<typeof auditSchema>
export type ValidatedFocus = z.infer<typeof trainingFocusSchema>
export type GoalKey = z.infer<typeof goalKeySchema>

// --- Migrationen -------------------------------------------------------------

type Migration = { from: number; to: number; describe: string; run: (data: any) => any }

/**
 * Migrationskette. Jeder Schritt hebt genau eine Version an; `migrate` läuft
 * sie der Reihe nach durch. Neue Schritte werden hinten angehängt, alte nie
 * verändert — sonst brechen Dateien, die ein Nutzer vor Monaten exportiert hat.
 */
export const MIGRATIONS: Migration[] = [
  {
    from: 1,
    to: 2,
    describe: 'Assessments eingeführt; Ergebnisse können einem Termin zugeordnet werden',
    run: (data) => ({
      ...data,
      version: 2,
      assessments: [],
      results: (data.results ?? []).map((r: any) => ({ ...r, assessmentId: null })),
    }),
  },
  {
    from: 2,
    to: 3,
    describe: 'Mehrfachversuche je Test werden im Rohzustand mitgespeichert',
    run: (data) => ({
      ...data,
      version: 3,
      results: (data.results ?? []).map((r: any) => ({
        ...r,
        attempts: [],
        attemptSelection: null,
      })),
    }),
  },
  {
    from: 3,
    to: 4,
    describe: 'Berichte können mit eigenem Namen und Logo versehen werden',
    run: (data) => ({
      ...data,
      version: 4,
      branding: { organisation: '', logoDataUrl: null, footer: '' },
    }),
  },
  {
    from: 4,
    to: 5,
    describe: 'Mehrere Athleten je Gerät; der bisherige Bestand wird der erste',
    run: (data) => {
      // Der vorhandene Bestand wird unverändert zum ersten Athleten. Der Name
      // bleibt leer statt geraten — die UI zeigt dann den Vornamen aus dem
      // Profil oder eine neutrale Bezeichnung.
      const id = 'athlete-1'
      return {
        version: 5,
        branding: data.branding ?? { organisation: '', logoDataUrl: null, footer: '' },
        role: 'solo',
        activeAthleteId: id,
        athletes: [
          {
            id,
            name: '',
            profile: data.profile ?? {},
            biometrics: data.biometrics ?? [],
            assessments: data.assessments ?? [],
            results: data.results ?? [],
            archived: false,
            createdAt: new Date().toISOString(),
          },
        ],
      }
    },
  },
  {
    from: 5,
    to: 6,
    describe: 'Athletenprofil um sportlichen Kontext erweitert',
    run: (data) => ({
      ...data,
      version: 6,
      athletes: (data.athletes ?? []).map((athlete: any) => ({
        ...athlete,
        profile: {
          ...athlete.profile,
          // Leer statt geraten: aus Alter und Geschlecht lässt sich weder
          // Sportart noch Leistungsniveau ableiten.
          sport: '',
          position: '',
          performanceLevel: null,
          trainingAgeYears: null,
          sessionsPerWeek: null,
          dominantSide: null,
          goal: '',
          constraints: '',
        },
      })),
    }),
  },
  {
    from: 6,
    to: 7,
    describe: 'Messbedingungen je Ergebnis und Selbsteinschätzung je Termin',
    run: (data) => ({
      ...data,
      version: 7,
      athletes: (data.athletes ?? []).map((athlete: any) => ({
        ...athlete,
        results: (athlete.results ?? []).map((r: any) => ({
          ...r,
          // Leer, nicht geraten: rückwirkend ist nicht bekannt, unter welchen
          // Bedingungen gemessen wurde.
          context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
        })),
        assessments: (athlete.assessments ?? []).map((a: any) => ({ ...a, readiness: null })),
      })),
    }),
  },
  {
    from: 7,
    to: 8,
    describe: 'Der nächste Termin kann festgelegt statt nur vorgeschlagen werden',
    run: (data) => ({
      ...data,
      version: 8,
      athletes: (data.athletes ?? []).map((athlete: any) => ({
        ...athlete,
        assessments: (athlete.assessments ?? []).map((a: any) => ({
          ...a,
          // Leer: bisher hat niemand einen Termin festgelegt, und der
          // gerechnete Vorschlag ist keine Entscheidung.
          nextAssessmentOn: null,
        })),
      })),
    }),
  },
  {
    from: 8,
    to: 9,
    describe: 'Notizen je Athlet und Änderungsnachweis',
    run: (data) => ({
      ...data,
      version: 9,
      athletes: (data.athletes ?? []).map((athlete: any) => ({
        ...athlete,
        notes: '',
        // Leer: rückwirkend lässt sich nicht rekonstruieren, wann was
        // geändert wurde, und ein erfundener Nachweis wäre wertlos.
        audit: [],
      })),
    }),
  },
  {
    from: 9,
    to: 10,
    describe: 'Cluster und Disziplin als Auswahl statt nur als Freitext',
    run: (data) => ({
      ...data,
      version: 10,
      athletes: (data.athletes ?? []).map((athlete: any) => ({
        ...athlete,
        profile: {
          ...athlete.profile,
          // Leer statt geraten: aus einem Freitext wie «Kampfsport» eine
          // Disziplin abzuleiten hiesse, eine Angabe zu erfinden, die
          // anschliessend die Testempfehlung steuert. Der Freitext bleibt
          // erhalten und steht in der Oberfläche weiterhin da.
          sportCategoryId: null,
          disciplineId: null,
        },
      })),
    }),
  },
  {
    from: 10,
    to: 11,
    describe: 'Weitere Sportarten, Ziel, Onboarding-Stand und Erinnerungen im Profil',
    run: (data) => ({
      ...data,
      version: 11,
      athletes: (data.athletes ?? []).map((athlete: any) => ({
        ...athlete,
        profile: {
          ...athlete.profile,
          additionalDisciplineIds: [],
          goalKey: null,
          // Wer schon eine Sportart gewählt oder gemessen hat, wird nicht
          // noch einmal durch den Einstieg geführt: der Bestand IST der
          // Nachweis, dass die App eingerichtet war.
          onboardingCompletedAt:
            athlete.profile?.disciplineId || (athlete.results ?? []).length > 0
              ? (athlete.createdAt ?? new Date().toISOString())
              : null,
          remindersEnabled: false,
          reminderIntervalDays: {},
          testGoals: {},
          onboardingStep: 0,
        },
      })),
    }),
  },
  {
    from: 11,
    to: 12,
    describe: 'Zeitpunkt des letzten Exports für die Sicherungserinnerung',
    run: (data) => ({
      ...data,
      version: 12,
      // Kein erfundenes Datum: wer noch nie exportiert hat, wird beim
      // nächsten Mal erinnert, und das ist richtig so.
      lastExportAt: null,
    }),
  },
  {
    from: 12,
    to: 13,
    describe: 'Trainingsschwerpunkte je Athlet',
    run: (data) => ({
      ...data,
      version: 13,
      athletes: (data.athletes ?? []).map((athlete: any) => ({
        ...athlete,
        // Leer, nicht erfunden: ein Schwerpunkt ist die Entscheidung eines
        // Trainers, und die kann eine Migration nicht nachholen.
        focuses: [],
      })),
    }),
  },
]

export interface LoadReport {
  /** Wurde der Bestand von einer älteren Version angehoben? */
  migratedFrom: number | null
  /** Der Bestand stammt aus einer neueren App-Version. */
  fromNewerVersion: boolean
  /** Abgewiesene Datensätze mit Begründung. */
  rejected: { kind: string; id: string; reason: string }[]
}

export interface ParseOutcome {
  data: ValidatedData | null
  report: LoadReport
}

const emptyReport = (): LoadReport => ({ migratedFrom: null, fromNewerVersion: false, rejected: [] })

export function emptyAthlete(id = 'athlete-1'): ValidatedAthlete {
  return {
    id,
    name: '',
    profile: profileSchema.parse({}),
    biometrics: [],
    assessments: [],
    results: [],
    archived: false,
    notes: '',
    focuses: [],
    audit: [],
    createdAt: new Date().toISOString(),
  }
}

export function emptyData(): ValidatedData {
  const athlete = emptyAthlete()
  return {
    version: CURRENT_SCHEMA_VERSION,
    branding: brandingSchema.parse({}),
    lastExportAt: null,
    role: 'solo',
    athletes: [athlete],
    activeAthleteId: athlete.id,
  }
}

/**
 * Rohdaten in einen gültigen Bestand überführen.
 *
 * Einzelne beschädigte Datensätze führen nicht zum Verwerfen des Ganzen: was
 * gültig ist, wird übernommen, der Rest wird im Bericht benannt. Ein Nutzer,
 * dem ein Eintrag kaputtgeht, verliert nicht seine ganze Historie.
 */
export function parseStoredData(raw: unknown): ParseOutcome {
  const report = emptyReport()
  if (!raw || typeof raw !== 'object') return { data: null, report }

  let working = raw as any
  const version = Number(working.version)

  if (!Number.isFinite(version) || version < 1) return { data: null, report }

  if (version > CURRENT_SCHEMA_VERSION) {
    // Nichts anfassen: eine neuere App hat das geschrieben, wir würden beim
    // Speichern Felder verlieren, die wir nicht kennen.
    report.fromNewerVersion = true
    return { data: null, report }
  }

  if (version < CURRENT_SCHEMA_VERSION) {
    report.migratedFrom = version
    for (const migration of MIGRATIONS) {
      if (working.version === migration.from) working = migration.run(working)
    }
  }

  // Erst das Ganze versuchen; scheitert es, Datensatz für Datensatz retten.
  const whole = storedDataSchema.safeParse(working)
  if (whole.success) return { data: whole.data, report }

  const branding = brandingSchema.safeParse(working.branding ?? {})

  const collect = <T>(
    kind: 'biometric' | 'assessment' | 'result',
    list: unknown,
    schema: z.ZodType<T>,
    athleteId: string,
  ): T[] => {
    const target: T[] = []
    if (!Array.isArray(list)) return target
    for (const entry of list) {
      const parsed = schema.safeParse(entry)
      if (parsed.success) target.push(parsed.data)
      else
        report.rejected.push({
          kind,
          id: `${athleteId}/${String((entry as any)?.id ?? '?')}`,
          reason: firstIssue(parsed.error),
        })
    }
    return target
  }

  // Athletenweise retten. Ein beschädigter Datensatz bei einem Kunden darf
  // weder dessen übrige Historie noch die der anderen Kunden kosten.
  const rawAthletes: unknown[] = Array.isArray(working.athletes) ? working.athletes : []
  const athletes: ValidatedAthlete[] = []

  for (const [index, raw] of rawAthletes.entries()) {
    const entry = (raw ?? {}) as any
    const id = typeof entry.id === 'string' && entry.id ? entry.id : `athlete-${index + 1}`
    const profile = profileSchema.safeParse(entry.profile ?? {})
    if (!profile.success) {
      report.rejected.push({ kind: 'profile', id, reason: firstIssue(profile.error) })
    }
    // Über das Schema geparst statt zusammengesetzt: nur so greifen die
    // Vorgabewerte der einzelnen Felder, und der Typ ist wirklich erfüllt.
    athletes.push(
      athleteSchema.parse({
        id,
        name: typeof entry.name === 'string' ? entry.name.slice(0, 120) : '',
        profile: profile.success ? profile.data : profileSchema.parse({}),
        biometrics: collect('biometric', entry.biometrics, biometricSchema, id),
        assessments: collect('assessment', entry.assessments, assessmentSchema, id),
        results: collect('result', entry.results, resultSchema, id),
        archived: entry.archived === true,
        createdAt:
          typeof entry.createdAt === 'string' && !Number.isNaN(Date.parse(entry.createdAt))
            ? entry.createdAt
            : new Date().toISOString(),
      }),
    )
  }

  // Ein Bestand ohne Athleten wäre nicht darstellbar — lieber ein leerer
  // Athlet als eine App, die auf einer weissen Seite stehen bleibt.
  if (athletes.length === 0) athletes.push(emptyAthlete())

  const activeId =
    typeof working.activeAthleteId === 'string' &&
    athletes.some((a) => a.id === working.activeAthleteId)
      ? working.activeAthleteId
      : athletes[0].id

  const salvaged: ValidatedData = {
    version: CURRENT_SCHEMA_VERSION,
    branding: branding.success ? branding.data : brandingSchema.parse({}),
    lastExportAt:
      typeof working.lastExportAt === 'string' && !Number.isNaN(Date.parse(working.lastExportAt))
        ? working.lastExportAt
        : null,
    role: working.role === 'coach' ? 'coach' : 'solo',
    athletes,
    activeAthleteId: activeId,
  }

  return { data: salvaged, report }
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  return issue ? `${issue.path.join('.') || '(Wurzel)'}: ${issue.message}` : 'unbekannt'
}
