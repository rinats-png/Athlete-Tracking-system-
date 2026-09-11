import { expect, test } from '@playwright/test'
import { missingOperatorFields, OPERATOR, PROCESSORS } from '../src/data/operator'
import { privacyDocument, termsDocument } from '../src/features/legal/texts'
import { openGuest } from './helpers'

/**
 * Die Rechtsseiten.
 *
 * DER FEHLER, GEGEN DEN DIESE FÄLLE STEHEN: bis vor kurzem stand auf der
 * Landeseite «mit dem Fortfahren stimmst du den Nutzungsbedingungen und der
 * Datenschutzerklärung zu» — und es gab weder das eine noch das andere, nicht
 * einmal eine Route dorthin. Eine Zustimmung zu nichts ist rechtlich wertlos
 * und praktisch eine Falschaussage.
 */

test.describe('Die Dokumente sind erreichbar', () => {
  for (const [pfad, titel] of [
    ['/impressum', 'Impressum'],
    ['/datenschutz', 'Datenschutzerklärung'],
    ['/nutzungsbedingungen', 'Nutzungsbedingungen'],
  ] as const) {
    test(`${titel} steht unter ${pfad}`, async ({ page }) => {
      await openGuest(page)
      await page.goto(pfad, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titel)
    })
  }

  test('vom Profil führt ein Weg zu allen dreien', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    for (const name of ['Impressum', 'Datenschutz', 'Nutzungsbedingungen']) {
      await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
    }
  })
})

test.describe('Ein unvollständiges Impressum sagt es', () => {
  test('fehlende Pflichtangaben werden benannt, nicht überspielt', async ({ page }) => {
    // Solange `src/data/operator.ts` leer ist, MUSS die Seite warnen. Ein
    // Impressum, das vollständig aussieht und keines ist, wäre die
    // schlechteste aller Möglichkeiten.
    test.skip(missingOperatorFields().length === 0, 'Betreiberangaben sind hinterlegt')
    await openGuest(page)
    await page.goto('/impressum', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('alert')).toContainText('unvollständig')
    await expect(page.getByText('noch nicht hinterlegt').first()).toBeVisible()
  })

  test('die Pflichtangaben sind die, die das Gesetz verlangt', () => {
    // Name, Anschrift und eine elektronische Kontaktmöglichkeit — § 5 DDG.
    expect(missingOperatorFields({ ...OPERATOR, name: 'X', street: 'Y', city: 'Z', email: 'a@b.c' })).toEqual([])
    expect(missingOperatorFields({ ...OPERATOR, name: 'X' })).toContain('email')
  })
})

test.describe('Die Datenschutzerklärung beschreibt, was der Code tut', () => {
  test('sie nennt beide Auftragsverarbeiter mit Zweck und Ort', async ({ page }) => {
    await openGuest(page)
    await page.goto('/datenschutz', { waitUntil: 'domcontentloaded' })
    for (const processor of PROCESSORS) {
      await expect(page.getByText(processor.name, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText(/eu-central-1/)).toBeVisible()
  })

  test('sie sagt, dass ohne Einschalten nichts übertragen wird', () => {
    const text = privacyDocument('de')
      .sections.flatMap((s) => s.body)
      .join(' ')
    expect(text).toContain('verlässt kein Messwert dein Gerät')
    // Und dass der Export nie hinter einer Bezahlschranke steht (§32).
    expect(text).toContain('nie hinter einer Bezahlschranke')
  })

  test('sie behauptet keine Cookies, weil die App keine setzt', async ({ page }) => {
    const text = privacyDocument('de')
      .sections.flatMap((s) => s.body)
      .join(' ')
    expect(text).toContain('setzt überhaupt keine Cookies')

    await openGuest(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
    const cookies = await page.context().cookies()
    expect(cookies, 'die Zusage muss stimmen').toEqual([])
  })

  test('beide Sprachen sind vollständig', () => {
    for (const doc of [privacyDocument('de'), privacyDocument('en'), termsDocument('de'), termsDocument('en')]) {
      expect(doc.sections.length).toBeGreaterThan(5)
      for (const section of doc.sections) {
        expect(section.heading.length, doc.title).toBeGreaterThan(3)
        expect(section.body.filter(Boolean).length, section.heading).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Die Nutzungsbedingungen halten die Grenzen ein', () => {
  test('sie sagen ausdrücklich, dass KYDON keine Medizin ist (§82)', () => {
    const text = termsDocument('de')
      .sections.flatMap((s) => [s.heading, ...s.body])
      .join(' ')
    expect(text).toContain('Keine medizinische Diagnostik')
    expect(text).toContain('keine Trainingspläne')
  })

  test('sie versprechen keine Genauigkeit, die es nicht gibt (§81)', () => {
    const text = termsDocument('de')
      .sections.flatMap((s) => s.body)
      .join(' ')
    expect(text).toContain('erfindet keine Vergleichswerte')
    expect(text).not.toMatch(/wissenschaftlich validiert|klinisch geprüft/i)
  })
})

test.describe('Die Landeseite verweist auf die Dokumente', () => {
  test('die Zustimmung führt dorthin, wo steht, wozu man zustimmt', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('kydon.locale', 'de')
      localStorage.setItem('kydon.intro', 'off')
      localStorage.setItem(
        'kydon.account.v1',
        JSON.stringify({ name: 'P', email: 'p@x.de', role: 'athlete', planId: null, createdAt: '2026-01-01T00:00:00.000Z' }),
      )
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: 'Nutzungsbedingungen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Datenschutzerklärung' })).toBeVisible()
  })
})
