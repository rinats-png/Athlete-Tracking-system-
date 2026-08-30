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

export const CURRENT_SCHEMA_VERSION = 2

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
})

const biometricSchema = z.object({
  id: z.string().min(1),
  measuredOn: dayString,
  bodyWeightKg: finite.min(20).max(400).nullable().default(null),
  bodyFatPercent: finite.min(0).max(70).nullable().default(null),
  restingHr: finite.min(20).max(120).nullable().default(null),
  createdAt: isoDate,
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
  createdAt: isoDate,
  completedAt: isoDate.nullable().default(null),
})

export const storedDataSchema = z.object({
  version: z.literal(CURRENT_SCHEMA_VERSION),
  profile: profileSchema,
  biometrics: z.array(biometricSchema),
  assessments: z.array(assessmentSchema),
  results: z.array(resultSchema),
})

export type ValidatedData = z.infer<typeof storedDataSchema>
export type ValidatedResult = z.infer<typeof resultSchema>
export type ValidatedAssessment = z.infer<typeof assessmentSchema>
export type ValidatedBiometric = z.infer<typeof biometricSchema>
export type ValidatedProfile = z.infer<typeof profileSchema>

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

export function emptyData(): ValidatedData {
  return {
    version: CURRENT_SCHEMA_VERSION,
    profile: profileSchema.parse({}),
    biometrics: [],
    assessments: [],
    results: [],
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

  const profile = profileSchema.safeParse(working.profile ?? {})
  const salvaged: ValidatedData = {
    version: CURRENT_SCHEMA_VERSION,
    profile: profile.success ? profile.data : profileSchema.parse({}),
    biometrics: [],
    assessments: [],
    results: [],
  }
  if (!profile.success) {
    report.rejected.push({ kind: 'profile', id: '-', reason: firstIssue(profile.error) })
  }

  const collect = <T>(
    kind: 'biometric' | 'assessment' | 'result',
    list: unknown,
    schema: z.ZodType<T>,
    target: T[],
  ) => {
    if (!Array.isArray(list)) return
    for (const entry of list) {
      const parsed = schema.safeParse(entry)
      if (parsed.success) target.push(parsed.data)
      else
        report.rejected.push({
          kind,
          id: String((entry as any)?.id ?? '?'),
          reason: firstIssue(parsed.error),
        })
    }
  }

  collect('biometric', working.biometrics, biometricSchema, salvaged.biometrics)
  collect('assessment', working.assessments, assessmentSchema, salvaged.assessments)
  collect('result', working.results, resultSchema, salvaged.results)

  return { data: salvaged, report }
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  return issue ? `${issue.path.join('.') || '(Wurzel)'}: ${issue.message}` : 'unbekannt'
}
