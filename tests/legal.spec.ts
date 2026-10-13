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

  test('sie sagt, dass der Abgleich automatisch läuft und abschaltbar ist', () => {
    const text = privacyDocument('de')
      .sections.flatMap((s) => s.body)
      .join(' ')
    // Seit 13.10.2026: Konto Pflicht, Abgleich von selbst. Die alte Zusage
    // («nichts verlässt das Gerät, bis du einschaltest») darf nicht mehr stehen.
    expect(text).not.toContain('verlässt kein Messwert dein Gerät')
    expect(text).toContain('gleicht die App deine Daten von selbst ab')
    expect(text).toContain('Den Abgleich kannst du im Profil ausschalten')
    expect(text).toContain('Art. 6 Abs. 1 lit. b DSGVO — der Abgleich ist Teil des Dienstes')
    expect(text).toContain('Die Demo mit Beispieldaten wird nie abgeglichen')
    expect(privacyDocument('en').sections.flatMap((s) => s.body).join(' ')).toContain('You can turn sync off in your profile')
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
    // Pläne gibt es, aber nur aus Regeln — und die Entscheidung bleibt beim Menschen.
    expect(text).toContain('Kein Ersatz für Trainer, Ärztin oder Arzt')
    expect(text).toContain('entscheidest du oder dein Trainer')
    expect(text).toContain('Für die Nutzung brauchst du ein Konto')
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
    // Kein Fall spricht den echten Dienst an (siehe helpers.ts, offlineServer).
    await page.context().route('**/*.supabase.co/**', (route) => route.abort())
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('kydon.locale', 'de')
      localStorage.setItem('kydon.intro', 'off')
      localStorage.setItem(
        'kydon.account.v1',
        JSON.stringify({ name: 'P', email: 'p@x.de', role: 'athlete', planId: null, createdAt: '2026-01-01T00:00:00.000Z' }),
      )
      localStorage.setItem('kydon.auth', JSON.stringify({ access_token: 'stub', refresh_token: 'stub', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '00000000-0000-4000-8000-000000000001', email: 'pruef@baseline.test' } }))
      localStorage.setItem('kydon.sync.enabled', 'off')
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: 'Nutzungsbedingungen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Datenschutzerklärung' })).toBeVisible()
  })
})
