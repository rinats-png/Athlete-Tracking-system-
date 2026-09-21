import { expect, test } from '@playwright/test'
import {
  ATHLETE_PLANS,
  COACH_TIERS,
  FREE_CORE,
  INSTITUTION_PROFILES,
  athletePlan,
  athletesMeasuredInWindow,
  buildEnquiryText,
  coachTierFor,
  extraFeatures,
  perAthleteYearEur,
  type PlanFeature,
} from '../src/data/pricing'
import { openGuest } from './helpers'

/**
 * Preise.
 *
 * Vier Fehler wären hier teuer, und jeder einzelne würde die Haltung des
 * Produkts widerlegen statt nur den Umsatz kosten:
 *
 *   1. Eine Seite, die nach einem Kauf aussieht, obwohl nichts abgerechnet
 *      werden kann.
 *   2. Eine Stufe, die den Export der eigenen Daten hinter eine Schranke
 *      stellt (§32).
 *   3. Ein Paywall auf der EHRLICHKEIT — also auf dem Messfehlerband oder dem
 *      Urteil, ob eine Veränderung echt ist. Wer dafür zahlen müsste, bekäme
 *      gratis eine schlechtere Lüge.
 *   4. Eine Staffel, bei der die grössere Stufe je Athlet teurer ist als die
 *      kleinere — dann wäre sie eine Zahlenreihe ohne Aussage.
 */

test.describe('Der kostenlose Kern', () => {
  test('er enthält die Ehrlichkeit, und keine Stufe nimmt sie ihm weg', () => {
    // Das ist die wichtigste Zusage dieser Datei. Das Messfehlerband ist
    // nicht ein Merkmal des Produkts, es IST das Produkt.
    expect(FREE_CORE).toContain('errorBand')
    expect(FREE_CORE).toContain('history')
    expect(FREE_CORE).toContain('ownProfile')
    expect(FREE_CORE).toContain('measure')

    for (const plan of ATHLETE_PLANS) {
      for (const feature of FREE_CORE) {
        expect(plan.features, `${plan.id} nimmt ${feature} weg`).toContain(feature)
      }
    }
    for (const tier of COACH_TIERS) {
      for (const feature of FREE_CORE) {
        expect(tier.features, `${tier.id} nimmt ${feature} weg`).toContain(feature)
      }
    }
  })

  test('der Export steht in jeder einzelnen Stufe (§32)', () => {
    const alle = [...ATHLETE_PLANS, ...COACH_TIERS]
    for (const stufe of alle) {
      expect(stufe.features, `${stufe.id} ohne Export`).toContain('export')
    }
  })

  test('die kostenlose Stufe ist wirklich kostenlos und steht zuerst', () => {
    expect(ATHLETE_PLANS[0].id).toBe('free')
    expect(ATHLETE_PLANS[0].yearlyEur).toBeNull()
    expect(ATHLETE_PLANS[0].monthlyEur).toBeNull()
    expect(ATHLETE_PLANS[0].onceEur).toBeNull()
    expect(COACH_TIERS[0].id).toBe('coach_free')
    expect(COACH_TIERS[0].yearlyEur).toBeNull()
  })
})

test.describe('Einzelnutzung', () => {
  test('die Zahlen stehen so, wie sie vereinbart sind', () => {
    // Seit dem Ausbau (docs/ausbau.md §10): Plus 49, Pro 99, Termin 69 einmalig.
    expect(athletePlan('plus').yearlyEur).toBe(49)
    expect(athletePlan('plus').monthlyEur).toBe(4.9)
    expect(athletePlan('pro').yearlyEur).toBe(99)
    expect(athletePlan('termin').onceEur).toBe(69)
  })

  test('monatlich zahlen ist teurer als das Jahr — sichtbar, nicht versteckt', () => {
    const plus = athletePlan('plus')
    expect(plus.monthlyEur! * 12).toBeGreaterThan(plus.yearlyEur!)
  })

  test('der Termin-Pass kostet mehr als ein Jahr Plus, weil er mehr enthält', () => {
    // Sonst wäre er ein teureres, kürzeres Plus — und das wäre keine
    // Bündelung, sondern eine Strafe für Unentschlossenheit.
    const termin = athletePlan('termin')
    const plus = athletePlan('plus')
    expect(termin.onceEur!).toBeGreaterThan(plus.yearlyEur!)
    const mehr = termin.features.filter((f) => !plus.features.includes(f))
    expect(mehr).toContain('targetStandards')
    expect(mehr).toContain('reportPdf')
  })

  test('Plus trägt sich nicht allein über das Perzentil', () => {
    // Der Grund steht in docs/produktstrategie.md: nur vier Tests im Katalog
    // haben eine Bevölkerungsreferenz. Stünde Plus auf dem Perzentil, zahlten
    // die meisten und sähen nichts. Die tragenden Merkmale müssen bei JEDEM
    // Test wirken.
    const plus = extraFeatures(athletePlan('plus'))
    for (const ohneKohorte of ['forecast', 'seasonPlan', 'sync', 'card'] as PlanFeature[]) {
      expect(plus, `${ohneKohorte} fehlt`).toContain(ohneKohorte)
    }
  })

  test('die Karten zeigen nur den Zuwachs, nicht die ganze Liste', () => {
    for (const plan of ATHLETE_PLANS.filter((p) => p.billing !== 'free')) {
      const extra = extraFeatures(plan)
      expect(extra.length).toBeGreaterThan(0)
      for (const feature of FREE_CORE) expect(extra).not.toContain(feature)
    }
  })
})

test.describe('Trainerstufen', () => {
  test('die Zahlen stehen so, wie sie vereinbart sind', () => {
    expect(COACH_TIERS.map((t) => [t.yearlyEur, t.athletesPerYear])).toEqual([
      [null, 3],
      [149, 25],
      [349, 75],
      [699, 250],
    ])
  })

  test('je Athlet wird es mit jeder Stufe günstiger', () => {
    const bezahlt = COACH_TIERS.filter((t) => t.yearlyEur != null)
    for (let i = 1; i < bezahlt.length; i++) {
      expect(perAthleteYearEur(bezahlt[i])!).toBeLessThan(perAthleteYearEur(bezahlt[i - 1])!)
    }
    // Und der Einstieg bleibt unter zehn Prozent einer einzigen
    // Diagnostiksitzung (80–150 €) — darüber rechnet ein Trainer nach.
    expect(perAthleteYearEur(COACH_TIERS[1])!).toBeLessThan(8)
  })

  test('der Wirksamkeitsnachweis ist in jeder Stufe, auch der kostenlosen', () => {
    // Er ist der Grund, warum ein Trainer bleibt. Ihn hinter die höchste
    // Stufe zu legen hiesse, das beste Argument dem zu verwehren, der es noch
    // nicht kennt.
    for (const tier of COACH_TIERS) {
      expect(tier.features, tier.id).toContain('coachProof')
      expect(tier.features, tier.id).toContain('unlimitedReports')
    }
  })

  test('die Stufe richtet sich nach gemessenen Athleten, nicht nach dem Bestand', () => {
    expect(coachTierFor(3)!.id).toBe('coach_free')
    expect(coachTierFor(4)!.id).toBe('coach_start')
    expect(coachTierFor(25)!.id).toBe('coach_start')
    expect(coachTierFor(26)!.id).toBe('coach_team')
    expect(coachTierFor(250)!.id).toBe('coach_pro')
    expect(coachTierFor(251)).toBeNull()
  })
})

test.describe('Wer gezählt wird', () => {
  const athlet = (...tage: number[]) => ({
    results: tage.map((d) => ({
      performedAt: new Date(Date.now() - d * 86_400_000).toISOString(),
    })),
  })

  test('ein Athlet zählt einmal, egal wie oft er gemessen wurde', () => {
    // Sonst bestrafte die Rechnung gründliches Messen — bei einem Produkt,
    // dessen Aussagekraft mit der Zahl der Messungen steigt.
    expect(athletesMeasuredInWindow([athlet(10, 20, 30, 40, 50)])).toBe(1)
  })

  test('wer im Bestand liegt, aber nicht gemessen wurde, kostet nichts', () => {
    const bestand = [athlet(10), { results: [] }, athlet(400), athlet(500)]
    expect(athletesMeasuredInWindow(bestand)).toBe(1)
  })

  test('gezählt wird über ein Jahr, nicht über einen Monat', () => {
    // Diagnostik läuft in Wellen: dreissig im März, keiner im April. Eine
    // Monatszählung zwänge jeden Trainer in die Stufe seiner Spitzenwoche.
    const welle = Array.from({ length: 30 }, () => athlet(200))
    expect(athletesMeasuredInWindow(welle)).toBe(30)
    expect(coachTierFor(athletesMeasuredInWindow(welle))!.id).toBe('coach_team')
  })

  test('eine Messung in der Zukunft zählt nicht mit', () => {
    expect(athletesMeasuredInWindow([{ results: [{ performedAt: '2099-01-01T12:00:00.000Z' }] }])).toBe(0)
  })

  test('eine unlesbare Zeitangabe wirft nicht, sie zählt nur nicht', () => {
    expect(athletesMeasuredInWindow([{ results: [{ performedAt: 'kaputt' }] }])).toBe(0)
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
  })

  test('die Preise stehen so da, wie sie vereinbart sind', async ({ page }) => {
    await openGuest(page)
    await page.goto('/preise', { waitUntil: 'domcontentloaded' })
    // Plus (49) steht auch im Monatsvergleich («… im Jahr») — deshalb die Karte, nicht der Text.
    await expect(page.getByTestId('plan-plus')).toContainText('49 € im Jahr')
    await expect(page.getByTestId('plan-pro')).toContainText('99 € im Jahr')
    await expect(page.getByText('69 € einmalig')).toBeVisible()
    await expect(page.getByText('149 € im Jahr')).toBeVisible()
    await expect(page.getByText('349 € im Jahr')).toBeVisible()
    await expect(page.getByText('699 € im Jahr')).toBeVisible()
  })

  test('der kostenlose Kern steht oben und nennt das Messfehlerband', async ({ page }) => {
    await openGuest(page)
    await page.goto('/preise', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Kostenlos, dauerhaft')).toBeVisible()
    await expect(page.getByText(/Messfehler und das Urteil/)).toBeVisible()
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
    await expect(page.getByText(/bleibt dein Bestand vollständig/)).toBeVisible()
  })

  test('vom Profil führt ein Weg dorthin', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Preise' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preise')
  })
})
