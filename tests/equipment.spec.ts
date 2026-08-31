import { expect, test } from '@playwright/test'
import { TEST_CATALOG } from '../src/data/testCatalog'
import { openGuest } from './helpers'
import {
  EQUIPMENT,
  EQUIPMENT_BY_ID,
  canPerform,
  missingFor,
  type EquipmentId,
} from '../src/data/equipment'

/**
 * Die Ausrüstung stand als Satz da und war damit nicht filterbar. Jetzt
 * steht sie zusätzlich als Kennung. Beides muss dasselbe sagen — sonst
 * bekäme jemand einen Test angeboten, für den ihm etwas fehlt, oder einen
 * vorenthalten, den er durchführen könnte.
 */

test.describe('Ausrüstung', () => {
  test('jeder Test nennt seine Ausrüstung als Kennungen', () => {
    const without = TEST_CATALOG.filter((t) => t.equipmentIds.length === 0).map((t) => t.slug)
    expect(without).toEqual([])
  })

  test('jede Kennung ist eine bekannte Kennung', () => {
    for (const testDef of TEST_CATALOG) {
      for (const group of testDef.equipmentIds) {
        expect(group.length, `${testDef.slug}: leere Gruppe`).toBeGreaterThan(0)
        for (const id of group) {
          expect(EQUIPMENT_BY_ID.has(id), `${testDef.slug}: ${id}`).toBe(true)
        }
      }
    }
  })

  test('was als Kennung steht, steht auch im Text', () => {
    // Die Richtung, die zählt: eine Kennung ohne Entsprechung im Satz wäre
    // eine Anforderung, die dem Athleten niemand erklärt.
    const unexplained: string[] = []
    for (const testDef of TEST_CATALOG) {
      const text = `${testDef.equipment.de} ${testDef.equipment.en}`.toLowerCase()
      for (const id of testDef.equipmentIds.flat()) {
        const item = EQUIPMENT_BY_ID.get(id)!
        if (!item.keywords.some((word) => text.includes(word))) {
          unexplained.push(`${testDef.slug} → ${id} (Text: «${testDef.equipment.de}»)`)
        }
      }
    }
    expect(unexplained).toEqual([])
  })

  test('kein Stück steht zweimal im selben Test', () => {
    for (const testDef of TEST_CATALOG) {
      const flat = testDef.equipmentIds.flat()
      expect(new Set(flat).size, testDef.slug).toBe(flat.length)
    }
  })

  test('ohne Angabe gilt jeder Test als durchführbar', () => {
    const nothing = new Set<EquipmentId>()
    for (const testDef of TEST_CATALOG) {
      expect(canPerform(testDef.equipmentIds, nothing), testDef.slug).toBe(true)
    }
  })

  test('eine Alternative genügt, alle Gruppen sind nötig', () => {
    const groups: EquipmentId[][] = [
      ['track', 'measured_course'],
      ['stopwatch'],
    ]
    expect(canPerform(groups, new Set<EquipmentId>(['track', 'stopwatch']))).toBe(true)
    expect(canPerform(groups, new Set<EquipmentId>(['measured_course', 'stopwatch']))).toBe(true)
    expect(canPerform(groups, new Set<EquipmentId>(['track']))).toBe(false)
    expect(missingFor(groups, new Set<EquipmentId>(['track']))).toEqual([['stopwatch']])
  })

  test('mit Stoppuhr und Strecke bleibt eine sinnvolle Auswahl übrig', () => {
    // Der Fall, um den es geht: jemand hat nichts als eine Uhr und eine
    // vermessene Strecke. Er soll sehen, was er messen kann.
    const owned = new Set<EquipmentId>(['stopwatch', 'measured_course', 'track', 'open_space'])
    const doable = TEST_CATALOG.filter((t) => canPerform(t.equipmentIds, owned))
    expect(doable.length).toBeGreaterThan(3)
    expect(doable.length).toBeLessThan(TEST_CATALOG.length)
    // Und keiner davon verlangt Geräte.
    for (const testDef of doable) {
      expect(testDef.equipmentIds.flat(), testDef.slug).not.toContain('lactate_analyser')
    }
  })

  test('jedes Ausrüstungsstück im Verzeichnis wird von mindestens einem Test gebraucht', () => {
    const used = new Set(TEST_CATALOG.flatMap((t) => t.equipmentIds.flat()))
    const unused = EQUIPMENT.filter((item) => !used.has(item.id)).map((item) => item.id)
    expect(unused).toEqual([])
  })
})

/**
 * Der Filter im Testbereich. Er hält die Zusage «zeig mir, was ich mit dem
 * messen kann, was ich habe» — oder er ist nur eine Liste von Haken.
 */
test.describe('Ausrüstungsfilter im Testbereich', () => {
  test('ohne Auswahl steht der ganze Katalog', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Was ich habe')).toBeVisible()
    await expect(page.getByText('0 von', { exact: false })).toBeVisible()
    await expect(page.getByRole('link', { name: /Cooper/ }).first()).toBeVisible()
  })

  test('mit Stoppuhr und Strecke verschwinden die Gerätetests', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Ausrüstung wählen' }).click()
    await page.getByLabel('Stoppuhr').check()
    await page.getByLabel('Vermessene Strecke').check()

    // Der Cooper-Test braucht genau das — er bleibt.
    await expect(page.getByRole('link', { name: /Cooper/ }).first()).toBeVisible()
    // Der Laktatstufentest braucht ein Labor — er verschwindet.
    await expect(page.getByRole('link', { name: /Laktat/ })).toHaveCount(0)
  })

  test('die Auswahl übersteht einen Neuladen', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Ausrüstung wählen' }).click()
    await page.getByLabel('Stoppuhr').check()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('1 von', { exact: false })).toBeVisible()
  })

  test('die Kerntests der Sportart bleiben stehen und nennen, was fehlt', async ({ page }) => {
    // Wer Judo gewählt hat, soll seine Kernbatterie sehen, auch wenn ihm
    // heute die Matte fehlt — sonst verschwiegen wir ihm seinen eigenen Test.
    await openGuest(page)
    await page.goto('/tests', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /^Judo/ }).click()
    await page.getByRole('button', { name: 'Ausrüstung wählen' }).click()
    await page.getByLabel('Stoppuhr').check()

    await expect(page.getByRole('link', { name: /Special Judo Fitness Test/ }).first()).toBeVisible()
    await expect(page.getByText(/fehlt: /).first()).toBeVisible()
  })
})
