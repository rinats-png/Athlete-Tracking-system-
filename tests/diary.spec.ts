import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'
import { emptyData, parseStoredData, CURRENT_SCHEMA_VERSION } from '../src/lib/store/schema'
import {
  acuteChronic,
  completeness,
  dayLoad,
  loadSum,
  rollingMean,
  sessionLoad,
  weightTrend,
  window as diaryWindow,
} from '../src/domain/diary'
import type { StoredDiaryEntry } from '../src/lib/store/localStore'

/**
 * Das Tagebuch — Schicht S1 aus docs/ausbau.md.
 *
 * Die Rechenfälle sind gegen den Testbericht des Coaching-Systems v4.0.0
 * geprüft: dieselben Eingaben, dieselben Soll-Werte. Ein Port, der bei
 * diesen Zahlen dasselbe rechnet wie das unabhängig geprüfte Excel-System,
 * ist belegt und nicht nur plausibel.
 *
 * Die Bildschirmfälle sichern, was am leichtesten verloren geht: dass
 * nichts bewertet wird (§81), dass eine Lücke eine Lücke bleibt (§89), und
 * dass ein Trainer die Tagebücher seiner Athleten getrennt sieht.
 */

function entry(day: string, patch: Partial<StoredDiaryEntry> = {}): StoredDiaryEntry {
  return {
    id: `e-${day}`,
    day,
    weightKg: null,
    sleepHours: null,
    sleepQuality: null,
    energy: null,
    stress: null,
    soreness: null,
    steps: null,
    adherence: null,
    sessions: [],
    note: '',
    createdAt: `${day}T20:00:00.000Z`,
    updatedAt: `${day}T20:00:00.000Z`,
    ...patch,
  }
}
const session = (durationMin: number, rpe: number) => ({ id: `s-${durationMin}-${rpe}`, kind: 'strength' as const, durationMin, rpe, note: '' })

test.describe('Rechnung, geprüft gegen den Testbericht v4.0.0', () => {
  test('Session-Last nach Foster: Tagesdaten!AG5 = 525', () => {
    // Testathlet Tag 1: 75 min bei RPE 7.
    expect(sessionLoad({ durationMin: 75, rpe: 7 })).toBe(525)
  })

  test('Cardio-Last: Tagesdaten!AI7 = 120 bei 30 Minuten', () => {
    // Tagesdaten!AH7 = 30 min → 120 AU heisst RPE 4. Dieselbe Formel, kein Sonderfall für Cardio.
    expect(sessionLoad({ durationMin: 30, rpe: 4 })).toBe(120)
  })

  test('Wochenlast ist die Summe der Tageslasten: Trainings-Analytics!C48 = 2100', () => {
    // Vier Einheiten à 525 in einer Woche.
    const entries = ['2026-01-05', '2026-01-07', '2026-01-09', '2026-01-11'].map((d) =>
      entry(d, { sessions: [session(75, 7)] }),
    )
    expect(loadSum(entries, '2026-01-11', 7)).toBe(2100)
  })

  test('zwei Einheiten an einem Tag addieren sich; Mahlzeiten-Tracking Tag 1!AA9 = 540', () => {
    // Session 1: 60 min RPE 7 = 420 (Tag 1!AA6); Session 2: 120 AU.
    expect(dayLoad(entry('2026-01-05', { sessions: [session(60, 7), session(30, 4)] }))).toBe(540)
  })

  test('ein Tag ohne Eintrag ist eine Lücke im Fenster, nicht null', () => {
    const w = diaryWindow([entry('2026-01-05'), entry('2026-01-07')], '2026-01-07', 3)
    expect(w.map((x) => x.day)).toEqual(['2026-01-05', '2026-01-06', '2026-01-07'])
    expect(w[1].entry).toBeNull()
  })

  test('das Mittel zählt nur erfasste Tage — die Lücke zieht nicht nach unten', () => {
    const entries = [entry('2026-01-05', { weightKg: 84 }), entry('2026-01-07', { weightKg: 82 })]
    const m = rollingMean(entries, 'weightKg', '2026-01-07', 7)
    expect(m).toEqual({ mean: 83, n: 2 })
  })

  test('der Gewichtstrend braucht drei Wägungen in beiden Wochen', () => {
    const few = [entry('2026-01-10', { weightKg: 83 }), entry('2026-01-03', { weightKg: 84 })]
    expect(weightTrend(few, '2026-01-10')).toBeNull()
    const enough = [
      ...['2026-01-08', '2026-01-09', '2026-01-10'].map((d) => entry(d, { weightKg: 82 })),
      ...['2026-01-01', '2026-01-02', '2026-01-03'].map((d) => entry(d, { weightKg: 83 })),
    ]
    expect(weightTrend(enough, '2026-01-10')).toBeCloseTo(-1, 5)
  })

  test('das Belastungsverhältnis schweigt, solange keine vier Wochen da sind', () => {
    const oneWeek = ['2026-01-05', '2026-01-06', '2026-01-07'].map((d) => entry(d, { sessions: [session(60, 6)] }))
    expect(acuteChronic(oneWeek, '2026-01-07')).toBeNull()
    // 28 Tage, jeder Tag 300 AU: akut = chronisch → 1.
    const full: StoredDiaryEntry[] = []
    for (let i = 0; i < 28; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10)
      full.push(entry(d, { sessions: [session(60, 5)] }))
    }
    expect(acuteChronic(full, '2026-01-28')).toBeCloseTo(1, 5)
  })

  test('Vollständigkeit: Check-in-Grafiken!M13 = 0,9643 bei einer Lücke in 28 Tagen', () => {
    const entries: StoredDiaryEntry[] = []
    for (let i = 0; i < 28; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10)
      if (i === 10) continue
      entries.push(entry(d, { weightKg: 80 }))
    }
    expect(completeness(entries, '2026-01-28', 28)).toBeCloseTo(0.9643, 3)
  })
})

test.describe('Schema', () => {
  test('ein Bestand der Version 19 bekommt ein leeres Tagebuch — nicht ein erfundenes', () => {
    const old = { ...emptyData(), version: 19 } as any
    delete old.athletes[0].diary
    delete old.athletes[0].diaryFields
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(19)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(data?.athletes[0].diary).toEqual([])
    expect(data?.athletes[0].diaryFields).toEqual([])
  })

  test('ein Eintrag mit Gesundheitsdaten wird nicht angenommen', () => {
    // Schmerz, Zyklus, Ruhepuls gehören in die Gesundheitsschicht (S5) — das
    // Schema kennt sie hier nicht, und Zod streift unbekannte Felder ab.
    const store = emptyData()
    store.athletes[0].diary = [
      { ...entry('2026-01-05', { weightKg: 80 }), painLevel: 7, cycleDay: 12 } as any,
    ]
    const { data } = parseStoredData(store)
    expect(Object.keys(data!.athletes[0].diary[0])).not.toContain('painLevel')
    expect(Object.keys(data!.athletes[0].diary[0])).not.toContain('cycleDay')
  })
})

test.describe('Im Bildschirm', () => {
  test('ein Tag lässt sich in wenigen Tipps erfassen und überlebt das Neuladen', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Gewicht', { exact: true }).fill('82.5')
    await page.getByLabel('Schlaf', { exact: true }).fill('7.5')
    await page.getByRole('radio', { name: 'Energie: 4' }).click()

    await page.getByRole('button', { name: 'Einheit hinzufügen' }).click()
    await page.getByRole('radio', { name: 'Anstrengung (RPE 1–10): 7' }).click()
    // Vorgabe 60 min × 7 = 420 — dieselbe Zahl wie Tag 1!AA6 im Testbericht.
    await expect(page.getByText('Session-Last: 420 AU')).toBeVisible()
    await page.getByRole('button', { name: 'Einheit eintragen' }).click()
    await expect(page.getByText('Tageslast 420 AU')).toBeVisible()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Gewicht', { exact: true })).toHaveValue('82.5')
    await expect(page.getByRole('radio', { name: 'Energie: 4' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('Tageslast 420 AU')).toBeVisible()
  })

  test('freiwillige Felder erscheinen erst, wenn man sie einschaltet', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('radiogroup', { name: 'Stress' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Stress', pressed: false }).click()
    await expect(page.getByRole('radiogroup', { name: 'Stress' })).toBeVisible()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('radiogroup', { name: 'Stress' })).toBeVisible()
  })

  test('nichts wird bewertet', async ({ page }) => {
    await openDemo(page)
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    const text = await page.locator('main').innerText()
    for (const word of ['zu wenig', 'zu viel', 'schlecht', 'Warnung', 'empfohlen', 'solltest']) {
      expect(text, `«${word}» wäre eine Bewertung`).not.toContain(word)
    }
    await expect(page.getByText('Nichts hier ist eine Empfehlung.')).toBeVisible()
  })

  test('im Demobestand ist der fehlende Tag schraffiert, nicht null', async ({ page }) => {
    await openDemo(page)
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    // Der Demobestand lässt Tag −6 aus; jede der vier Leisten zeigt ihn als Lücke.
    await expect(page.locator('[data-diary-gap]').first()).toBeVisible()
    expect(await page.locator('[data-diary-gap]').count()).toBeGreaterThanOrEqual(4)
  })

  test('die Übersicht nimmt den Tag mit einem Tipp entgegen', async ({ page }) => {
    await openGuest(page)
    const card = page.getByTestId('diary-today')
    await expect(card.getByText('Wie war der Tag? Ein Tipp genügt.')).toBeVisible()
    await card.getByRole('radio', { name: 'Energie: 3' }).click()
    await expect(card.getByText('Heute ist erfasst.')).toBeVisible()
  })

  test('ein Trainer sieht je Athlet ein eigenes Tagebuch', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Gewicht', { exact: true }).fill('90')

    // Zweiten Athleten anlegen und aktivieren — über den Bestand, nicht über
    // die Oberfläche: geprüft wird die Trennung, nicht der Anlagedialog.
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      const twin = JSON.parse(JSON.stringify(store.athletes[0]))
      twin.id = 'athlete-2'
      twin.name = 'Zweiter'
      twin.diary = []
      store.athletes.push(twin)
      store.role = 'coach'
      store.activeAthleteId = 'athlete-2'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Gewicht', { exact: true })).toHaveValue('')
  })
})
