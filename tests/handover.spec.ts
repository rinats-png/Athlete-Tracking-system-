import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { exportAthlete, importAthlete, HANDOVER_FORMAT } from '../src/lib/store/handover'
import type { StoredAthlete, StoredData } from '../src/lib/store/localStore'

/**
 * Übergabe eines Athleten.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: wechselt jemand den Verein oder den Trainer,
 * begann er beim neuen bei null. Drei Jahre Messungen waren verloren, obwohl
 * die Datei danebenlag. Die Daten gehören dem Athleten (§32).
 *
 * Der teuerste Fehler wäre, beim Aufnehmen zu ersetzen statt zu ergänzen:
 * dann verlöre der aufnehmende Trainer seine eigenen Athleten. Dafür stehen
 * der zweite und der dritte Fall.
 */

const athlete = (id: string, name: string, results: number): StoredAthlete =>
  ({
    id,
    name,
    profile: { firstName: name },
    biometrics: [],
    assessments: [],
    results: Array.from({ length: results }, (_, i) => ({ id: `${id}-r${i}` })),
    archived: false,
    notes: '',
    focuses: [],
    audit: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  }) as unknown as StoredAthlete

const store = (...list: StoredAthlete[]): StoredData =>
  ({
    version: 15,
    athletes: list,
    activeAthleteId: list[0]?.id ?? '',
    testDays: [],
  }) as unknown as StoredData

test.describe('Übergabedatei', () => {
  test('sie enthält genau einen Athleten und nicht die Marke des Geräts', () => {
    const json = exportAthlete(store(athlete('a', 'Anna', 3), athlete('b', 'Ben', 1)), 'a')
    const parsed = JSON.parse(json ?? '{}')

    expect(parsed.format).toBe(HANDOVER_FORMAT)
    expect(parsed.athlete.id).toBe('a')
    expect(parsed.athlete.results).toHaveLength(3)
    // Die Marke gehört dem Trainer, nicht dem Athleten.
    expect(parsed.branding).toBeUndefined()
    expect(JSON.stringify(parsed)).not.toContain('"Ben"')
  })

  test('das Aufnehmen ergänzt und ersetzt nicht', () => {
    const json = exportAthlete(store(athlete('a', 'Anna', 3)), 'a') as string
    const ziel = store(athlete('x', 'Xenia', 5), athlete('y', 'Yann', 2))

    const outcome = importAthlete(json, ziel)
    expect(outcome.ok).toBe(true)
    expect(outcome.results).toBe(3)
    // Die eigenen Athleten des aufnehmenden Trainers bleiben.
    expect(outcome.data?.athletes.map((a) => a.name)).toEqual(['Xenia', 'Yann', 'Anna'])
  })

  test('bei gleicher Kennung bekommt der Aufgenommene eine neue', () => {
    const json = exportAthlete(store(athlete('a', 'Anna', 3)), 'a') as string
    // Sonst überschriebe die Aufnahme die gesamte Historie des Vorhandenen.
    const outcome = importAthlete(json, store(athlete('a', 'Andere Person', 9)))

    expect(outcome.ok).toBe(true)
    expect(outcome.data?.athletes).toHaveLength(2)
    expect(outcome.athleteId).not.toBe('a')
    expect(outcome.data?.athletes[0].results).toHaveLength(9)
  })

  test('ein vollständiger Export ist keine Übergabedatei', () => {
    // Ein vollständiger Export ERSETZT beim Einlesen den ganzen Bestand.
    // Ihn hier durchzulassen hiesse, dem Trainer seine Athleten zu nehmen.
    const outcome = importAthlete(
      JSON.stringify({ format: 'KYDON_DATA_EXPORT', schemaVersion: 15, data: {} }),
      store(athlete('x', 'Xenia', 1)),
    )
    expect(outcome.ok).toBe(false)
    expect(outcome.error).toBe('unknown_format')
  })

  test('eine Datei aus einer neueren Fassung wird abgewiesen', () => {
    const outcome = importAthlete(
      JSON.stringify({ format: HANDOVER_FORMAT, schemaVersion: 999, athlete: {} }),
      store(athlete('x', 'Xenia', 1)),
    )
    expect(outcome.error).toBe('newer_version')
  })
})

test.describe('Im Bildschirm', () => {
  test('der Trainerbereich bietet Ausgeben und Aufnehmen an', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Trainer' }).click()

    await expect(page.getByRole('button', { name: 'Athlet ausgeben' }).first()).toBeVisible()
    await expect(page.getByText('Athlet aufnehmen')).toBeVisible()
    await expect(page.getByText(/vorhandene Athleten bleiben unverändert/i)).toBeVisible()
  })
})
