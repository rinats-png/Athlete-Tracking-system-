import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { emptyData, parseStoredData, CURRENT_SCHEMA_VERSION } from '../src/lib/store/schema'
import { blockCompare, e1rm, exerciseSummary, setsPerMuscle, workoutVolume } from '../src/domain/training'
import { EXERCISES, exerciseByKey, searchExercises } from '../src/data/exercises'
import type { StoredWorkout } from '../src/lib/store/localStore'

/**
 * Das Trainingslog — Schicht S2 aus docs/ausbau.md.
 *
 * Rechnung gegen den Testbericht v4.0.0: e1RM nach Epley mit RIR
 * (Trainingslog!J5 = 108), Sätze je Muskel und Woche (Muskelvolumen!V5 = 6).
 * Im Bildschirm: Sätze ohne Tabelle erfassen, e1RM sofort sehen, die
 * Einheit fliesst als Last ins Tagebuch — und nichts wird empfohlen.
 */

function workout(day: string, exerciseKey: string, sets: [number, number, number | null][], extra: Partial<StoredWorkout> = {}): StoredWorkout {
  return {
    id: `w-${day}-${exerciseKey}`,
    day,
    title: '',
    exercises: [{ id: `x-${day}`, exerciseKey, customName: '', sets: sets.map(([weightKg, reps, rir], i) => ({ id: `s-${day}-${i}`, weightKg, reps, rir })) }],
    durationMin: null,
    rpe: null,
    diarySessionId: null,
    note: '',
    createdAt: `${day}T18:00:00.000Z`,
    updatedAt: `${day}T18:00:00.000Z`,
    ...extra,
  }
}

test.describe('Rechnung, geprüft gegen den Testbericht v4.0.0', () => {
  test('e1RM nach Epley mit RIR: Trainingslog!J5 = 108', () => {
    // Testathlet, erster Satz: 81 kg, Wdh + RIR = 10 → 81 · (1 + 10/30) = 108.
    expect(e1rm({ weightKg: 81, reps: 8, rir: 2 })).toBeCloseTo(108, 5)
    expect(e1rm({ weightKg: 81, reps: 10, rir: 0 })).toBeCloseTo(108, 5)
  })

  test('ein Einser bei RIR 0 ist der 1RM selbst — keine Formel darüber', () => {
    expect(e1rm({ weightKg: 140, reps: 1, rir: 0 })).toBe(140)
  })

  test('Volumen ist Gewicht mal Wiederholungen über alle Sätze', () => {
    expect(workoutVolume(workout('2026-01-05', 'bench_press', [[80, 8, 2], [80, 8, 1], [80, 7, 0]]))).toBe(80 * 23)
  })

  test('Sätze je Muskel und Woche: Muskelvolumen!V5 = 6 Brustsätze', () => {
    const ws = [
      workout('2026-04-13', 'bench_press', [[80, 8, 2], [80, 8, 2], [80, 8, 2]]),
      workout('2026-04-16', 'db_incline_press', [[30, 10, 2], [30, 10, 2], [30, 10, 2]]),
      // Trizeps zählt NICHT als Brust — nur der Primärmuskel.
      workout('2026-04-17', 'triceps_pushdown', [[25, 12, 2], [25, 12, 2]]),
      // Vorige Woche zählt nicht mit.
      workout('2026-04-08', 'bench_press', [[80, 8, 2]]),
    ]
    const sets = setsPerMuscle(ws, '2026-04-19', 7)
    expect(sets.chest).toBe(6)
    expect(sets.triceps).toBe(2)
    expect(sets.back).toBe(0)
  })

  test('der Blockvergleich schweigt bei zu wenigen Einheiten und sagt sonst nur die Zahl', () => {
    const few = [workout('2026-03-01', 'back_squat', [[100, 5, 1]]), workout('2026-03-20', 'back_squat', [[100, 5, 1]])]
    expect(blockCompare(few, 'back_squat', '2026-03-28').verdict).toBe('insufficient')
    const steady = [
      workout('2026-02-02', 'back_squat', [[100, 5, 1]]),
      workout('2026-02-09', 'back_squat', [[100, 5, 1]]),
      workout('2026-03-02', 'back_squat', [[100, 5, 1]]),
      workout('2026-03-09', 'back_squat', [[100, 5, 1]]),
    ]
    const r = blockCompare(steady, 'back_squat', '2026-03-28')
    expect(r.verdict).toBe('unchanged')
    expect(r.deltaPercent).toBeCloseTo(0, 5)
    const up = steady.map((w, i) => (i >= 2 ? workout(w.day, 'back_squat', [[110, 5, 1]]) : w))
    expect(blockCompare(up, 'back_squat', '2026-03-28').verdict).toBe('up')
  })

  test('die Zusammenfassung zählt Einheiten je Übung und den besten e1RM', () => {
    const s = exerciseSummary([
      workout('2026-01-05', 'bench_press', [[80, 8, 2]]),
      workout('2026-01-08', 'bench_press', [[82.5, 8, 2]]),
    ])
    expect(s).toHaveLength(1)
    expect(s[0].sessions).toBe(2)
    expect(s[0].best).toBeCloseTo(82.5 * (1 + 10 / 30), 5)
  })
})

test.describe('Übungskatalog', () => {
  test('jede Übung trägt genau einen Primärmuskel und keine Vorgabe', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60)
    for (const e of EXERCISES) {
      expect(e.muscle, e.key).toBeTruthy()
      expect(Object.keys(e)).not.toContain('recommendedSets')
      expect(Object.keys(e)).not.toContain('reps')
    }
    expect(exerciseByKey('bench_press')?.muscle).toBe('chest')
  })

  test('die Suche findet über Umlaute und Sprachen hinweg', () => {
    expect(searchExercises('kniebeuge').map((e) => e.key)).toContain('back_squat')
    expect(searchExercises('squat').map((e) => e.key)).toContain('back_squat')
    expect(searchExercises('bank').map((e) => e.key)).toContain('bench_press')
  })
})

test.describe('Schema', () => {
  test('ein Bestand der Version 20 bekommt ein leeres Trainingslog', () => {
    const old = { ...emptyData(), version: 20 } as any
    delete old.athletes[0].workouts
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(20)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(data?.athletes[0].workouts).toEqual([])
  })
})

test.describe('Im Bildschirm', () => {
  test('eine Einheit ohne Tabelle: Übung suchen, Sätze antippen, e1RM sehen, speichern', async ({ page }) => {
    await openGuest(page)
    await page.goto('/training', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Neue Einheit' }).click()

    await page.getByLabel('Übung hinzufügen').fill('bank')
    await page.getByRole('option', { name: /Bankdrücken \(Langhantel\)/ }).click()

    await page.getByLabel('Satz 1: Gewicht').fill('81')
    // Vorgabe 8 Wdh; RIR 2 → Wdh + RIR = 10 → e1RM 108, wie Trainingslog!J5.
    await page.getByRole('radio', { name: 'Satz 1: RIR: 2' }).click()
    await expect(page.getByTestId('set-e1rm').first()).toContainText('e1RM 108,0 kg')

    await page.getByRole('button', { name: 'Satz wiederholen' }).click()
    await expect(page.getByTestId('set-e1rm')).toHaveCount(2)
    await page.getByRole('button', { name: 'Satz 2: mehr Wiederholungen' }).click()
    await expect(page.getByTestId('set-e1rm').nth(1)).toContainText('e1RM 110,7 kg')

    await page.getByRole('button', { name: 'Einheit speichern' }).click()
    await expect(page.getByText('2 Sätze')).toBeVisible()
    await expect(page.getByText(/1\.377 kg·Wdh/)).toBeVisible()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('2 Sätze')).toBeVisible()
  })

  test('Dauer und Anstrengung fliessen als Einheit ins Tagebuch', async ({ page }) => {
    await openGuest(page)
    await page.goto('/training', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Neue Einheit' }).click()
    await page.getByLabel('Übung hinzufügen').fill('knie')
    await page.getByRole('option', { name: /Kniebeuge \(Langhantel\)/ }).click()
    await page.getByLabel('Satz 1: Gewicht').fill('100')
    await page.getByLabel('Dauer').fill('75')
    await page.getByRole('radio', { name: 'Anstrengung (RPE 1–10): 7' }).click()
    await expect(page.getByText(/525 AU/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Einheit speichern' }).click()

    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Tageslast 525 AU')).toBeVisible()

    // Löschen der Einheit nimmt die Tagebuch-Einheit mit — eine Wahrheit, nicht zwei.
    await page.goto('/training', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /^Löschen:/ }).click()
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Tageslast 525 AU')).toHaveCount(0)
  })

  test('nichts wird empfohlen', async ({ page }) => {
    await openGuest(page)
    await page.goto('/training', { waitUntil: 'domcontentloaded' })
    const text = await page.locator('main').innerText()
    for (const word of ['empfohlen', 'solltest', 'Plateau brechen', 'zu wenig', 'Ziel:']) {
      expect(text, `«${word}» wäre eine Empfehlung`).not.toContain(word)
    }
  })
})
