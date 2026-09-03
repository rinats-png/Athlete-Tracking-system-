import { expect, test } from '@playwright/test'
import { MIN_FOR_SPREAD, groupStats } from '../src/domain/groupStats'
import type { StoredAthlete } from '../src/lib/store/localStore'
import { openGuest } from './helpers'

/**
 * Der Gruppentest.
 *
 * Entscheidend ist nicht die Auswertung, sondern die Erfassung: ein Trainer,
 * der für fünfzehn Athleten die App umschalten muss, benutzt sie in der Halle
 * nicht. Diese Fälle halten fest, dass eine Station in EINEM Schreibvorgang
 * bei allen ankommt — und dass die Auswertung den Median nimmt, nicht das
 * Mittel.
 */

function athlete(id: string, name: string, values: number[]): StoredAthlete {
  return {
    id,
    name,
    profile: {} as StoredAthlete['profile'],
    biometrics: [],
    assessments: [],
    results: values.map((score, i) => ({
      id: `${id}-${i}`,
      testSlug: 'grip_strength',
      performedAt: '2026-03-01T12:00:00.000Z',
      score,
    })) as StoredAthlete['results'],
    archived: false,
    notes: '',
    audit: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

test.describe('Gruppenauswertung', () => {
  test('ein Ausreisser verschiebt den Median nicht', () => {
    const normal = [40, 42, 44, 46, 48].map((v, i) => athlete(`a${i}`, `A${i}`, [v]))
    const mitVertipper = [40, 42, 44, 46, 4800].map((v, i) => athlete(`a${i}`, `A${i}`, [v]))
    expect(groupStats(normal, 'grip_strength', '2026-03-01').median).toBe(44)
    expect(
      groupStats(mitVertipper, 'grip_strength', '2026-03-01').median,
      'ein Mittel läge hier bei fast 1000',
    ).toBe(44)
  })

  test('bester und schwächster Wert richten sich nach der Richtung des Tests', () => {
    const stats = groupStats(
      [40, 48].map((v, i) => athlete(`a${i}`, `A${i}`, [v])),
      'grip_strength',
      '2026-03-01',
    )
    expect(stats.best, 'bei Griffkraft ist mehr besser').toBe(48)
    expect(stats.worst).toBe(40)
  })

  test('unter vier Werten wird keine Streuung ausgewiesen', () => {
    const wenige = [40, 44, 48].map((v, i) => athlete(`a${i}`, `A${i}`, [v]))
    const stats = groupStats(wenige, 'grip_strength', '2026-03-01')
    expect(stats.q1, `unter ${MIN_FOR_SPREAD} Werten ist eine Spanne keine Aussage`).toBeNull()
    expect(stats.q3).toBeNull()
    expect(stats.median, 'der Median steht trotzdem').toBe(44)
  })

  test('wer an dem Tag nicht gemessen wurde, zählt nicht mit', () => {
    const gruppe = [athlete('a1', 'A', [40]), athlete('a2', 'B', []), athlete('a3', 'C', [48])]
    const stats = groupStats(gruppe, 'grip_strength', '2026-03-01')
    expect(stats.measured).toBe(2)
    expect(stats.total, 'die Gruppengrösse bleibt sichtbar').toBe(3)
  })

  test('ein anderer Tag ist eine andere Runde', () => {
    const gruppe = [athlete('a1', 'A', [40])]
    expect(groupStats(gruppe, 'grip_strength', '2026-04-01').measured).toBe(0)
  })
})

test.describe('Gruppentest im Bildschirm', () => {
  test('eine Station schreibt in einem Zug bei allen Athleten', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('baseline.data.v1')!)
      const vorlage = store.athletes[0]
      store.role = 'coach'
      store.athletes = ['Mara', 'Jonas', 'Ines'].map((name, i) => ({
        ...vorlage,
        id: `athlete-${i + 1}`,
        name,
        results: [],
        audit: [],
      }))
      store.activeAthleteId = 'athlete-1'
      localStorage.setItem('baseline.data.v1', JSON.stringify(store))
    })
    await page.goto('/trainer/gruppentest', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Test', { exact: false }).first().selectOption('grip_strength')
    await page.getByLabel('Mara').fill('40')
    await page.getByLabel('Jonas').fill('44')
    // Ines bleibt leer — sie war nicht da.
    await page.getByRole('button', { name: /Werte speichern/ }).click()

    await expect(page.getByText('2 Ergebnisse gespeichert.')).toBeVisible()
    await expect(page.getByText('2 von 3')).toBeVisible()

    const zahlen = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('baseline.data.v1')!).athletes.map(
        (a: { results: unknown[] }) => a.results.length,
      ),
    )
    expect(zahlen, 'nacheinander geschrieben würden sich die Werte überschreiben').toEqual([1, 1, 0])
  })
})
