import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { analyzeHrv, parseHeartRateMeasurement, rmssd, validBeats, type Beat } from '../src/domain/hrv'

/**
 * HRV-Messung mit dem Brustgurt: Paket lesen, Artefakte, RMSSD — und der
 * Ablauf im Bildschirm mit einem simulierten Gurt.
 */

function packet(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer)
}
const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff]
/** RR in ms → Einheit 1/1024 s, wie der Gurt sie schickt. */
const rrUnits = (ms: number) => Math.round((ms / 1000) * 1024)

test.describe('Paket 0x2A37', () => {
  test('8-Bit-Puls mit RR-Intervallen', () => {
    const m = parseHeartRateMeasurement(packet([0x10, 62, ...le16(rrUnits(1000)), ...le16(rrUnits(950))]))
    expect(m.hr).toBe(62)
    expect(m.rr).toEqual([1000, 950])
    expect(m.contact).toBeNull()
  })

  test('16-Bit-Puls, Hautkontakt und Energiefeld werden richtig übersprungen', () => {
    // Flags: 16 Bit (0x01) + Kontakt gemeldet und anliegend (0x06) + Energie (0x08) + RR (0x10)
    const m = parseHeartRateMeasurement(packet([0x1f, ...le16(180), ...le16(500), ...le16(rrUnits(333))]))
    expect(m.hr).toBe(180)
    expect(m.contact).toBe(true)
    expect(m.rr).toEqual([333])
  })

  test('ohne RR-Flag keine Intervalle — nur Puls', () => {
    expect(parseHeartRateMeasurement(packet([0x00, 70])).rr).toEqual([])
  })
})

test.describe('Rechnung', () => {
  test('RMSSD nach Definition', () => {
    // Differenzen 10, −20, 10 → √((100 + 400 + 100) / 3) = √200
    expect(rmssd([800, 810, 790, 800])).toBeCloseTo(Math.sqrt(200), 6)
  })

  test('Artefakte: ausserhalb 300–2000 ms oder mehr als 20 % Sprung', () => {
    expect(validBeats([800, 1300, 810, 250, 820])).toEqual([true, false, true, false, true])
    // Eine Lücke wird nicht überbrückt: nur 800→? und 810→? ohne gültigen Nachbarn.
    expect(rmssd([800, 1300, 810], validBeats([800, 1300, 810]))).toBeNull()
  })

  function series(seconds: number, pattern: (i: number) => number, from = 0): Beat[] {
    const out: Beat[] = []
    let t = from
    for (let i = 0; t < seconds * 1000; i++) {
      const rr = pattern(i)
      t += rr
      out.push({ at: t, rr })
    }
    return out
  }

  test('zwei Minuten: Einschwingen fällt weg, RMSSD und Puls stimmen', () => {
    const r = analyzeHrv(series(120, (i) => (i % 2 ? 1020 : 980)))
    expect(r.rejected).toBeNull()
    expect(r.rmssd.value).toBe(40)
    expect(r.meanHr).toBe(60)
    expect(r.analysisSeconds).toBeGreaterThanOrEqual(88)
    expect(r.analysisSeconds).toBeLessThanOrEqual(91)
    expect(r.artifactPct).toBe(0)
  })

  test('zu kurz oder zu gestört: kein Wert', () => {
    expect(analyzeHrv(series(80, () => 1000)).rejected).toBe('too_short')
    const noisy = analyzeHrv(series(150, (i) => (i % 10 === 0 ? 1500 : 1000)))
    expect(noisy.rejected).toBe('too_many_artifacts')
    expect(noisy.rmssd.value).toBeNull()
  })
})

/** Ein simulierter Gurt: sendet jede Sekunde ein Paket mit einem RR-Intervall. */
const FAKE_STRAP = `
(() => {
  const listeners = new Set()
  const characteristic = {
    value: null,
    addEventListener: (_t, fn) => listeners.add(fn),
    removeEventListener: (_t, fn) => listeners.delete(fn),
    startNotifications: async () => {
      let i = 0
      window.__strapTimer = setInterval(() => {
        const rr = i++ % 2 ? 1020 : 980
        const units = Math.round(rr / 1000 * 1024)
        characteristic.value = new DataView(new Uint8Array([0x16, 60, units & 255, units >> 8]).buffer)
        for (const fn of listeners) fn({ target: characteristic })
      }, 1000)
      return characteristic
    },
    stopNotifications: async () => { clearInterval(window.__strapTimer); return characteristic },
  }
  const server = {
    connected: true,
    getPrimaryService: async () => ({ getCharacteristic: async () => characteristic }),
    disconnect: () => { server.connected = false },
  }
  const device = { name: 'Polar H10 TEST', gatt: { connect: async () => server }, addEventListener() {}, removeEventListener() {} }
  Object.defineProperty(navigator, 'bluetooth', {
    configurable: true,
    value: { getAvailability: async () => true, requestDevice: async () => device },
  })
})()
`

test.describe('Im Bildschirm', () => {
  test('ohne Web Bluetooth: Hinweis statt Knopf, Handeintrag bleibt', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: undefined }))
    await openGuest(page)
    await page.goto('/hrv-messung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('hrv-unsupported')).toBeVisible()
    await expect(page.getByTestId('hrv-straps').locator('[data-strap="polar_h10"]')).toContainText('Polar H10')
  })

  test('mit Gurt: Einwilligung, zwei Minuten messen, speichern, im Verlauf', async ({ page }) => {
    await page.clock.install()
    await page.addInitScript(FAKE_STRAP)
    await openGuest(page)
    await page.goto('/hrv-messung', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Einverstanden' }).click()
    await page.getByRole('button', { name: 'Gurt verbinden und starten' }).click()
    await expect(page.getByTestId('hrv-live')).toBeVisible()
    await expect(page.getByTestId('hrv-live')).toContainText('Einschwingen')

    await page.clock.runFor(125_000)
    const result = page.getByTestId('hrv-result')
    await expect(result).toBeVisible()
    await expect(result).toContainText('40')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await expect(page.getByTestId('hrv-saved')).toBeVisible()

    const raw = await page.evaluate(() => localStorage.getItem('kydon.data.v1'))
    expect(raw).toContain('"key":"hrv_rmssd_ms"')
    expect(raw).toContain('"key":"resting_hr_bpm"')
    expect(raw).toContain('Polar H10 TEST')
    // Die Schlagfolge selbst wird nicht gespeichert.
    expect(raw).not.toContain('"rr"')
  })
})
