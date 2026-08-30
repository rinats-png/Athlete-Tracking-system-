import { z } from 'zod'

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

export const CURRENT_SCHEMA_VERSION = 8

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
const athleteSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(120).default(''),
  profile: profileSchema,
  biometrics: z.array(biometricSchema).default([]),
  assessments: z.array(assessmentSchema).default([]),
  results: z.array(resultSchema).default([]),
  /** Archiviert: bleibt vollständig erhalten, taucht nur nicht mehr auf. */
  archived: z.boolean().default(false),
  createdAt: isoDate,
})

export const storedDataSchema = z.object({
  version: z.literal(CURRENT_SCHEMA_VERSION),
  branding: brandingSchema.default(() => brandingSchema.parse({})),
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
    createdAt: new Date().toISOString(),
  }
}

export function emptyData(): ValidatedData {
  const athlete = emptyAthlete()
  return {
    version: CURRENT_SCHEMA_VERSION,
    branding: brandingSchema.parse({}),
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
