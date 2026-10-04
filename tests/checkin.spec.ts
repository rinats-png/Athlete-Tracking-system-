import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'
import { baselineDeviations, checkinsOf, teamCheckins, teamCheckinsLocal, weekStartOf, type CheckIn } from '../src/domain/checkin'
import { weekReview } from '../src/domain/weekReview'
import { sharedRows } from '../src/lib/checkinShare'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/** Etappe 3: Check-in, Teamlage der Trainer, Wochenrückblick. Handgerechnete Werte. */

const asOf = new Date('2026-10-07T12:00:00.000Z') // Mittwoch
const day = (n: number) => new Date(asOf.getTime() - n * 86_400_000).toISOString().slice(0, 10)
const ci = (n: number, energy: number | null, soreness: number | null, stress: number | null): CheckIn => ({ day: day(n), energy, soreness, stress })

/** 28 ruhige Tage (Muskelkater 2), davor die letzten drei mit anderem Wert. */
const series = (recentSoreness: number): CheckIn[] => [
  ...Array.from({ length: 28 }, (_, i) => ci(i + 3, 4, 2, 2)),
  ci(2, 4, recentSoreness, 2),
  ci(1, 4, recentSoreness, 2),
  ci(0, 4, recentSoreness, 2),
]

test.describe('Check-in: Fachlogik', () => {
  test('Check-ins stammen aus dem Tagebuch: jeder Eintrag mit mindestens einem der drei Werte', () => {
    const list = checkinsOf([
      { day: '2026-10-02', energy: 3, soreness: null, stress: null },
      { day: '2026-10-01', energy: null, soreness: null, stress: null },
      { day: '2026-10-03', energy: null, soreness: 4, stress: 2 },
    ])
    expect(list.map((c) => c.day)).toEqual(['2026-10-02', '2026-10-03'])
  })

  test('Abweichung nur gegen die eigene Baseline, ab einem Punkt, mit genug Werten', () => {
    expect(baselineDeviations(series(2), asOf)).toEqual([])
    const dev = baselineDeviations(series(4), asOf)
    expect(dev).toEqual([{ field: 'soreness', recent: 4, baseline: 2, delta: 2 }])
    // Energie zählt in die andere Richtung: niedriger fällt auf, höher nicht.
    const lowEnergy = series(2).map((c) => (c.day >= day(2) ? { ...c, energy: 2 } : c))
    expect(baselineDeviations(lowEnergy, asOf).map((d) => d.field)).toEqual(['energy'])
    const highEnergy = series(2).map((c) => (c.day >= day(2) ? { ...c, energy: 5 } : c))
    expect(baselineDeviations(highEnergy, asOf)).toEqual([])
  })

  test('zu wenige Werte: keine Aussage, nichts wird geraten', () => {
    expect(baselineDeviations([ci(0, 4, 5, 5), ci(1, 4, 5, 5)], asOf)).toEqual([])
    const noBase = [ci(0, 4, 5, 5), ci(1, 4, 5, 5), ci(2, 4, 5, 5), ...Array.from({ length: 5 }, (_, i) => ci(i + 3, 4, 2, 2))]
    expect(baselineDeviations(noBase, asOf)).toEqual([])
  })

  test('Teamlage: wer hat sich diese Woche gemeldet, wer weicht ab, stärkste Abweichung zuerst', () => {
    expect(weekStartOf(asOf)).toBe('2026-10-05')
    const team = teamCheckins(
      [
        { id: 'a', name: 'Anna', checkins: series(4) },
        { id: 'b', name: 'Ben', checkins: series(3) },
        { id: 'c', name: 'Cem', checkins: [ci(20, 3, 3, 3)] },
      ],
      asOf,
    )
    expect(team.total).toBe(3)
    expect(team.withCheckin).toBe(2)
    expect(team.flagged.map((r) => r.id)).toEqual(['a', 'b'])
    expect(team.rows.find((r) => r.id === 'c')!.daysThisWeek).toBe(0)
  })

  test('lokal geführte Athleten zählen, archivierte nicht', () => {
    const base = emptyData().athletes[0]
    const withDiary = { ...base, id: 'x', name: 'X', diary: [{ id: 'd', day: day(0), energy: 3, soreness: 2, stress: 2, weightKg: null, sleepHours: null, sleepQuality: null, steps: null, adherence: null, sessions: [], note: '', createdAt: '2026-10-07T08:00:00.000Z', updatedAt: '2026-10-07T08:00:00.000Z' }] }
    const t = teamCheckinsLocal([withDiary as never, { ...withDiary, id: 'y', archived: true } as never], asOf)
    expect(t.total).toBe(1)
    expect(t.withCheckin).toBe(1)
  })

  test('geteilt wird nur Tag und die drei Werte, höchstens 35 Tage', () => {
    const rows = sharedRows([ci(40, 3, 3, 3), ci(10, 4, 2, 1), ci(0, 5, null, 2)], asOf)
    expect(rows).toEqual([
      { day: day(10), energy: 4, soreness: 2, stress: 1 },
      { day: day(0), energy: 5, soreness: null, stress: 2 },
    ])
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(['day', 'energy', 'soreness', 'stress'])
  })
})

test('Schema 30: ein Bestand der Version 29 bekommt die Freigabe «aus»', () => {
  const old = { ...emptyData(), version: 29 } as any
  for (const a of old.athletes) delete a.shareCheckins
  const { data, report } = parseStoredData(old)
  expect(report.migratedFrom).toBe(29)
  expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
  expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(30)
  expect(data?.athletes[0].shareCheckins).toBe(false)
})

test.describe('Wochenrückblick: Fachlogik', () => {
  const reminders = { remindersEnabled: true, reminderIntervalDays: {} } as never
  test('ohne Tagebuch: keine Basis für den Vergleich, nichts erfunden', () => {
    const r = weekReview({ diary: [], results: [], reminders }, asOf)
    expect(r.load).toEqual({ week: 0, previousWeeklyMean: null })
    expect(r.checkinDays).toBe(0)
    expect(r.win).toBeNull()
    expect(r.from).toBe('2026-10-01')
    expect(r.to).toBe('2026-10-07')
  })
})

test('Bildschirm: Check-in speichert ins Tagebuch; ohne Schalter kein Teilen', async ({ page }) => {
  await openGuest(page)
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' })
  const panel = page.getByTestId('checkin-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Selbsteinschätzung, keine Messung.', { exact: false })).toBeVisible()
  await expect(panel.getByRole('radiogroup')).toHaveCount(3)
  const groups = panel.getByRole('radiogroup')
  await groups.nth(0).getByRole('radio').nth(3).click() // Energie 4
  await groups.nth(1).getByRole('radio').nth(1).click() // Muskelkater 2
  await groups.nth(2).getByRole('radio').nth(2).click() // Stress 3
  await page.getByTestId('checkin-save').click()
  await expect(page.getByTestId('checkin-saved')).toBeVisible()
  const entry = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kydon.data.v1')!)
    const a = s.athletes.find((x: any) => x.id === s.activeAthleteId)
    const today = new Date().toISOString().slice(0, 10)
    return a.diary.find((d: any) => d.day === today)
  })
  expect(entry).toMatchObject({ energy: 4, soreness: 2, stress: 3 })
  // Das Teilen ist aus, bis der Athlet es einschaltet.
  await expect(page.getByTestId('checkin-share-toggle')).not.toBeChecked()
})

test('Bildschirm: Heute trägt den Check-in und den Weg zum Wochenrückblick', async ({ page }) => {
  await openDemo(page)
  await expect(page.getByTestId('checkin-panel')).toBeVisible()
  await page.getByTestId('today-week-link').click()
  await expect(page).toHaveURL(/\/woche$/)
  await expect(page.getByTestId('week-review')).toBeVisible()
  const text = await page.getByTestId('week-review').innerText()
  expect(text).not.toMatch(/week\.|checkin\./)
  expect(text).not.toMatch(/Streak|Abzeichen|Badge/i)
})

test('Bildschirm: Trainer sieht Check-ins der Woche und Abweichungen von der eigenen Baseline', async ({ page }) => {
  await openDemo(page)
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
    const base = store.athletes[0]
    const mk = (id: string, name: string, recentSoreness: number) => {
      const a = JSON.parse(JSON.stringify(base))
      a.id = id
      a.name = name
      const now = Date.now()
      a.diary = Array.from({ length: 31 }, (_, i) => {
        const dayStr = new Date(now - i * 86_400_000).toISOString().slice(0, 10)
        return { id: `${id}-${i}`, day: dayStr, weightKg: null, sleepHours: null, sleepQuality: null, energy: 4, stress: 2, soreness: i < 3 ? recentSoreness : 2, steps: null, adherence: null, sessions: [], note: '', createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() }
      })
      return a
    }
    store.athletes.push(mk('a-1', 'Liam', 4), mk('a-2', 'Noah', 2))
    store.role = 'coach'
    localStorage.setItem('kydon.data.v1', JSON.stringify(store))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  const card = page.getByTestId('today-checkins')
  await expect(card).toBeVisible()
  await expect(page.getByTestId('checkin-flag-a-1')).toContainText('Liam')
  await expect(page.getByTestId('checkin-flag-a-1')).toContainText('Muskelkater höher')
  await expect(page.getByTestId('checkin-flag-a-2')).toHaveCount(0)
  const text = await card.innerText()
  expect(text).toContain('Selbsteinschätzung, keine Messung, keine Ursache')
  expect(text).not.toMatch(/\b(Risiko|bereit|verletzt)\b/i)
})

test('Teilen ohne Konto: Schalter merkt sich die Wahl, nichts geht ins Netz, der Check-in bleibt', async ({ page }) => {
  const calls: string[] = []
  await page.route('**/*.supabase.co/**', (route) => {
    calls.push(route.request().url())
    return route.abort()
  })
  await openGuest(page)
  await page.goto('/checkin', { waitUntil: 'domcontentloaded' })
  const panel = page.getByTestId('checkin-panel')
  await panel.getByRole('radiogroup').nth(0).getByRole('radio').nth(2).click()
  await page.getByTestId('checkin-save').click()
  await page.getByTestId('checkin-share-toggle').check()
  await expect(page.getByTestId('checkin-share-note')).toContainText('angemeldet')
  expect(calls.filter((u) => u.includes('shared_checkins'))).toEqual([])
  const stored = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kydon.data.v1')!)
    const a = s.athletes.find((x: any) => x.id === s.activeAthleteId)
    return { share: a.shareCheckins, diary: a.diary.length }
  })
  expect(stored).toEqual({ share: true, diary: 1 })
})
