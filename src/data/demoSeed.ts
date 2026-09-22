import { deriveMetrics, primaryValue } from '@/lib/metrics/derive'
import { getTest } from '@/data/testCatalog'
import { CURRENT_SCHEMA_VERSION, newId } from '@/lib/store/localStore'
import type {
  AthleteData,
  StoredAssessment,
  StoredBiometric,
  StoredData,
  StoredDecision,
  StoredDiaryEntry,
  StoredFocus,
  StoredMeal,
  StoredMealItem,
  StoredResult,
  StoredWorkout,
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
/**
 * Vierzehn Tagebuchtage vor heute — deterministisch, kein Zufall.
 *
 * Ein plausibler Verlauf mit einer eingebauten Lücke (Tag −6 fehlt): der
 * Bildschirm soll im Demobestand zeigen, dass eine Lücke eine Lücke bleibt
 * und nicht stillschweigend als Null gezeichnet wird.
 */
function demoDiary(): StoredDiaryEntry[] {
  const out: StoredDiaryEntry[] = []
  const today = new Date()
  const pattern = [
    { w: 83.4, s: 7.5, e: 4, st: 2, so: 2, sess: [{ k: 'strength', d: 75, r: 7 }] },
    { w: 83.1, s: 6.5, e: 3, st: 3, so: 3, sess: [{ k: 'endurance', d: 40, r: 5 }] },
    { w: 83.3, s: 8, e: 4, st: 2, so: 2, sess: [] },
    { w: 82.9, s: 7, e: 4, st: 2, so: 3, sess: [{ k: 'strength', d: 80, r: 8 }] },
    { w: 83.0, s: 7.25, e: 3, st: 3, so: 4, sess: [{ k: 'sport', d: 90, r: 7 }] },
    { w: 82.7, s: 6, e: 2, st: 4, so: 4, sess: [] },
    null,
    { w: 82.8, s: 8, e: 4, st: 2, so: 2, sess: [{ k: 'strength', d: 70, r: 7 }] },
    { w: 82.6, s: 7.5, e: 4, st: 2, so: 2, sess: [{ k: 'endurance', d: 45, r: 6 }] },
    { w: 82.9, s: 7, e: 3, st: 3, so: 3, sess: [] },
    { w: 82.5, s: 7.5, e: 4, st: 2, so: 3, sess: [{ k: 'strength', d: 80, r: 8 }] },
    { w: 82.4, s: 6.75, e: 3, st: 3, so: 4, sess: [{ k: 'sport', d: 100, r: 8 }] },
    { w: 82.6, s: 8.5, e: 5, st: 1, so: 2, sess: [] },
    { w: 82.3, s: 7.5, e: 4, st: 2, so: 2, sess: [{ k: 'strength', d: 75, r: 7 }] },
  ] as const
  pattern.forEach((p, i) => {
    if (!p) return
    const at = new Date(today.getTime() - (13 - i) * 86_400_000)
    const day = at.toISOString().slice(0, 10)
    const iso = `${day}T20:00:00.000Z`
    out.push({
      id: `demo-diary-${day}`,
      day,
      weightKg: p.w,
      sleepHours: p.s,
      sleepQuality: null,
      energy: p.e,
      stress: p.st,
      soreness: p.so,
      steps: null,
      adherence: null,
      sessions: p.sess.map((x, j) => ({ id: `demo-sess-${day}-${j}`, kind: x.k, durationMin: x.d, rpe: x.r, note: '' })),
      note: '',
      createdAt: iso,
      updatedAt: iso,
    })
  })
  return out
}
const DEMO_DIARY = demoDiary()

/**
 * Einheiten, Mahlzeiten und eine Entscheidung fuer den Demobestand — damit
 * Training, Ernaehrung und Cockpit im Demo nicht leer sind. Die Einheiten
 * haengen an den Kraft-Sessions des Tagebuchs (diarySessionId), wie es die
 * App beim Speichern auch tut; Dauer und RPE stehen deshalb nur einmal.
 */
function demoWorkouts(): StoredWorkout[] {
  const strength = DEMO_DIARY.filter((e) => e.sessions.some((s) => s.kind === 'strength'))
  const plans = [
    { title: 'Unterkoerper', ex: [['back_squat', [[100, 5, 2], [100, 5, 2], [105, 4, 1]]], ['romanian_deadlift', [[90, 8, 2], [90, 8, 2]]], ['leg_press', [[180, 10, 2], [180, 10, 1]]]] },
    { title: 'Oberkoerper', ex: [['bench_press', [[80, 5, 2], [80, 5, 1], [82.5, 4, 1]]], ['barbell_row', [[75, 8, 2], [75, 8, 2]]], ['overhead_press', [[50, 6, 2], [50, 6, 1]]]] },
    { title: 'Unterkoerper', ex: [['back_squat', [[102.5, 5, 2], [102.5, 5, 1], [107.5, 3, 1]]], ['romanian_deadlift', [[92.5, 8, 2], [92.5, 8, 2]]], ['leg_press', [[185, 10, 2], [185, 10, 1]]]] },
    { title: 'Oberkoerper', ex: [['bench_press', [[80, 6, 2], [82.5, 5, 1], [85, 3, 1]]], ['pull_up', [[0, 8, 2], [0, 7, 1]]], ['overhead_press', [[52.5, 5, 2], [52.5, 5, 1]]]] },
    { title: 'Unterkoerper', ex: [['deadlift', [[140, 3, 2], [140, 3, 1], [145, 2, 1]]], ['back_squat', [[100, 6, 3], [100, 6, 2]]]] },
  ] as const
  return strength.map((e, i) => {
    const plan = plans[i % plans.length]
    const session = e.sessions.find((s) => s.kind === 'strength')!
    const iso = `${e.day}T18:30:00.000Z`
    return {
      id: `demo-workout-${e.day}`,
      day: e.day,
      title: plan.title,
      exercises: plan.ex.map(([key, sets], j) => ({
        id: `demo-wex-${e.day}-${j}`,
        exerciseKey: key,
        customName: '',
        sets: sets.map(([w, r, rir], k) => ({ id: `demo-set-${e.day}-${j}-${k}`, weightKg: w, reps: r, rir })),
      })),
      durationMin: session.durationMin,
      rpe: session.rpe,
      diarySessionId: session.id,
      note: '',
      createdAt: iso,
      updatedAt: iso,
    }
  })
}
const DEMO_WORKOUTS = demoWorkouts()

/**
 * Die Naehrwerte der Demo-Mahlzeiten liegen hier als Kopie aus dem Kern,
 * nicht als Import: der Kern (245 Eintraege) gehoert in das nachgeladene
 * Ernaehrungspaket, nicht ins Startpaket.
 */
const DEMO_FOODS: Record<string, { name: string; per100: StoredMealItem['per100'] }> = {
  "haferflocken_zart": {
    "name": "Haferflocken (zart)",
    "per100": {
      "kcal": 372,
      "protein": 13.5,
      "fat": 7,
      "carbs": 58.7,
      "fiber": 10
    }
  },
  "magerquark": {
    "name": "Magerquark",
    "per100": {
      "kcal": 67,
      "protein": 12,
      "fat": 0.2,
      "carbs": 4,
      "fiber": 0
    }
  },
  "milch_1_5": {
    "name": "Milch 1,5 %",
    "per100": {
      "kcal": 47,
      "protein": 3.4,
      "fat": 1.5,
      "carbs": 4.9,
      "fiber": 0
    }
  },
  "reis_basmati_roh": {
    "name": "Reis, Basmati (roh)",
    "per100": {
      "kcal": 351,
      "protein": 8,
      "fat": 0.6,
      "carbs": 77,
      "fiber": 1.5
    }
  },
  "haehnchenbrust_roh": {
    "name": "Hähnchenbrust (roh)",
    "per100": {
      "kcal": 110,
      "protein": 23,
      "fat": 1.5,
      "carbs": 0,
      "fiber": 0
    }
  },
  "brokkoli_roh": {
    "name": "Brokkoli (roh)",
    "per100": {
      "kcal": 34,
      "protein": 2.8,
      "fat": 0.4,
      "carbs": 6.6,
      "fiber": 2.6
    }
  },
  "kartoffeln_roh": {
    "name": "Kartoffeln (roh)",
    "per100": {
      "kcal": 70,
      "protein": 2,
      "fat": 0.1,
      "carbs": 15,
      "fiber": 2
    }
  },
  "lachs_roh": {
    "name": "Lachs (roh)",
    "per100": {
      "kcal": 200,
      "protein": 20,
      "fat": 13,
      "carbs": 0,
      "fiber": 0
    }
  },
  "ei_groesse_m_ca_58_g_pro_100_g": {
    "name": "Ei, Größe M (ca. 58 g) – pro 100 g",
    "per100": {
      "kcal": 155,
      "protein": 12.5,
      "fat": 11,
      "carbs": 1,
      "fiber": 0
    }
  },
  "brot_vollkorn": {
    "name": "Brot, Vollkorn",
    "per100": {
      "kcal": 250,
      "protein": 9,
      "fat": 3,
      "carbs": 41,
      "fiber": 7
    }
  }
}

function demoMeals(): StoredMeal[] {
  const days = DEMO_DIARY.slice(-3).map((e) => e.day)
  const menu: [StoredMeal['slot'], [string, number][]][] = [
    ['breakfast', [['haferflocken_zart', 80], ['magerquark', 250], ['milch_1_5', 200]]],
    ['lunch', [['reis_basmati_roh', 100], ['haehnchenbrust_roh', 180], ['brokkoli_roh', 200]]],
    ['dinner', [['kartoffeln_roh', 300], ['lachs_roh', 150]]],
    ['snack', [['ei_groesse_m_ca_58_g_pro_100_g', 116], ['brot_vollkorn', 80]]],
  ]
  const out: StoredMeal[] = []
  for (const day of days) {
    for (const [slot, items] of menu) {
      const iso = `${day}T12:00:00.000Z`
      out.push({
        id: `demo-meal-${day}-${slot}`,
        day,
        slot,
        items: items.map(([key, grams], i): StoredMealItem => ({ id: `demo-item-${day}-${slot}-${i}`, foodKey: key, name: DEMO_FOODS[key].name, source: 'core', grams, per100: DEMO_FOODS[key].per100, barcode: null })),
        note: '',
        createdAt: iso,
        updatedAt: iso,
      })
    }
  }
  return out
}
const DEMO_MEALS = demoMeals()

function demoDecisions(): StoredDecision[] {
  const first = DEMO_DIARY[0].day
  const review = DEMO_DIARY[DEMO_DIARY.length - 1].day
  const iso = `${first}T21:00:00.000Z`
  return [
    {
      id: 'demo-decision-1',
      decidedOn: first,
      trigger: 'sleep_below_baseline',
      area: 'recovery',
      observation: 'Schlaf in der Vorwoche im Mittel unter 6,5 h, Energie bei 3.',
      decision: 'Letzte Einheit des Tages vor 19 Uhr beenden, kein Koffein nach 14 Uhr.',
      rationale: 'Beobachtung, kein Befund: die spaeten Einheiten fallen mit den kurzen Naechten zusammen.',
      expected: 'Schlaf zurueck in den Bereich der letzten vier Wochen.',
      reviewOn: review,
      actual: '',
      status: 'open',
      metric: { kind: 'diary', key: 'sleepHours' },
      createdAt: iso,
      updatedAt: iso,
      reviewedAt: null,
    },
  ]
}
const DEMO_DECISIONS = demoDecisions()

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
    weightClass: '-81 kg',
    maturityStage: null,
    sportCategoryId: 'combat',
    disciplineId: 'judo',
    performanceLevel: 'advanced',
    trainingAgeYears: 9,
    sessionsPerWeek: 5,
    dominantSide: 'right',
    goal: 'Griffkraft und Kampfausdauer halten, Grundlage aufbauen',
    constraints: '',
    // Zehn Wochen voraus, vom Tag des Ladens an gerechnet: der Demobestand
    // soll den Rahmen zeigen, nicht einen Wettkampf, der längst vorbei ist.
    competition: { name: 'Landesmeisterschaft', on: new Date(Date.now() + 70 * 86_400_000).toISOString().slice(0, 10) },
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
        observations: [],
        diary: DEMO_DIARY,
        diaryFields: ['stress', 'soreness'],
        workouts: DEMO_WORKOUTS,
        decisions: DEMO_DECISIONS,
        cockpit: { sleepDropPct: 15, energyDropPct: 15, stressRisePct: 25, weightChangePctWeek: 1, adherenceBelow: 4, minCompletenessPct: 70 },
        meals: DEMO_MEALS,
        nutrition: { pal: 1.55 },
    health: { consents: [], labs: [], symptoms: [], cycle: [], selfImage: [], meds: [], trainingKcalPerDay: null, updatedAt: null },
    peakWeeks: [],
    notes: '',
    consent: { grantedAt: null, grantedBy: '', forMinor: false, withdrawnAt: null },
        focuses: DEMO_FOCUSES,
        audit: [],
        createdAt: new Date().toISOString(),
      },
    ],
  }
}
