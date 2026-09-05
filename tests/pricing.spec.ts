import { expect, test } from '@playwright/test'
import {
  COACH_TIERS,
  INSTITUTION_PROFILES,
  REPORT_BUNDLES,
  buildEnquiryText,
  coachTierFor,
  perAthleteEur,
  pricePerReportEur,
  savingPercent,
} from '../src/data/pricing'
import { openGuest } from './helpers'

/**
 * Preise.
 *
 * Drei Fehler wären hier teuer: eine Seite, die nach einem Kauf aussieht,
 * obwohl nichts abgerechnet werden kann; eine Stufe, die den Export der
 * eigenen Daten hinter eine Bezahlschranke stellt (§32); und ein Kontingent,
 * das sich gegenüber dem Einzelkauf nicht lohnt — dann wäre die Staffel eine
 * Zahlenreihe ohne Aussage.
 */

test.describe('Report-Kontingente', () => {
  test('die Zahlen stehen so, wie sie vereinbart sind', () => {
    expect(REPORT_BUNDLES.map((b) => [b.reports, b.priceEur])).toEqual([
      [1, 29.9],
      [4, 89],
      [10, 179],
    ])
  })

  test('jedes grössere Kontingent ist je Report günstiger als das kleinere', () => {
    // Sonst wäre die Staffel eine Zumutung: mehr kaufen, mehr zahlen.
    for (let i = 1; i < REPORT_BUNDLES.length; i++) {
      expect(pricePerReportEur(REPORT_BUNDLES[i])).toBeLessThan(
        pricePerReportEur(REPORT_BUNDLES[i - 1]),
      )
    }
    expect(savingPercent(REPORT_BUNDLES[0])).toBe(0)
    expect(savingPercent(REPORT_BUNDLES[1])).toBe(26)
    expect(savingPercent(REPORT_BUNDLES[2])).toBe(40)
  })

  test('vier Reports im Jahr kosten weniger als das frühere Jahresabo', () => {
    // Der Grund, warum das Abo weggefallen ist: bei 149,90 € im Jahr lag der
    // Bruchpunkt jenseits jeder realistischen Nutzung.
    expect(REPORT_BUNDLES[1].priceEur).toBeLessThan(149.9)
  })
})

test.describe('Trainerstufen', () => {
  test('der Preis je Platz sinkt mit der Grösse', () => {
    for (let i = 1; i < COACH_TIERS.length; i++) {
      expect(perAthleteEur(COACH_TIERS[i])).toBeLessThan(perAthleteEur(COACH_TIERS[i - 1]))
    }
  })

  test('ein Platz ist billiger, als der Athlet selbst zahlen würde', () => {
    // Der Anreiz, Athleten in die Betreuung zu nehmen, statt sie einzeln
    // kaufen zu lassen. Verglichen wird ein Jahr Platz gegen vier Reports.
    const jahrProPlatz = perAthleteEur(COACH_TIERS[0]) * 12
    expect(jahrProPlatz).toBeLessThan(REPORT_BUNDLES[1].priceEur)
  })

  test('oberhalb der Stufen wird kein Preis hochgerechnet', () => {
    expect(coachTierFor(8)!.id).toBe('coach_s')
    expect(coachTierFor(9)!.id).toBe('coach_m')
    expect(coachTierFor(50)!.id).toBe('coach_l')
    expect(coachTierFor(51)).toBeNull()
  })
})

test.describe('Anfrage für Vereine und Einrichtungen', () => {
  test('beide Wege sind an der Art der Nutzung unterschieden, nicht an der Grösse', () => {
    const tracks = INSTITUTION_PROFILES.map((p) => p.track)
    expect(tracks).toEqual(['nonprofit', 'commercial'])
    const gewerblich = INSTITUTION_PROFILES[1].criteria.map((c) => c.de).join(' ')
    expect(/Entgelt|verkauf/i.test(gewerblich)).toBe(true)
    for (const profile of INSTITUTION_PROFILES) {
      const alle = profile.criteria.map((c) => c.de).join(' ')
      expect(/mehr als \d+ Athleten|ab \d+ Athleten/i.test(alle), profile.track).toBe(false)
    }
  })

  test('die Anfrage enthält keine Angaben zu einzelnen Athleten', () => {
    const text = buildEnquiryText(
      { track: 'nonprofit', organisation: 'TSV Beispiel', athletes: 42, coaches: 5, note: '' },
      'de',
    )
    expect(text).toContain('TSV Beispiel')
    expect(text).toContain('42')
    // Nur Zahlen, keine Namen, keine Geburtsdaten, keine Messwerte (§50).
    expect(text).not.toMatch(/Geburt|Messwert|Ergebnis/i)
  })
})

test.describe('Der Bildschirm', () => {
  test('sagt, dass noch nichts gekauft werden kann', async ({ page }) => {
    await openGuest(page)
    await page.goto('/preise', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preise')
    await expect(page.getByText(/Noch kann nichts gekauft werden/)).toBeVisible()
    await expect(page.getByText('29,90 €', { exact: true })).toBeVisible()
    await expect(page.getByText('39,00 € im Monat')).toBeVisible()
  })

  test('die Anfrage entsteht im Gerät und wird nicht verschickt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/preise', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Organisation').fill('SV Musterstadt')
    await expect(page.getByText('Organisation: SV Musterstadt')).toBeVisible()
    await page.getByRole('button', { name: 'Gewerbliche Nutzung' }).click()
    await expect(page.getByText('Art der Nutzung: Gewerbliche Nutzung')).toBeVisible()
  })

  test('keine Stufe stellt den Export hinter eine Schranke', async ({ page }) => {
    await openGuest(page)
    await page.goto('/preise', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Export deiner Daten ist vollständig und kostenlos/)).toBeVisible()
    await expect(page.getByText(/verfällt nicht/)).toBeVisible()
  })

  test('vom Profil führt ein Weg dorthin', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Preise' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preise')
  })
})
