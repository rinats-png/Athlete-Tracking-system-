import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { bucketOf, coachToday, weekOf } from '../src/domain/coachToday'
import { emptyData } from '../src/lib/store/schema'
import { COACH_NAV_ITEMS, NAV_ITEMS, navItemsFor, navKeyForPath } from '../src/features/dashboard/BottomNav'
import type { StoredAthlete, StoredTestDay } from '../src/lib/store/localStore'

/** Etappe 1 des Umbaus nach der Produktdoktrin: Trainer-Navigation und Heute-Seite. */

const asOf = new Date('2026-10-07T12:00:00.000Z') // Mittwoch

const athlete = (id: string, over: Partial<StoredAthlete> = {}): StoredAthlete => {
  const base = emptyData().athletes[0]
  return { ...base, id, name: id, ...over, results: over.results ?? [] }
}

test.describe('Fachlogik', () => {
  test('Woche läuft von Montag bis Sonntag', () => {
    expect(weekOf(asOf)).toEqual({ from: '2026-10-05', to: '2026-10-11' })
    expect(weekOf(new Date('2026-10-11T08:00:00.000Z'))).toEqual({ from: '2026-10-05', to: '2026-10-11' })
    expect(weekOf(new Date('2026-10-05T00:30:00.000Z'))).toEqual({ from: '2026-10-05', to: '2026-10-11' })
  })

  test('drei Gruppen, keine davon ein Urteil: Überfällig, Zu prüfen, Aktuell', () => {
    expect(bucketOf({ attention: ['no_assessment'] })).toBe('overdue')
    expect(bucketOf({ attention: ['overdue', 'declining'] })).toBe('overdue')
    expect(bucketOf({ attention: ['declining'] })).toBe('review')
    expect(bucketOf({ attention: ['thin_data'] })).toBe('review')
    expect(bucketOf({ attention: [] })).toBe('current')
  })

  test('ohne Messungen sind alle überfällig, die Summe stimmt, höchstens drei werden vorn gezeigt', () => {
    const list = ['a', 'b', 'c', 'd', 'e'].map((id) => athlete(id))
    const r = coachToday(list, [], asOf)
    expect(r.status).toEqual({ current: 0, review: 0, overdue: 5, total: 5 })
    expect(r.priority).toHaveLength(3)
    expect(r.priority.every((p) => p.reason === 'no_assessment')).toBe(true)
    expect(r.matrix).toBeNull()
    expect(r.testDay).toBeNull()
  })

  test('archivierte Athleten zählen nicht mit', () => {
    const r = coachToday([athlete('a'), athlete('b', { archived: true } as Partial<StoredAthlete>)], [], asOf)
    expect(r.status.total).toBe(1)
  })

  test('der nächste Testtag ist der erste, der nicht in der Vergangenheit liegt', () => {
    const day = (id: string, plannedOn: string): StoredTestDay => ({ id, title: id, plannedOn, batterySlug: null, testSlugs: ['sprint_30m', 'run_5k'], athleteIds: ['a', 'b', 'c'], stationMinutes: 20 }) as StoredTestDay
    const r = coachToday([athlete('a')], [day('alt', '2026-10-01'), day('später', '2026-11-01'), day('bald', '2026-10-09')], asOf)
    expect(r.testDay).toMatchObject({ id: 'bald', athletes: 3, stations: 2, firstTestSlug: 'sprint_30m' })
  })
})

test.describe('Navigation nach Rolle', () => {
  test('Trainer und Athleten haben je fünf Bereiche, mit Trainingsbereich (Bau-Schalter) je sechs', () => {
    expect(COACH_NAV_ITEMS.map((i) => i.key)).toEqual(['coachToday', 'coachAthletes', 'coachPlan', 'coachTest', 'coachTeam', 'coachMore'])
    expect(NAV_ITEMS).toHaveLength(6)
    // Ohne Bau-Schalter (hier: kein Vite-Umfeld) bleibt es bei den fünf der Doktrin.
    expect(navItemsFor('coach').map((i) => i.key)).toEqual(['coachToday', 'coachAthletes', 'coachTest', 'coachTeam', 'coachMore'])
    expect(navKeyForPath('/plan/zuweisen', 'coach', COACH_NAV_ITEMS)).toBe('coachPlan')
  })
  test('die Pfade führen auf den richtigen Bereich', () => {
    expect(navKeyForPath('/', 'coach')).toBe('coachToday')
    expect(navKeyForPath('/trainer', 'coach')).toBe('coachAthletes')
    expect(navKeyForPath('/trainer/testtag/abc', 'coach')).toBe('coachTest')
    expect(navKeyForPath('/tests/sprint_30m', 'coach')).toBe('coachTest')
    expect(navKeyForPath('/trainer/heatmap', 'coach')).toBe('coachTeam')
    expect(navKeyForPath('/trainer/team', 'coach')).toBe('coachTeam')
    expect(navKeyForPath('/mehr', 'coach')).toBe('coachMore')
    expect(navKeyForPath('/datenschutz', 'coach')).toBe('coachMore')
    expect(navKeyForPath('/fuel', 'solo')).toBe('fuel')
  })
})

async function asCoach(page: import('@playwright/test').Page) {
  await openDemo(page)
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
    const base = store.athletes[0]
    for (const [i, name] of ['Liam', 'Noah', 'Ethan', 'Mason'].entries()) {
      const twin = JSON.parse(JSON.stringify(base))
      twin.id = `a-${i}`
      twin.name = name
      if (i >= 2) twin.results = []
      store.athletes.push(twin)
    }
    store.role = 'coach'
    localStorage.setItem('kydon.data.v1', JSON.stringify(store))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('coach-today')).toBeVisible()
}

test('Bildschirm: Trainer sieht Heute mit Teamstatus, Priorität und sechs Bereichen (mit Trainingsbereich)', async ({ page }) => {
  await asCoach(page)
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
  await expect(nav.getByRole('button')).toHaveCount(10)
  for (const label of ['Heute', 'Athleten', 'Plan', 'Test', 'Team', 'Wochenbericht', 'Fragen', 'Analyse', 'Profil', 'Einstellungen']) await expect(nav.getByRole('button', { name: label })).toBeVisible()
  const nums = await Promise.all(['current', 'review', 'overdue'].map(async (k) => Number(await page.getByTestId(`status-${k}`).locator('.readout').innerText())))
  expect(nums.reduce((a, b) => a + b, 0)).toBe(5)
  await expect(page.getByTestId('today-priority')).toBeVisible()
  await expect(page.getByTestId('today-actions')).toBeVisible()
  // keine Rohschlüssel, kein Bereitschaftsurteil
  const text = await page.getByTestId('coach-today').innerText()
  expect(text).not.toMatch(/coachToday\.|nav\.short/)
  expect(text).not.toMatch(/\b(bereit|ready|Risiko|risk)\b/i)
})

test('Bildschirm: Team, Einstellungen (Mehr) und Athleten sind über die Leiste erreichbar', async ({ page }) => {
  await asCoach(page)
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
  await nav.getByRole('button', { name: 'Team' }).click()
  await expect(page.getByTestId('team-hub')).toBeVisible()
  await nav.getByRole('button', { name: 'Einstellungen' }).click()
  await expect(page.getByTestId('more-screen')).toBeVisible()
  await expect(page.getByTestId('more-measure')).toBeVisible()
  await nav.getByRole('button', { name: 'Athleten' }).click()
  await expect(page).toHaveURL(/\/trainer$/)
  await nav.getByRole('button', { name: 'Heute' }).click()
  await expect(page.getByTestId('coach-today')).toBeVisible()
})

test('Bildschirm: kein seitliches Überlaufen, hell und dunkel', async ({ page }) => {
  await asCoach(page)
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    for (const path of ['/', '/trainer/team', '/mehr']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over, `${theme} ${path}`).toBeLessThanOrEqual(0)
    }
  }
})

test('Athleten sehen alle ihre Bereiche in der Leiste', async ({ page }) => {
  await openDemo(page)
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button')).toHaveCount(12)
})
