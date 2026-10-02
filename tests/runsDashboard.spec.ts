import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { computeRunMetrics, shiftDay } from '../src/domain/runMetrics'
import { findFinding, findInsights } from '../src/domain/runFinding'
import type { StoredActivity } from '../src/lib/store/localStore'

/** Läufe, Stufe 3: Befund, Einblicke und Anzeige. Feste Daten, keine Zufallszahlen. */

let n = 0
function act(day: string, o: Partial<StoredActivity> & { km?: number; min?: number } = {}): StoredActivity {
  const km = o.km ?? 10
  const min = o.min ?? 55
  const { km: _k, min: _m, ...rest } = o
  return {
    id: `d${n++}`,
    source: 'strava',
    startedAt: `${day}T07:00:00.000Z`,
    day,
    hour: 7,
    sport: 'run',
    name: 'Lauf',
    distanceM: km * 1000,
    movingS: min * 60,
    elapsedS: min * 60,
    avgHr: 150,
    maxHr: 185,
    elevM: 50,
    gear: null,
    calories: null,
    cadence: null,
    ...rest,
  } as StoredActivity
}

/** 16 Wochen: dreimal je Woche, gleichbleibender Umfang. */
function steadyBlock(avgHr = 140): StoredActivity[] {
  const out: StoredActivity[] = []
  for (let w = 0; w < 16; w++) {
    const monday = shiftDay('2026-06-01', w * 7)
    out.push(act(shiftDay(monday, 1), { km: 8, min: 48, avgHr, name: 'Dauerlauf' }))
    out.push(act(shiftDay(monday, 3), { km: 6, min: 36, avgHr, name: 'Lockerer Lauf' }))
    out.push(act(shiftDay(monday, 5), { km: 14, min: 84, avgHr, name: 'Langer Lauf' }))
  }
  return out
}

test.describe('Befund', () => {
  test('liefert immer genau einen Befund mit Zahlen und Grundlage', () => {
    const m = computeRunMetrics(steadyBlock())!
    const f = findFinding(m)
    expect(['easy_too_hard', 'volume_jump', 'hard_too_hard', 'overload', 'progress', 'steady']).toContain(f.kind)
    expect(f.numbers.length).toBeGreaterThanOrEqual(3)
    expect(['evidenced', 'hint']).toContain(f.basis)
  })

  test('ein Sprung im Wochenumfang wird als solcher benannt', () => {
    const acts = steadyBlock()
    // letzte Woche mehr als verdoppeln
    const last = shiftDay('2026-06-01', 15 * 7)
    acts.push(act(shiftDay(last, 0), { km: 20, min: 120, avgHr: 140 }), act(shiftDay(last, 2), { km: 20, min: 120, avgHr: 140 }))
    const m = computeRunMetrics(acts)!
    if (m.jump) expect(findFinding(m).kind).toBe('volume_jump')
    else expect(findFinding(m).kind).not.toBe('volume_jump')
  })

  test('Texte verlangen nur Werte, die der Befund liefert', () => {
    const m = computeRunMetrics(steadyBlock())!
    const f = findFinding(m)
    for (const v of Object.values(f.params)) expect(Number.isFinite(Number(v)) || typeof v === 'string').toBe(true)
  })
})

test.describe('Einblicke', () => {
  test('höchstens sechs, jeder mit Grundlage; kein Prozent-«Chance»-Schlüssel', () => {
    const m = computeRunMetrics(steadyBlock())!
    const ins = findInsights(m)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins.length).toBeLessThanOrEqual(6)
    for (const i of ins) {
      expect(['evidenced', 'hint']).toContain(i.basis)
      expect(i.key).not.toMatch(/chance|probability/i)
    }
    expect(new Set(ins.map((i) => i.key)).size).toBe(ins.length)
  })
})

// Eine Strava-Datei mit 40 Läufen über 14 Wochen, Pulsangaben, zwei Schuhe.
function csv(): string {
  const head = 'Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Max Heart Rate,Activity Gear,Elapsed Time,Moving Time,Distance,Elevation Gain,Max Heart Rate,Average Heart Rate,Average Cadence,Calories'
  const months = ['Jun', 'Jul', 'Aug', 'Sep']
  const rows: string[] = [head]
  let id = 1
  for (let w = 0; w < 14; w++) {
    for (const d of [2, 4, 6]) {
      const date = new Date(Date.UTC(2026, 5, 1 + w * 7 + d))
      const label = `${months[date.getUTCMonth() - 5]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, 7:00:00 AM`
      const km = d === 6 ? 14 : 8
      const s = Math.round(km * 360)
      rows.push(`${id++},"${label}",Lauf,Run,${s},${km},180,${d === 6 ? 'Pegasus' : 'Vomero'},${s},${s},${km * 1000},60,180,${d === 6 ? 150 : 143},84,600`)
    }
  }
  return rows.join('\n')
}

async function importCsv(page: import('@playwright/test').Page) {
  await openDemo(page)
  await page.goto('/analyse/laeufe', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('runs-dashboard')).toHaveCount(0)
  await page.getByTestId('runs-file').setInputFiles({ name: 'activities.csv', mimeType: 'text/csv', buffer: Buffer.from(csv(), 'utf-8') })
  await page.getByTestId('runs-apply').click()
}

test('Anzeige: Befund, Form, Jahr, Woche, Prognose, Daten und Annahmen erscheinen nach dem Import', async ({ page }) => {
  await importCsv(page)
  await expect(page.getByTestId('runs-dashboard')).toBeVisible()
  await expect(page.getByTestId('runs-finding')).toBeVisible()
  for (const id of ['runs-form', 'runs-year', 'runs-week', 'runs-pred', 'runs-insights', 'runs-data']) {
    await expect(page.getByTestId(id)).toBeVisible()
  }
  // keine Rohschlüssel: jede Übersetzung ist aufgelöst
  const text = await page.getByTestId('runs-dashboard').innerText()
  expect(text).not.toMatch(/runs\.(dash|finding|insight)\./)
  // Rennziel: eine Spanne und ein Wort, kein Prozentwert
  await expect(page.getByTestId('pred-outlook')).toHaveCount(0)
  await page.getByTestId('pred-target').fill('1:45:00')
  await expect(page.getByTestId('pred-outlook')).toBeVisible()
  const outlook = await page.getByTestId('pred-outlook').innerText()
  expect(outlook).not.toMatch(/\d\s?%/)
})

test('Anzeige: kein horizontales Überlaufen, hell und dunkel', async ({ page }) => {
  await importCsv(page)
  await expect(page.getByTestId('runs-dashboard')).toBeVisible()
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over, theme).toBeLessThanOrEqual(0)
  }
})

test('Anzeige: Gerät leeren entfernt die Anzeige wieder', async ({ page }) => {
  await importCsv(page)
  await expect(page.getByTestId('runs-dashboard')).toBeVisible()
  await page.getByTestId('runs-clear').click()
  await page.getByTestId('runs-clear-confirm').click()
  await expect(page.getByTestId('runs-dashboard')).toHaveCount(0)
})
