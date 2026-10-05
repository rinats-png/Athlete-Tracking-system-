import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { parseHeartRate, plausibleHr, summarizeHr, zoneStatus } from '../src/domain/liveHr'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/** Trainingsbereich Etappe 9: Live-Puls im Player. */

test.describe('Live-Puls: Fachlogik', () => {
  test('Bluetooth-Paket: 8 und 16 Bit, zu kurz und unplausibel gibt null', () => {
    expect(parseHeartRate([0x00, 142])).toBe(142)
    expect(parseHeartRate([0x01, 0x2c, 0x01])).toBeNull() // 300
    expect(parseHeartRate([0x01, 150, 0])).toBe(150)
    expect(parseHeartRate([0x00])).toBeNull()
    expect(parseHeartRate([0x01, 150])).toBeNull()
    expect(parseHeartRate([0x00, 10])).toBeNull()
  })
  test('Zielbereich nur mit glaubwürdiger HFmax; Grenzen zählen als im Bereich', () => {
    const t = { min: 90, max: 95 }
    expect(zoneStatus(171, 190, t)).toBe('in') // 90 %
    expect(zoneStatus(170, 190, t)).toBe('below')
    expect(zoneStatus(181, 190, t)).toBe('above') // 95,3 %
  })
  test('ohne HFmax oder ohne Ziel keine Einordnung; Zusammenfassung erst ab drei Werten', () => {
    expect(zoneStatus(150, null, { min: 90, max: 95 })).toBeNull()
    expect(zoneStatus(150, 190, null)).toBeNull()
    expect(zoneStatus(150, 500, { min: 90, max: 95 })).toBeNull()
    expect(summarizeHr([140, 150])).toBeNull()
    expect(summarizeHr([140, 150, 160, 999])).toEqual({ avg: 150, max: 160, samples: 3 })
    expect(plausibleHr(30)).toBe(true)
    expect(plausibleHr(231)).toBe(false)
  })
  test('Schema 37: erledigte Einheiten bekommen Puls leer', () => {
    const old = emptyData() as any
    old.version = 36
    old.athletes[0].trainingBlocks = [{ id: 'b', name: '', family: 'hybrid', disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 2, retestMetrics: [], templateId: null, eventDay: null, sessions: [], completions: [{ sessionId: 's', day: '2026-10-05', durationMin: 30, rpe: 6, diarySessionId: null }], status: 'active', createdAt: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-05T00:00:00.000Z' }]
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(36)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(37)
    expect(data!.athletes[0].trainingBlocks[0].completions[0]).toMatchObject({ avgHr: null, maxHr: null })
  })
})

const seed = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    const now = new Date().toISOString()
    const today = new Date()
    const wd = ((today.getUTCDay() + 6) % 7) + 1
    const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
    data.athletes[0].profile.maxHr = 190
    data.athletes[0].trainingBlocks = [{ id: 'b', name: '', family: 'combat_grappling', disciplineId: 'judo', phase: 'BUILD', startDay: monday, weeks: 6, retestMetrics: [], templateId: null, eventDay: null, completions: [], status: 'active', createdAt: now, updatedAt: now,
      sessions: [{ id: 's1', day: wd, weekFrom: 1, weekTo: null, kind: 'rule', title: '', note: '', ruleId: 'vo2_4x4', ruleVersion: '1.0.0', primaryIntent: 'VO2MAX', evidenceStrength: 'HIGH', evidenceSpecificity: 'EXTRAPOLATED', plannedDurationMin: 25, highIntensity: true, blocks: [{ type: 'interval', modality: 'mixed', repetitions: 4, workSeconds: 240, recoverySeconds: 180, intensity: { type: 'hr_percent_max', min: 90, max: 95 } }], retestMetric: 'countermovement_jump', coachModified: false, coachModificationReason: null, removed: false }] }]
    localStorage.setItem('kydon.data.v1', JSON.stringify(data))
  })

test.describe('Live-Puls: Bildschirm', () => {
  test('ohne Web Bluetooth: Hinweis und Handeingabe, Zielbereich gegen die Regel, Abschluss speichert Mittel und Höchstwert', async ({ page }) => {
    await openDemo(page)
    await seed(page)
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('live-hr')).toBeVisible()
    // Handeingabe zählt erst, wenn die Uhr läuft.
    await page.getByTestId('player-toggle').click()
    for (const v of ['160', '175', '172']) {
      await page.getByTestId('hr-manual').fill(v)
      await page.getByTestId('hr-manual-add').click()
    }
    await expect(page.getByTestId('hr-bpm')).toHaveText('172')
    await expect(page.getByTestId('hr-zone')).toContainText('Im Zielbereich')
    await page.getByTestId('hr-manual').fill('150')
    await page.getByTestId('hr-manual-add').click()
    await expect(page.getByTestId('hr-zone')).toContainText('Unter dem Ziel')
    await page.getByTestId('hr-manual').fill('400')
    await page.getByTestId('hr-manual-add').click()
    await expect(page.getByTestId('hr-error')).toContainText('30 bis 230')
    await page.getByTestId('player-rpe-8').click()
    await page.getByTestId('player-done').click()
    await expect(page).toHaveURL(/\/plan\/block/)
    const c = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].trainingBlocks[0].completions[0])
    expect(c).toMatchObject({ avgHr: 164, maxHr: 175 })
  })

  test('mit Pulsgurt (nachgebildet): Verbindung zeigt Werte und Zielbereich', async ({ page }) => {
    await page.addInitScript(() => {
      const listeners: Record<string, ((e: unknown) => void)[]> = {}
      const ch = {
        startNotifications: async () => {
          setTimeout(() => (listeners.characteristicvaluechanged ?? []).forEach((f) => f({ target: { value: new DataView(new Uint8Array([0x00, 172]).buffer) } })), 50)
          return ch
        },
        addEventListener: (t: string, f: (e: unknown) => void) => ((listeners[t] ??= []).push(f)),
        removeEventListener: () => {},
      }
      Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => ({ name: 'Testgurt', addEventListener: () => {}, gatt: { connect: async () => ({ disconnect: () => {}, getPrimaryService: async () => ({ getCharacteristic: async () => ch }) }) } }) }, configurable: true })
    })
    await openDemo(page)
    await seed(page)
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('hr-connect').click()
    await expect(page.getByTestId('live-hr')).toContainText('Testgurt')
    await expect(page.getByTestId('hr-bpm')).toHaveText('172')
    await expect(page.getByTestId('hr-zone')).toContainText('Im Zielbereich')
  })
})
