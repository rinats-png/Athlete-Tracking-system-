import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { forecastWindow, msToKmh, parseForecast, parsePlaces } from '../src/domain/raceWeather'
import { shiftDay } from '../src/domain/runMetrics'

/** Läufe, Stufe 4: Rennwetter nur auf Tipp. Kein echtes Netz: Antworten sind nachgestellt. */

test.describe('Auswertung', () => {
  test('Vorhersagefenster: heute bis 15 Tage voraus', () => {
    expect(forecastWindow('2026-10-02', '2026-10-02')).toBe('ok')
    expect(forecastWindow('2026-10-17', '2026-10-02')).toBe('ok')
    expect(forecastWindow('2026-10-18', '2026-10-02')).toBe('too_far')
    expect(forecastWindow('2026-10-01', '2026-10-02')).toBe('past')
    expect(forecastWindow('morgen', '2026-10-02')).toBe('invalid')
  })
  test('Orte: ungültige Koordinaten und fehlende Namen fallen weg', () => {
    const r = parsePlaces({ results: [{ name: 'Berlin', admin1: 'Berlin', country: 'Deutschland', latitude: 52.52, longitude: 13.4 }, { name: 'X', latitude: 999, longitude: 0 }, { latitude: 1, longitude: 1 }] })
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ name: 'Berlin', lat: 52.52 })
    expect(parsePlaces(null)).toEqual([])
  })
  test('Vorhersage: Fehlendes bleibt null, nie 0; ohne den Tag gibt es nichts', () => {
    const body = { daily: { time: ['2026-10-05'], temperature_2m_max: [14.2], temperature_2m_min: [6.1], wind_speed_10m_max: [5], precipitation_sum: [null], precipitation_probability_max: [30] } }
    expect(parseForecast(body, '2026-10-05')).toEqual({ day: '2026-10-05', tempMin: 6.1, tempMax: 14.2, windMax: 5, precipMm: null, precipChance: 30 })
    expect(parseForecast(body, '2026-10-06')).toBeNull()
    expect(parseForecast({ daily: { time: ['2026-10-05'] } }, '2026-10-05')).toBeNull()
    expect(msToKmh(5)).toBeCloseTo(18, 5)
  })
})

const place = { results: [{ name: 'Berlin', admin1: 'Berlin', country: 'Deutschland', latitude: 52.52, longitude: 13.4 }] }

async function readyDashboard(page: import('@playwright/test').Page) {
  await openDemo(page)
  await page.goto('/analyse/laeufe', { waitUntil: 'domcontentloaded' })
  const head = 'Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Max Heart Rate,Activity Gear,Elapsed Time,Moving Time,Distance,Elevation Gain,Max Heart Rate,Average Heart Rate,Average Cadence,Calories'
  const rows = [head]
  const months = ['Jun', 'Jul', 'Aug', 'Sep']
  for (let w = 0; w < 14; w++) {
    for (const d of [2, 4, 6]) {
      const date = new Date(Date.UTC(2026, 5, 1 + w * 7 + d))
      const km = d === 6 ? 14 : 8
      const s = km * 360
      rows.push(`${w * 3 + d},"${months[date.getUTCMonth() - 5]} ${date.getUTCDate()}, 2026, 7:00:00 AM",Lauf,Run,${s},${km},180,,${s},${s},${km * 1000},60,180,145,84,600`)
    }
  }
  await page.getByTestId('runs-file').setInputFiles({ name: 'a.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n'), 'utf-8') })
  await page.getByTestId('runs-apply').click()
  await expect(page.getByTestId('race-weather')).toBeVisible()
}

test('Bildschirm: ohne Tipp geht nichts ins Netz; mit Tipp nur Ort, Koordinaten, Tag', async ({ page }) => {
  const sent: string[] = []
  await page.route(/open-meteo\.com/, async (route) => {
    sent.push(route.request().url())
    const u = route.request().url()
    const day = /start_date=(\d{4}-\d{2}-\d{2})/.exec(u)?.[1]
    if (u.includes('geocoding')) return route.fulfill({ json: place })
    return route.fulfill({ json: { daily: { time: [day], temperature_2m_max: [14.2], temperature_2m_min: [6.1], wind_speed_10m_max: [5], precipitation_sum: [0.4], precipitation_probability_max: [30] } } })
  })
  await readyDashboard(page)
  await page.getByTestId('weather-place').fill('Berlin')
  await page.getByTestId('weather-day').fill(new Date(Date.now() + 5 * 86_400_000).toLocaleDateString('sv-SE'))
  expect(sent, 'vor dem Tipp darf nichts gesendet sein').toHaveLength(0)
  await page.getByTestId('weather-go').click()
  await expect(page.getByTestId('weather-result')).toContainText('14 °C')
  await expect(page.getByTestId('weather-result')).toContainText('18 km/h')
  expect(sent).toHaveLength(2)
  for (const u of sent) {
    expect(u).not.toMatch(/hr|heart|activity|name=(?!Berlin)/i)
    expect(u.length).toBeLessThan(400)
  }
  await expect(page.getByTestId('race-weather')).toContainText('Open-Meteo.com')
})

test('Bildschirm: Vergangenheit und zu ferner Tag werden benannt, ohne Abruf', async ({ page }) => {
  let calls = 0
  await page.route(/open-meteo\.com/, (r) => { calls++; return r.abort() })
  await readyDashboard(page)
  await page.getByTestId('weather-place').fill('Berlin')
  await page.getByTestId('weather-day').fill('2020-01-01')
  await page.getByTestId('weather-go').click()
  await expect(page.getByTestId('weather-fail')).toContainText('Vergangenheit')
  await page.getByTestId('weather-day').fill(shiftDay(new Date().toLocaleDateString('sv-SE'), 40))
  await page.getByTestId('weather-go').click()
  await expect(page.getByTestId('weather-fail')).toContainText('16 Tage')
  expect(calls).toBe(0)
})

test('Bildschirm: Netzfehler lässt die Auswertung stehen', async ({ page }) => {
  await page.route(/open-meteo\.com/, (r) => r.abort())
  await readyDashboard(page)
  await page.getByTestId('weather-place').fill('Berlin')
  await page.getByTestId('weather-day').fill(new Date(Date.now() + 2 * 86_400_000).toLocaleDateString('sv-SE'))
  await page.getByTestId('weather-go').click()
  await expect(page.getByTestId('weather-fail')).toBeVisible()
  await expect(page.getByTestId('runs-pred')).toBeVisible()
})
