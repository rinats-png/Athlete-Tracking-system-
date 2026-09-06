import { deriveMetrics, primaryValue } from '@/lib/metrics/derive'
import { getTest } from '@/data/testCatalog'
import { CURRENT_SCHEMA_VERSION, newId } from '@/lib/store/localStore'
import type {
  AthleteData,
  StoredAssessment,
  StoredBiometric,
  StoredData,
  StoredFocus,
  StoredResult,
} from '@/lib/store/localStore'

/**
 * Demodatensatz.
 *
 * Kein Zufallsrauschen, sondern ein durchgerechneter Fall: derselbe Athlet
 * über drei Diagnostiktermine, dazwischen ein Kraftblock und ein
 * Ausdauerblock. Dadurch zeigt das Radar in beiden Modi eine sinnvolle Form —
 * im Bestleistungsmodus den Formstand, im Referenzmodus Stärken und Schwächen.
 *
 * WARUM JUDO: der Demobestand lief vorher auf Functional Fitness — einer
 * Disziplin, für die KEIN einziger ihrer Tests eine publizierte Referenz
 * trägt. Wer die Demo öffnete, sah die App also von ihrer schwächsten Seite:
 * ein Profil ohne jede Einordnung. Judo ist die am besten belegte Disziplin
 * im Katalog; sieben ihrer Tests haben eine Referenz mit Quelle. Damit zeigt
 * die Demo, was die App kann — und an Kreuzheben und Richtungswechsel
 * zugleich ehrlich, wo sie nichts sagen kann.
 *
 * Erzeugt wird derselbe Datensatz, den auch der Gastmodus schreibt: die
 * Metriken laufen durch dieselbe Ableitung. Der Demomodus ist damit kein
 * Sonderweg, sondern ein normaler, bearbeitbarer Bestand.
 */


/**
 * Trainingsschwerpunkte des Demobestands.
 *
 * Angelegt nach dem zweiten Termin (Januar 2026), damit der dritte Termin
 * (Juni 2026) sie tatsächlich beantwortet — genau so soll der Kreis in echt
 * laufen: Befund, Anweisung, Nachmessung.
 *
 * Die Sätze stammen von einem Trainer und nicht von der App. Sie stehen hier
 * als Beispieltexte, damit der Bericht mit Demodaten zeigt, wie ein
 * ausgefüllter Schwerpunkt aussieht — sie sind keine Empfehlung an irgendwen.
 */
const DEMO_FOCUSES: StoredFocus[] = [
  {
    id: 'demo-focus-1',
    axisId: 'fight_endurance',
    dimension: 'endurance',
    priority: 1,
    note: 'Grundlage steht hinter der Kraft zurück, der Cooper ist gefallen. Zwei ruhige Einheiten pro Woche, Wettkampfhärte erst ab April.',
    reviewAt: '2026-06-14',
    createdAt: '2026-01-20T09:00:00.000Z',
    closedAt: null,
  },
  {
    id: 'demo-focus-2',
    axisId: 'relative_strength',
    dimension: 'relative_strength',
    priority: 2,
    note: 'Absolutkraft ist gestiegen, das Körpergewicht mit. Gewicht halten, Last weiter aufbauen.',
    reviewAt: '2026-06-14',
    createdAt: '2026-01-20T09:05:00.000Z',
    closedAt: null,
  },
  {
    id: 'demo-focus-3',
    axisId: 'grip',
    dimension: 'strength_endurance',
    priority: 3,
    note: 'Griff hält im Training, in der fünften Minute nicht mehr. Am Anzug hängen statt an der Stange, zweimal pro Woche.',
    reviewAt: '2026-09-30',
    createdAt: '2026-01-20T09:10:00.000Z',
    closedAt: null,
  },
]

interface Session {
  date: string
  bodyWeightKg: number
  restingHr: number
  values: Record<string, Record<string, number>>
}

const SESSIONS: Session[] = [
  {
    date: '2025-08-20',
    bodyWeightKg: 79.4,
    restingHr: 52,
    values: {
      special_judo_fitness_test: { throwsA: 5, throwsB: 9, throwsC: 9, hrEnd: 184, hrAfter1min: 152 },
      grip_hang_time: { durationSeconds: 62, rpe: 9 },
      gi_grip_hang: { durationSeconds: 44, rpe: 9 },
      pull_up_max_reps: { reps: 14, rpe: 10 },
      grip_strength: { gripKg: 52.5 },
      countermovement_jump: { jumpHeightCm: 39.4, rpe: 7 },
      sprint_10m: { durationSeconds: 1.84, rpe: 8 },
      deadlift_1rm: { loadKg: 175, reps: 1, rpe: 9 },
      cooper_12min: { distanceM: 2860, maxHeartRate: 188, rpe: 9 },
      shuttle_5_10_5: { durationSeconds: 4.92, rpe: 8 },
    },
  },
  {
    date: '2026-01-18',
    bodyWeightKg: 82.1,
    restingHr: 50,
    values: {
      special_judo_fitness_test: { throwsA: 6, throwsB: 10, throwsC: 9, hrEnd: 182, hrAfter1min: 150 },
      grip_hang_time: { durationSeconds: 71, rpe: 9 },
      gi_grip_hang: { durationSeconds: 52, rpe: 9 },
      pull_up_max_reps: { reps: 16, rpe: 10 },
      grip_strength: { gripKg: 57.0 },
      countermovement_jump: { jumpHeightCm: 41.2, rpe: 7 },
      sprint_10m: { durationSeconds: 1.81, rpe: 8 },
      deadlift_1rm: { loadKg: 200, reps: 1, rpe: 9.5 },
      // Der Kraftblock hat Masse gekostet: die Ausdauer faellt, obwohl nichts
      // schiefgelaufen ist. Genau dafuer gibt es die Schwerpunkte weiter oben.
      cooper_12min: { distanceM: 2740, maxHeartRate: 189, rpe: 9.5 },
      shuttle_5_10_5: { durationSeconds: 4.96, rpe: 8 },
    },
  },
  {
    date: '2026-06-14',
    bodyWeightKg: 80.3,
    restingHr: 48,
    values: {
      special_judo_fitness_test: { throwsA: 6, throwsB: 11, throwsC: 10, hrEnd: 178, hrAfter1min: 141 },
      grip_hang_time: { durationSeconds: 78, rpe: 9 },
      gi_grip_hang: { durationSeconds: 58, rpe: 9 },
      pull_up_max_reps: { reps: 18, rpe: 10 },
      grip_strength: { gripKg: 58.5 },
      countermovement_jump: { jumpHeightCm: 42.0, rpe: 7 },
      sprint_10m: { durationSeconds: 1.78, rpe: 8 },
      deadlift_1rm: { loadKg: 197.5, reps: 1, rpe: 9 },
      cooper_12min: { distanceM: 3010, maxHeartRate: 187, rpe: 9.5 },
      shuttle_5_10_5: { durationSeconds: 4.83, rpe: 8 },
    },
  },
]

export function buildDemoData(): StoredData {
  const profile: AthleteData['profile'] = {
    firstName: 'Alex',
    lastName: 'Roth',
    sex: 'male',
    birthDate: '1994-03-11',
    heightCm: 181,
    restingHr: 48,
    maxHr: 189,
    locale: 'de',
    unitSystem: 'metric',
    sport: 'Judo',
    position: '',
    sportCategoryId: 'combat',
    disciplineId: 'judo',
    performanceLevel: 'advanced',
    trainingAgeYears: 9,
    sessionsPerWeek: 5,
    dominantSide: 'right',
    goal: 'Griffkraft und Kampfausdauer halten, Grundlage aufbauen',
    constraints: '',
    // Der Demobestand zeigt, wie zwei Sportarten nebeneinander aussehen.
    additionalDisciplineIds: ['bjj'],
    goalKey: 'general_performance',
    onboardingCompletedAt: '2025-01-05T09:00:00.000Z',
    remindersEnabled: true,
    reminderIntervalDays: {},
    testGoals: {},
    onboardingStep: 0,
  }

  const biometrics: StoredBiometric[] = SESSIONS.map((s) => ({
    id: newId(),
    measuredOn: s.date,
    bodyWeightKg: s.bodyWeightKg,
    bodyFatPercent: null,
    restingHr: s.restingHr,
    createdAt: new Date(`${s.date}T08:00:00Z`).toISOString(),
  }))

  const age = (iso: string) => {
    const born = new Date(profile.birthDate as string)
    const at = new Date(iso)
    let years = at.getFullYear() - born.getFullYear()
    const m = at.getMonth() - born.getMonth()
    if (m < 0 || (m === 0 && at.getDate() < born.getDate())) years -= 1
    return years
  }

  const assessments: StoredAssessment[] = []
  const results: StoredResult[] = []

  for (const session of SESSIONS) {
    // Jeder Termin ist ein vollständiges Assessment — genau die Einheit, aus
    // der später ein Report entsteht.
    const assessment: StoredAssessment = {
      id: newId(),
      title: null,
      batterySlug: 'judo_performance_check',
      performedOn: session.date,
      status: 'completed',
      plannedTestSlugs: Object.keys(session.values),
      createdAt: new Date(`${session.date}T08:00:00Z`).toISOString(),
      readiness: null,
      nextAssessmentOn: null,
      completedAt: new Date(`${session.date}T19:00:00Z`).toISOString(),
    }
    assessments.push(assessment)

    // Die Tests eines Termins liegen über wenige Tage verteilt, wie in echt.
    let dayOffset = 0
    for (const [slug, values] of Object.entries(session.values)) {
      const test = getTest(slug)
      if (!test) continue
      const performedAt = new Date(`${session.date}T17:00:00Z`)
      performedAt.setDate(performedAt.getDate() - dayOffset)
      dayOffset = (dayOffset + 1) % 4

      const iso = performedAt.toISOString()
      const ctx = { bodyWeightKg: session.bodyWeightKg, ageYears: age(iso), sex: profile.sex }
      const metrics = deriveMetrics(test, values, ctx)
      results.push({
        id: newId(),
        testSlug: slug,
        performedAt: iso,
        values,
        metrics,
        score: primaryValue(test, values, metrics),
        bodyWeightKg: ctx.bodyWeightKg,
        ageYears: ctx.ageYears,
        sex: ctx.sex,
        attempts: [],
      attemptSelection: null,
      photo: null,
      context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
      assessmentId: assessment.id,
        createdAt: iso,
      })
    }
  }

  results.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
  assessments.sort((a, b) => (a.performedOn < b.performedOn ? 1 : -1))
  return {
    version: CURRENT_SCHEMA_VERSION,
    testDays: [],
    // Der Demobestand trägt bewusst keine fremde Marke.
    branding: { organisation: '', logoDataUrl: null, footer: '' },
    lastExportAt: null,
    role: 'solo',
    activeAthleteId: 'demo-athlete',
    athletes: [
      {
        id: 'demo-athlete',
        name: '',
        profile,
        biometrics,
        assessments,
        results,
        archived: false,
        notes: '',
        focuses: DEMO_FOCUSES,
        audit: [],
        createdAt: new Date().toISOString(),
      },
    ],
  }
}
