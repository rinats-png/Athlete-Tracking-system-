import { expect, test } from '@playwright/test'
import { emptyData } from '../src/lib/store/schema'
import {
  DAYS_UNTIL_REMINDER,
  RESULTS_UNTIL_REMINDER,
  backupReminder,
} from '../src/domain/backupReminder'
import { isSupabaseConfigured, supabaseConfig } from '../src/lib/supabase/client'
import type { StoredData, StoredResult } from '../src/lib/store/localStore'
import { openGuest } from './helpers'

/**
 * Datenverlust ist der eine Fehler, den ein Nutzer nicht selbst reparieren
 * kann. Diese Fälle halten die drei Vorkehrungen dagegen fest: die
 * Zweitschrift in IndexedDB, die Erinnerung an den Export und die Regel, dass
 * ein fehlendes Supabase-Projekt nichts kaputt macht.
 */

function storeWith(count: number, performedAt: string): StoredData {
  const store = emptyData()
  store.athletes[0].results = Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    testSlug: 'cooper_12min',
    performedAt,
    values: {},
    derivedMetrics: {},
    score: null,
    assessmentId: null,
    attempts: [],
    attemptSelection: 'best',
    context: null,
    readiness: null,
    note: '',
    equipmentUsed: [],
    sex: null,
    createdAt: performedAt,
  })) as unknown as StoredResult[]
  return store
}

const TAG = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

test.describe('Erinnerung an die Sicherung', () => {
  test('ohne Messungen wird nicht erinnert — es gäbe nichts zu sichern', () => {
    expect(backupReminder(emptyData()).due).toBe(false)
  })

  test('wenige Messungen ohne Export lösen noch keine Erinnerung aus', () => {
    const reminder = backupReminder(storeWith(RESULTS_UNTIL_REMINDER - 1, TAG(1)))
    expect(reminder.due, 'sonst nervt die App ab dem ersten Test').toBe(false)
  })

  test('genug ungesicherte Messungen lösen sie aus, mit Grund', () => {
    const reminder = backupReminder(storeWith(RESULTS_UNTIL_REMINDER, TAG(1)))
    expect(reminder.due).toBe(true)
    expect(reminder.reason).toBe('never_exported')
    expect(reminder.unsavedResults).toBe(RESULTS_UNTIL_REMINDER)
  })

  test('nach einem Export zählt nur, was danach dazugekommen ist', () => {
    const store = storeWith(RESULTS_UNTIL_REMINDER, TAG(10))
    store.lastExportAt = TAG(5)
    const reminder = backupReminder(store)
    expect(reminder.due, 'alles Gemessene liegt vor dem Export').toBe(false)
    expect(reminder.unsavedResults).toBe(0)
  })

  test('ein lange zurückliegender Export erinnert nur, wenn seither gemessen wurde', () => {
    const alt = storeWith(1, TAG(1))
    alt.lastExportAt = TAG(DAYS_UNTIL_REMINDER + 5)
    expect(backupReminder(alt).reason).toBe('long_ago')

    const ohneNeues = storeWith(1, TAG(DAYS_UNTIL_REMINDER + 10))
    ohneNeues.lastExportAt = TAG(DAYS_UNTIL_REMINDER + 5)
    expect(backupReminder(ohneNeues).due, 'nichts Neues, nichts zu sichern').toBe(false)
  })

  test('ein unbrauchbares Exportdatum wird behandelt, als gäbe es keins', () => {
    const store = storeWith(RESULTS_UNTIL_REMINDER, TAG(1))
    ;(store as { lastExportAt: string | null }).lastExportAt = 'kein Datum'
    expect(backupReminder(store).reason).toBe('never_exported')
  })
})

test.describe('Supabase bleibt freiwillig', () => {
  test('ohne gesetzte Adresse gibt es keinen Client und keinen Fehler', () => {
    // Die Prüfung darf nie werfen — genau das ist die Zusage.
    expect(() => isSupabaseConfigured()).not.toThrow()
    const config = supabaseConfig()
    if (config) {
      expect(config.url.startsWith('https://'), 'nur über TLS').toBe(true)
      expect(config.publishableKey.length).toBeGreaterThan(10)
      expect(config.publishableKey.includes('service_role'), 'niemals der Service-Key').toBe(false)
    }
  })
})

test.describe('Zweitschrift auf dem Gerät', () => {
  test('ein Schreibvorgang landet auch in IndexedDB', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/Vorname/).fill('Mara')
    await page.getByLabel(/Vorname/).blur()
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            new Promise<string | null>((resolve) => {
              const open = indexedDB.open('baseline', 1)
              open.onsuccess = () => {
                const db = open.result
                const get = db.transaction('snapshots', 'readonly').objectStore('snapshots').get('current')
                get.onsuccess = () => {
                  const record = get.result as { data?: { athletes?: { profile?: { firstName?: string } }[] } }
                  resolve(record?.data?.athletes?.[0]?.profile?.firstName ?? null)
                }
                get.onerror = () => resolve(null)
              }
              open.onerror = () => resolve(null)
            }),
        ),
      )
      .toBe('Mara')
  })

  test('nach einer Räumung des Gerätespeichers kommt der Bestand zurück', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/Vorname/).fill('Jonas')
    await page.getByLabel(/Vorname/).blur()
    await page.waitForTimeout(300)

    // Genau das, was ein Browser unter Speicherdruck tut: localStorage weg,
    // IndexedDB bleibt.
    await page.evaluate(() => localStorage.removeItem('baseline.data.v1'))
    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(page.getByLabel(/Vorname/)).toHaveValue('Jonas')
  })
})
