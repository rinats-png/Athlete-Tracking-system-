import { expect, test } from '@playwright/test'
import { buildDemoData } from '../src/data/demoSeed'
import { parseStoredData } from '../src/lib/store/schema'
import { openGuest } from './helpers'

/**
 * Rettung beim Laden (Umbauplan Sprint 0, Punkt 1).
 *
 * Ein einziger beschädigter Eintrag durfte bisher den halben Bestand kosten:
 * scheiterte die Prüfung des Ganzen, kamen je Athlet nur Profil, Körperwerte,
 * Testtermine und Ergebnisse zurück — Tagebuch, Trainingsblöcke, Gesundheit,
 * Notizen und Testtage fielen still auf ihre Vorgabe. Diese Fälle halten fest,
 * dass jetzt genau der kaputte Eintrag fehlt und sonst nichts, und dass er
 * mit Rohwert aufbewahrt wird.
 */

const deep = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** Ein voller, gültiger Bestand mit Einträgen in möglichst vielen Bereichen. */
function fullStore() {
  const store = deep(buildDemoData())
  const a = store.athletes[0] as Record<string, unknown> & typeof store.athletes[0]
  a.notes = 'Knie links beachten'
  a.archived = false
  a.diaryFields = a.diaryFields.length ? a.diaryFields : []
  a.consent = { grantedAt: '2026-01-01T00:00:00.000Z', grantedBy: 'selbst', forMinor: false, withdrawnAt: null }
  return store
}

test.describe('Rettung je Bereich', () => {
  test('der Demobestand ist als Ganzes gültig (Ausgangslage der übrigen Fälle)', () => {
    const { data, report } = parseStoredData(fullStore())
    expect(data).not.toBeNull()
    expect(report.rejected).toEqual([])
    expect(report.quarantine).toEqual([])
  })

  test('ein kaputter Tagebucheintrag kostet genau diesen Eintrag — nicht Blöcke, Notizen, Gesundheit', () => {
    const store = fullStore()
    const reference = parseStoredData(deep(store)).data!
    const a = store.athletes[0] as unknown as Record<string, unknown[]>
    expect(a.diary.length, 'Demobestand braucht Tagebucheinträge').toBeGreaterThan(1)
    const broken = { id: 'kaputt', day: 'kein Datum' }
    a.diary = [...a.diary, broken]

    const { data, report } = parseStoredData(store)
    expect(data).not.toBeNull()
    const got = data!.athletes[0]
    const want = reference.athletes[0]
    // Alles außer dem kaputten Eintrag ist unverändert da.
    for (const key of Object.keys(want) as (keyof typeof want)[]) {
      expect(got[key], `Bereich ${String(key)}`).toEqual(want[key])
    }
    expect(data!.testDays).toEqual(reference.testDays)
    expect(data!.branding).toEqual(reference.branding)
    expect(data!.role).toEqual(reference.role)

    expect(report.rejected).toHaveLength(1)
    expect(report.rejected[0].kind).toBe('diary')
    expect(report.rejected[0].id).toContain('kaputt')
    expect(report.quarantine[0].raw, 'der Rohwert bleibt erhalten').toEqual(broken)
  })

  test('verschachtelt: ein kaputter Laborwert lässt die übrige Gesundheitsschicht stehen', () => {
    const store = fullStore()
    const a = store.athletes[0]
    a.notes = 'bleibt'
    ;(a.health as unknown as Record<string, unknown>).labs = [{ id: 'lab-x', value: 'nicht lesbar' }]
    ;(a.health as unknown as Record<string, unknown>).trainingKcalPerDay = 420
    const { data, report } = parseStoredData(store)
    expect(data!.athletes[0].health.trainingKcalPerDay).toBe(420)
    expect(data!.athletes[0].health.labs).toEqual([])
    expect(data!.athletes[0].notes).toBe('bleibt')
    expect(report.rejected.map((r) => r.kind)).toEqual(['health.labs'])
  })

  test('ein kaputter Testtag kostet nur diesen; ein unbrauchbares Feld fällt auf seine Vorgabe', () => {
    const store = fullStore() as unknown as Record<string, unknown>
    store.testDays = [{ id: 'td-x' }]
    ;(store.athletes as Record<string, unknown>[])[0].notes = 42
    const { data, report } = parseStoredData(store)
    expect(data!.testDays).toEqual([])
    expect(data!.athletes[0].notes).toBe('')
    expect(report.rejected.map((r) => r.kind).sort()).toEqual(['notes', 'testDays'])
    expect(report.quarantine.find((q) => q.kind === 'notes')!.raw).toBe(42)
  })

  test('ein zu langer Name wird gekürzt, nicht verworfen', () => {
    const store = fullStore()
    store.athletes[0].name = 'x'.repeat(200)
    ;(store.athletes[0] as unknown as Record<string, unknown>).notes = 7
    const { data } = parseStoredData(store)
    expect(data!.athletes[0].name).toHaveLength(120)
  })
})

test.describe('Quarantäne auf dem Gerät', () => {
  test('abgewiesene Einträge landen beim Laden in der Quarantäne, einmal — und die Meldung sagt es', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].notes = 'bleibt'
      d.athletes[0].diary = [{ id: 'kaputt', day: 'kein Datum' }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
      localStorage.removeItem('kydon.quarantine.v1')
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    const notice = page.getByTestId('rejected-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Tagebuch')
    await expect(notice).toContainText('aufbewahrt')
    await expect(page.getByTestId('backup-state')).toBeVisible()

    // Zweiter Start ohne Speichern: derselbe Eintrag scheitert wieder, wird aber nicht doppelt abgelegt.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('rejected-notice')).toBeVisible()
    const q = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.quarantine.v1') ?? '[]'))
    expect(q).toHaveLength(1)
    expect(q[0].kind).toBe('diary')
    expect(q[0].raw).toEqual({ id: 'kaputt', day: 'kein Datum' })

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Nicht lesbare Einträge als Datei sichern' }).click()
    expect((await download).suggestedFilename()).toMatch(/^kydon-quarantaene-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('ein unlesbarer Speicher (kein JSON) wird als Rohtext aufbewahrt', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      localStorage.removeItem('kydon.quarantine.v1')
      localStorage.setItem('kydon.data.v1', '{"version": 42, kaputt')
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    const q = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.quarantine.v1') ?? '[]'))
    expect(q).toHaveLength(1)
    expect(q[0].kind).toBe('file')
    expect(q[0].raw).toBe('{"version": 42, kaputt')
  })
})

test.describe('Bestand aus einer neueren Fassung', () => {
  test('wird nicht überschrieben — weder vom Speichern noch von der Zweitschrift — und die Meldung sagt, was zu tun ist', async ({ page }) => {
    await openGuest(page)
    const newer = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.version = 999
      d.athletes[0].unbekanntesFeld = 'aus der Zukunft'
      const text = JSON.stringify(d)
      localStorage.setItem('kydon.data.v1', text)
      return text
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    const notice = page.getByTestId('newer-version-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Neuere KYDON-Version erkannt')
    await expect(notice).toContainText('nicht gespeichert')
    await expect(notice.getByRole('button', { name: 'App neu laden' })).toBeVisible()

    // Etwas tun, das sonst speichern würde: Einstellungen öffnen, Sprache ist
    // gerätelokal — der Bestand selbst muss unverändert bleiben.
    await page.goto('/mehr', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const after = await page.evaluate(() => localStorage.getItem('kydon.data.v1'))
    expect(after, 'der neuere Bestand bleibt Zeichen für Zeichen erhalten').toBe(newer)
  })
})
