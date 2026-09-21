import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { emptyData, parseStoredData, CURRENT_SCHEMA_VERSION } from '../src/lib/store/schema'
import { cockpitSignals, decisionEffect, effectReport, DEFAULT_THRESHOLDS } from '../src/domain/cockpit'
import { DETECTION_FACTOR } from '../src/domain/change'
import type { StoredDecision, StoredDiaryEntry } from '../src/lib/store/localStore'

/**
 * Cockpit und Decision-Log — Schicht S3 aus docs/ausbau.md.
 *
 * Die Signale sind die Regeln aus dem Coach-Cockpit v4 (Schlaf unter
 * Baseline, Adhärenz niedrig …) mit denselben Vorgabewerten. Die Wirkung
 * rechnet Mittel danach gegen Mittel davor, gegen die eigene Schwankung mit
 * DETECTION_FACTOR — derselbe Massstab wie am Testergebnis.
 *
 * Nichts davon ist eine Empfehlung; der letzte Fall sucht danach.
 */

function day(offset: number, from = '2026-03-31'): string {
  return new Date(Date.parse(`${from}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)
}
function entry(d: string, patch: Partial<StoredDiaryEntry> = {}): StoredDiaryEntry {
  return {
    id: `e-${d}`, day: d, weightKg: null, sleepHours: null, sleepQuality: null, energy: null, stress: null, soreness: null,
    steps: null, adherence: null, sessions: [], note: '', createdAt: `${d}T20:00:00.000Z`, updatedAt: `${d}T20:00:00.000Z`, ...patch,
  }
}

test.describe('Signale — die Cockpit-Regeln aus v4', () => {
  test('Schlaf unter Baseline: sieben Tage mehr als 15 % unter achtundzwanzig', () => {
    const diary: StoredDiaryEntry[] = []
    for (let i = -27; i <= 0; i++) diary.push(entry(day(i), { sleepHours: i > -7 ? 6 : 8 }))
    const signals = cockpitSignals(diary, [], DEFAULT_THRESHOLDS, '2026-03-31')
    const sleep = signals.find((s) => s.key === 'sleep_below_baseline')
    expect(sleep).toBeTruthy()
    // Ø7 = 6, Ø28 = (7·6 + 21·8)/28 = 7,5 → −20 %.
    expect(Number(sleep!.values.pct)).toBeCloseTo(20, 1)
  })

  test('ohne Substanz in beiden Fenstern gibt es kein Signal — auch kein «Datenlage dünn»', () => {
    // Ein Tagebuch von zwei Tagen ist nicht dünn, sondern jung.
    const diary = [entry(day(0), { sleepHours: 4 }), entry(day(-1), { sleepHours: 4 })]
    expect(cockpitSignals(diary, [], DEFAULT_THRESHOLDS, '2026-03-31')).toEqual([])
  })

  test('«Datenlage dünn» erst bei einem Tagebuch, das vierzehn Tage alt ist', () => {
    const diary = [entry(day(-20), { sleepHours: 7 }), entry(day(0), { sleepHours: 7 })]
    expect(cockpitSignals(diary, [], DEFAULT_THRESHOLDS, '2026-03-31').map((s) => s.key)).toEqual(['data_thin'])
  })

  test('Adhärenz unter 4 von 5 im Sieben-Tage-Mittel (v4: Compliance unter 80 %)', () => {
    const diary = [-2, -1, 0].map((i) => entry(day(i), { adherence: 3 }))
    const s = cockpitSignals(diary, [], DEFAULT_THRESHOLDS, '2026-03-31')
    expect(s.map((x) => x.key)).toContain('adherence_low')
  })

  test('die Schwelle ist ein Parameter: mit 30 % Schlafabfall schweigt dasselbe Tagebuch', () => {
    const diary: StoredDiaryEntry[] = []
    for (let i = -27; i <= 0; i++) diary.push(entry(day(i), { sleepHours: i > -7 ? 6 : 8 }))
    const s = cockpitSignals(diary, [], { ...DEFAULT_THRESHOLDS, sleepDropPct: 30 }, '2026-03-31')
    expect(s.map((x) => x.key)).not.toContain('sleep_below_baseline')
  })
})

test.describe('Wirkung — Mittel danach gegen Mittel davor, gegen die Schwankung', () => {
  test('innerhalb der Schwankung', () => {
    const before = [7.0, 7.4, 6.8, 7.3, 7.1, 6.9, 7.2]
    const after = [7.2, 7.0, 7.3, 7.1]
    const r = effectReport(before, after)
    expect(r.verdict).toBe('within_noise')
    expect(r.typicalErrorPercent).not.toBeNull()
  })

  test('ausserhalb der Schwankung, mit Richtung — und derselbe Faktor wie am Test', () => {
    const before = [7.0, 7.1, 6.9, 7.0, 7.1, 6.9, 7.0]
    const after = [8.0, 8.1, 7.9, 8.0]
    const r = effectReport(before, after)
    expect(r.verdict).toBe('above_noise_up')
    expect(Math.abs(r.changePercent!)).toBeGreaterThan(r.typicalErrorPercent! * DETECTION_FACTOR)
    expect(effectReport(before, [6.0, 6.1, 5.9]).verdict).toBe('above_noise_down')
  })

  test('unter vier Werten davor oder zwei danach schweigt die Rechnung', () => {
    expect(effectReport([7, 7, 7], [8, 8]).verdict).toBe('insufficient')
    expect(effectReport([7, 7, 7, 7, 7], [8]).verdict).toBe('insufficient')
  })

  test('eine Entscheidung mit Messgrösse bekommt ihre Fenster aus dem Tagebuch', () => {
    const diary: StoredDiaryEntry[] = []
    for (let i = -20; i <= 10; i++) diary.push(entry(day(i), { sleepHours: i < 0 ? 7 : 8 }))
    const d: StoredDecision = {
      id: 'd1', decidedOn: '2026-03-31', trigger: 'sleep_below_baseline', area: 'recovery', observation: '', decision: 'Bildschirm ab 22 Uhr aus',
      rationale: '', expected: '', reviewOn: '2026-04-28', actual: '', status: 'open', metric: { kind: 'diary', key: 'sleepHours' },
      createdAt: '2026-03-31T00:00:00.000Z', updatedAt: '2026-03-31T00:00:00.000Z', reviewedAt: null,
    }
    const r = decisionEffect(d, diary, [], [], '2026-04-10')
    expect(r?.before?.n).toBe(20)
    expect(r?.after?.n).toBe(11)
    // Davor exakt konstant → Streuung 0 → jede Änderung liegt darüber.
    expect(r?.verdict).toBe('above_noise_up')
    // Ohne Messgrösse gibt es keine Rechnung — und das ist erlaubt.
    expect(decisionEffect({ ...d, metric: null }, diary, [], [])).toBeNull()
  })
})

test.describe('Schema', () => {
  test('ein Bestand der Version 21 bekommt ein leeres Log und die v4-Schwellen', () => {
    const old = { ...emptyData(), version: 21 } as any
    delete old.athletes[0].decisions
    delete old.athletes[0].cockpit
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(21)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(data?.athletes[0].decisions).toEqual([])
    expect(data?.athletes[0].cockpit.sleepDropPct).toBe(15)
  })
})

test.describe('Im Bildschirm', () => {
  test('aus einem Signal wird eine Entscheidung, mit vorbelegtem Anlass und Messgrösse', async ({ page }) => {
    await openGuest(page)
    // 28 Tage Tagebuch mit einem Schlafabfall in der letzten Woche.
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      const today = new Date()
      const diary = []
      for (let i = -27; i <= 0; i++) {
        const d = new Date(today.getTime() + i * 86_400_000).toISOString().slice(0, 10)
        diary.push({ id: `e-${d}`, day: d, weightKg: null, sleepHours: i > -7 ? 6 : 8, sleepQuality: null, energy: null, stress: null, soreness: null, steps: null, adherence: null, sessions: [], note: '', createdAt: `${d}T20:00:00.000Z`, updatedAt: `${d}T20:00:00.000Z` })
      }
      store.athletes[0].diary = diary
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.goto('/cockpit', { waitUntil: 'domcontentloaded' })
    const signals = page.getByTestId('cockpit-signals')
    await expect(signals.getByText(/Schlaf: Ø7 6,0 h/)).toBeVisible()
    await signals.getByRole('button', { name: 'Entscheidung festhalten' }).first().click()

    const form = page.getByTestId('decision-form')
    await expect(form.getByRole('radio', { name: 'Schlaf unter Baseline' })).toHaveAttribute('aria-checked', 'true')
    await expect(form.getByLabel('Messgrösse')).toHaveValue('diary:sleepHours')
    await form.getByLabel('Entscheidung', { exact: true }).fill('Bildschirm ab 22 Uhr aus')
    await form.getByRole('radio', { name: 'Erholung' }).click()
    await form.getByRole('button', { name: 'Entscheidung speichern' }).click()

    const card = page.getByTestId('decision').first()
    await expect(card).toContainText('Bildschirm ab 22 Uhr aus')
    await expect(card).toContainText('offen')
    await expect(card.getByTestId('decision-effect')).toContainText(/Werte davor|danach/)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('decision').first()).toContainText('Bildschirm ab 22 Uhr aus')
  })

  test('überprüfen hält die tatsächliche Wirkung fest; verwerfen löscht nicht', async ({ page }) => {
    await openGuest(page)
    await page.goto('/cockpit', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Neue Entscheidung' }).click()
    await page.getByLabel('Entscheidung', { exact: true }).fill('Volumen Brust −20 %')
    await page.getByRole('button', { name: 'Entscheidung speichern' }).click()
    await page.getByRole('button', { name: /^Überprüfen:/ }).click()
    await page.getByLabel('Tatsächliche Wirkung').fill('Schulter ruhig, Bank unverändert')
    await page.getByRole('button', { name: 'Als überprüft ablegen' }).click()
    const card = page.getByTestId('decision').first()
    await expect(card).toContainText('überprüft')
    await expect(card).toContainText('Schulter ruhig, Bank unverändert')

    await page.getByRole('button', { name: 'Neue Entscheidung' }).click()
    await page.getByLabel('Entscheidung', { exact: true }).fill('Testweise Cardio morgens')
    await page.getByRole('button', { name: 'Entscheidung speichern' }).click()
    await page.getByRole('button', { name: /^Verwerfen:/ }).click()
    await expect(page.getByText('Testweise Cardio morgens')).toBeVisible()
    await expect(page.getByTestId('decision')).toHaveCount(2)
  })

  test('die Schwellen sind Regler und bleiben gespeichert', async ({ page }) => {
    await openGuest(page)
    await page.goto('/cockpit', { waitUntil: 'domcontentloaded' })
    const slider = page.getByLabel('Schlaf unter Baseline ab', { exact: false })
    await slider.fill('25')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Schlaf unter Baseline ab', { exact: false })).toHaveValue('25')
  })

  test('nichts wird empfohlen — auch nicht im Signal', async ({ page }) => {
    await openGuest(page)
    await page.goto('/cockpit', { waitUntil: 'domcontentloaded' })
    const text = await page.locator('main').innerText()
    for (const word of ['empfohlen', 'solltest', 'Warnung', 'hat gewirkt', 'erfolgreich', 'zu wenig']) {
      expect(text, `«${word}» wäre eine Empfehlung oder ein Urteil`).not.toContain(word)
    }
  })
})
