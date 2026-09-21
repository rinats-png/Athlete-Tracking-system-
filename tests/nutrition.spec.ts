import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { emptyData, parseStoredData, CURRENT_SCHEMA_VERSION } from '../src/lib/store/schema'
import { bmrMifflin, dayMacros, itemFromCore, kcalFromMacros, microCoverage, observedTdeeFormula, tdeeFromBmr } from '../src/domain/nutrition'
import { fromOffProduct } from '../src/lib/openFoodFacts'
import { CORE_FOODS, coreFoodByKey, searchCoreFoods } from '../src/data/foods'
import type { StoredMeal } from '../src/lib/store/localStore'

/**
 * Ernährung — Schicht S4 aus docs/ausbau.md.
 *
 * Rechnung gegen den Testbericht v4.0.0: Grundumsatz Mifflin-St Jeor
 * 1.892,5 (Makro-Rechner!C11), Gesamtumsatz 3.265 bei PAL 1,725 (C13),
 * beobachteter Umsatz 2.909 (Zielsteuerung!C11), Energie einer Mahlzeit
 * 297,6 (Tag 1!D22), Mikro-Abdeckung (Tag 1!W24).
 *
 * Und die eine Regel: die Referenz ist kein Ziel. Der letzte Fall sucht
 * nach «Ziel», «solltest», «zu wenig» — nichts davon darf auf dem
 * Bildschirm stehen.
 */

function meal(day: string, slot: StoredMeal['slot'], items: [string, number][]): StoredMeal {
  return {
    id: `m-${day}-${slot}`,
    day,
    slot,
    items: items.map(([key, grams], i) => itemFromCore(key, grams, `i-${day}-${slot}-${i}`)!),
    note: '',
    createdAt: `${day}T12:00:00.000Z`,
    updatedAt: `${day}T12:00:00.000Z`,
  }
}

test.describe('Rechnung, geprüft gegen den Testbericht v4.0.0', () => {
  test('Grundumsatz Mifflin-St Jeor: Makro-Rechner!C11 = 1892,5', () => {
    // Testathlet: 90 kg, 182 cm, 30 Jahre, männlich.
    expect(bmrMifflin({ weightKg: 90, heightCm: 182, ageYears: 30, sex: 'male' })).toBeCloseTo(1892.5, 5)
  })

  test('Gesamtumsatz mit PAL 1,725: Makro-Rechner!C13 = 3265', () => {
    expect(tdeeFromBmr(1892.5, 1.725)).toBe(3265)
  })

  test('beobachteter Umsatz: Zielsteuerung!C11 = 2909', () => {
    // Ø Zufuhr 28 Tage 2398,2143 (C7); Gewichtsänderung so, dass 2909 herauskommt.
    const delta = ((2398.2143 - 2909) * 28) / 7700
    expect(observedTdeeFormula(2398.2143, delta, 28)).toBe(2909)
  })

  test('Energie aus Makros: Tag 1!D22 = 297,6', () => {
    // Die Testmahlzeit: 80 g Haferflocken (zart) → 372·0,8 = 297,6 kcal.
    const m = meal('2026-01-05', 'breakfast', [['haferflocken_zart', 80]])
    expect(dayMacros([m], '2026-01-05').kcal).toBeCloseTo(297.6, 5)
    expect(kcalFromMacros({ protein: 10, carbs: 20, fat: 5 })).toBe(165)
  })

  test('ohne Körpergrösse, Alter oder belegte Konstante gibt es keinen Grundumsatz', () => {
    expect(bmrMifflin({ weightKg: 90, heightCm: null, ageYears: 30, sex: 'male' })).toBeNull()
    // Für «other» gibt es keine belegte Konstante — lieber keine Zahl als eine erfundene.
    expect(bmrMifflin({ weightKg: 90, heightCm: 182, ageYears: 30, sex: 'other' })).toBeNull()
  })

  test('Mikro-Abdeckung zählt Positionen mit hinterlegten Mikronährstoffen: Tag 1!W24 = 1', () => {
    const covered = meal('2026-01-05', 'lunch', [['haferflocken_zart', 80], ['linsen_rot_roh', 60]])
    expect(microCoverage([covered], '2026-01-05')).toEqual({ covered: 2, total: 2 })
    const withoutMicro = CORE_FOODS.find((f) => !f.micro)!
    const mixed = meal('2026-01-06', 'lunch', [['haferflocken_zart', 80], [withoutMicro.key, 50]])
    expect(microCoverage([mixed], '2026-01-06')).toEqual({ covered: 1, total: 2 })
  })
})

test.describe('Lebensmittelkern und Open Food Facts', () => {
  test('der Kern trägt 245 Einträge aus v4, 132 davon mit Mikronährstoffen', () => {
    expect(CORE_FOODS.length).toBe(245)
    expect(CORE_FOODS.filter((f) => f.micro).length).toBe(132)
    expect(coreFoodByKey('haferflocken_zart')?.per100.kcal).toBe(372)
  })

  test('die Suche findet über Umlaute hinweg, Wortanfang zuerst', () => {
    expect(searchCoreFoods('hafer')[0].key).toBe('haferflocken_zart')
    expect(searchCoreFoods('suss').some((f) => f.name.startsWith('Süß'))).toBe(true)
  })

  test('ein Produkt von Open Food Facts wird ohne Raten übernommen', () => {
    const f = fromOffProduct({ code: '4000417025005', product_name: 'Skyr', brands: 'Arla, Foo', nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, fat_100g: 0.2, carbohydrates_100g: 4 } })
    expect(f?.name).toBe('Skyr')
    expect(f?.brand).toBe('Arla')
    expect(f?.per100.kcal).toBe(63)
    expect(f?.has.fiber).toBe(false)
    // Ohne Energie und ohne alle drei Makros ist der Eintrag nutzlos — und wird nicht erfunden.
    expect(fromOffProduct({ code: '1', product_name: 'Leer', nutriments: { proteins_100g: 5 } })).toBeNull()
    // Nur kJ vorhanden: umgerechnet, nicht ignoriert.
    expect(fromOffProduct({ code: '2', product_name: 'kJ', nutriments: { energy_100g: 418.4, proteins_100g: 1, fat_100g: 1, carbohydrates_100g: 1 } })?.per100.kcal).toBe(100)
  })
})

test.describe('Schema', () => {
  test('ein Bestand der Version 22 bekommt leere Mahlzeiten und PAL 1,55', () => {
    const old = { ...emptyData(), version: 22 } as any
    delete old.athletes[0].meals
    delete old.athletes[0].nutrition
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(22)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(data?.athletes[0].meals).toEqual([])
    expect(data?.athletes[0].nutrition.pal).toBe(1.55)
  })
})

test.describe('Im Bildschirm', () => {
  test('eine Mahlzeit aus dem Kern: suchen, Gramm antippen, sehen, speichern', async ({ page }) => {
    await openGuest(page)
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: '+ Frühstück' }).click()
    await page.getByLabel('Lebensmittel suchen').fill('hafer')
    await page.getByRole('option', { name: /Haferflocken \(zart\)/ }).click()
    await page.getByRole('button', { name: '50 g' }).click()
    await page.getByLabel('Gramm', { exact: true }).fill('80')
    // 80 g Haferflocken (zart) = 297,6 kcal — Tag 1!D22.
    await expect(page.getByTestId('food-preview')).toContainText('298 kcal')
    await page.getByRole('button', { name: 'Übernehmen' }).click()
    await expect(page.getByTestId('meal-breakfast')).toContainText('Haferflocken (zart)')
    await expect(page.getByTestId('meal-breakfast')).toContainText('80 g · 298 kcal')
    await expect(page.getByTestId('micro-coverage')).toContainText('1 von 1')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('meal-breakfast')).toContainText('Haferflocken (zart)')
  })

  test('Open Food Facts kommt erst auf Tipp, trägt seine Herkunft und scheitert ehrlich', async ({ page }) => {
    await openGuest(page)
    let called = 0
    await page.route('https://world.openfoodfacts.org/**', (route) => {
      called++
      if (called === 1) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: [{ code: '4000417025005', product_name: 'Skyr natur', brands: 'Arla', nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, fat_100g: 0.2, carbohydrates_100g: 4 } }] }) })
      }
      return route.fulfill({ status: 500, body: 'nope' })
    })
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: '+ Snack' }).click()
    await page.getByLabel('Lebensmittel suchen').fill('skyr')
    // Erst der Kern; kein Aufruf nach draussen, bis jemand tippt.
    expect(called).toBe(0)
    await page.getByRole('button', { name: 'Online suchen (Open Food Facts)' }).click()
    await page.getByRole('option', { name: /Skyr natur/ }).click()
    await expect(page.getByTestId('food-picked')).toContainText('Open Food Facts')
    await page.getByRole('button', { name: '200 g' }).click()
    await page.getByRole('button', { name: 'Übernehmen' }).click()
    await expect(page.getByTestId('meal-snack')).toContainText('Skyr natur (Arla)')
    await expect(page.getByTestId('meal-snack')).toContainText('200 g · 126 kcal')
    // Ein Eintrag von dort zählt nicht als mikro-belegt.
    await expect(page.getByTestId('micro-coverage')).toContainText('0 von 1')

    // Der zweite Aufruf scheitert — und die App sagt das, statt zu schweigen.
    await page.getByRole('button', { name: 'Lebensmittel hinzufügen' }).click()
    await page.getByLabel('Lebensmittel suchen').fill('quark')
    await page.getByRole('button', { name: 'Online suchen (Open Food Facts)' }).click()
    await expect(page.getByRole('status')).toContainText('nicht erreichbar')
  })

  test('die Referenz ist kein Ziel', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.athletes[0].profile.heightCm = 182
      store.athletes[0].profile.birthDate = '1996-01-15'
      store.athletes[0].profile.sex = 'male'
      const d = new Date().toISOString().slice(0, 10)
      store.athletes[0].diary = [{ id: 'e', day: d, weightKg: 90, sleepHours: null, sleepQuality: null, energy: null, stress: null, soreness: null, steps: null, adherence: null, sessions: [], note: '', createdAt: `${d}T20:00:00.000Z`, updatedAt: `${d}T20:00:00.000Z` }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    const ref = page.getByTestId('nutrition-reference')
    await expect(ref).toContainText('Mifflin-St Jeor')
    await page.getByRole('radio', { name: 'Sehr aktiv' }).click()
    // 90 kg, 182 cm, 30 Jahre → BMR 1.892,5 → × 1,725 = 3.265 (Makro-Rechner!C13).
    await expect(ref).toContainText('3.265')
    const text = await page.locator('main').innerText()
    for (const word of ['Ziel:', 'Tagesziel', 'solltest', 'zu wenig', 'zu viel', 'empfohlen', 'iss ']) {
      expect(text, `«${word}» wäre eine Vorgabe`).not.toContain(word)
    }
    await expect(ref).toContainText('kein Ziel')
  })
})
