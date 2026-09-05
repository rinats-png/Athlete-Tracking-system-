import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { plansForRole, planBelongsToRole } from '../src/features/auth/account'
import { COACH_TIERS, REPORT_BUNDLES } from '../src/data/pricing'
import { openColdStart } from './helpers'

/**
 * Das Tor.
 *
 * DER TEUERSTE FEHLER AN EINEM ANMELDEBILDSCHIRM wäre nicht ein falsches
 * Layout, sondern ein vorgetäuschter Schutz: es gibt keinen Server, die
 * Eingabe wird nicht geprüft. Wer das nicht sagt, verleitet dazu, ein
 * Passwort einzutippen, das anderswo etwas bewacht. Die ersten Fälle halten
 * deshalb fest, dass der Bildschirm es sagt — und dass kein Passwort im
 * Gerät landet.
 */

test.describe('Was der Bildschirm über sich sagt', () => {
  test('er nennt, dass nichts geprüft und nichts gespeichert wird', async ({ page }) => {
    await openColdStart(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('BASELINE')
    await expect(page.getByText(/Es gibt noch keinen Server/)).toBeVisible()
    await expect(page.getByText(/Wird nicht gespeichert und nicht gesendet/).first()).toBeVisible()
  })

  test('kein Passwort landet im Gerät', async ({ page }) => {
    await openColdStart(page)
    await page.getByLabel('E-Mail').fill('mensch@example.org')
    await page.getByLabel('Passwort').fill('einSehrGeheimesWort')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await page.waitForTimeout(1400)

    const gespeichert = await page.evaluate(() => JSON.stringify(localStorage))
    expect(gespeichert).toContain('mensch@example.org')
    expect(
      gespeichert,
      'ein Passwort im Speicher, das nichts prüft, wäre das Schlechteste aus beiden Welten',
    ).not.toContain('einSehrGeheimesWort')
  })

  test('das Konto-Modell kennt gar kein Passwortfeld', () => {
    const code = readFileSync('src/features/auth/account.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(/password|passwort|hash|secret/i.test(code)).toBe(false)
  })
})

test.describe('Ohne Konto kommt niemand weiter', () => {
  test('der Kaltstart zeigt das Tor, nicht die App', async ({ page }) => {
    await openColdStart(page)
    await expect(page.getByRole('tab', { name: 'Anmelden' })).toBeVisible()
    // Die App liegt dahinter — kein Weg daran vorbei.
    await expect(page.getByRole('button', { name: /Mit leerem Bestand starten/ })).toHaveCount(0)
  })

  test('ein direkter Aufruf einer Route führt trotzdem zum Tor', async ({ page }) => {
    await openColdStart(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('BASELINE')
  })
})

test.describe('Registrierung', () => {
  test('Rolle, Stufe, Zugang — in dieser Reihenfolge', async ({ page }) => {
    await openColdStart(page)
    await page.getByRole('tab', { name: 'Konto anlegen' }).click()

    await expect(page.getByText('Wofür benutzt du BASELINE?')).toBeVisible()
    await page.getByRole('button', { name: /Ich betreue andere/ }).click()

    // Der Trainer sieht Trainerstufen, nicht Report-Kontingente.
    await expect(page.getByText('Coach S')).toBeVisible()
    await expect(page.getByText('Einzelreport')).toHaveCount(0)
    await expect(page.getByText(/Noch kann nichts gekauft werden/)).toBeVisible()
    await page.getByRole('button', { name: /Coach M/ }).click()
    await page.getByRole('button', { name: 'Weiter' }).click()

    await page.getByLabel('Name').fill('Sam Trainer')
    await page.getByLabel('E-Mail').fill('sam@example.org')
    await page.getByLabel('Passwort').fill('egal')
    await page.getByRole('button', { name: 'Konto anlegen' }).click()
    await page.waitForTimeout(1400)

    const konto = await page.evaluate(() => localStorage.getItem('baseline.account.v1'))
    expect(konto).toContain('Sam Trainer')
    expect(konto).toContain('coach_m')
  })

  test('die Stufe lässt sich überspringen', async ({ page }) => {
    // Eine erzwungene Kaufentscheidung vor dem ersten Messwert wäre eine
    // Zumutung — zumal nichts abgerechnet wird.
    await openColdStart(page)
    await page.getByRole('tab', { name: 'Konto anlegen' }).click()
    await page.getByRole('button', { name: /Für mich selbst/ }).click()
    await page.getByRole('button', { name: 'Später entscheiden' }).click()
    await expect(page.getByLabel('Name')).toBeVisible()
  })
})

test.describe('Stufen und Rollen', () => {
  test('jede Rolle sieht nur ihre eigenen Stufen', () => {
    expect(plansForRole('athlete').map((p) => p.id)).toEqual(REPORT_BUNDLES.map((b) => b.id))
    expect(plansForRole('coach').map((p) => p.id)).toEqual(COACH_TIERS.map((t) => t.id))
  })

  test('eine Stufe der anderen Rolle gilt nicht', () => {
    // Sonst stünde beim Athleten eine Trainerstufe — etwa nach einem von
    // Hand veränderten Speicher.
    expect(planBelongsToRole('coach_m', 'athlete')).toBe(false)
    expect(planBelongsToRole('four', 'athlete')).toBe(true)
    expect(planBelongsToRole(null, 'coach')).toBe(true)
  })
})

test.describe('Der Übergang', () => {
  test('nach der Anmeldung kommt die Sequenz, dann der Einstieg', async ({ page }) => {
    await openColdStart(page)
    await page.evaluate(() => localStorage.setItem('baseline.intro', 'on'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByLabel('E-Mail').fill('mensch@example.org')
    await page.getByLabel('Passwort').fill('egal')
    await page.getByRole('button', { name: 'Anmelden' }).click()

    // Die Auflösung der Fläche geht in die Sequenz über.
    await expect(page.getByRole('dialog', { name: 'Einführungssequenz' })).toBeVisible({
      timeout: 6000,
    })
    await page.getByRole('button', { name: 'Überspringen' }).click()
    await expect(page.getByRole('button', { name: /Mit leerem Bestand starten/ })).toBeVisible()
  })
})

test.describe('Abmelden', () => {
  test('räumt das Konto, nicht die Messwerte', async ({ page }) => {
    // §32: die Werte gehören dem Menschen, nicht der Anmeldung. Ein
    // Abmelden, das den Bestand mitnimmt, wäre ein Datenverlust auf Knopfdruck.
    const { openDemo } = await import('./helpers')
    await openDemo(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    const vorher = await page.evaluate(() => localStorage.getItem('baseline.data.v1'))
    expect(vorher).not.toBeNull()

    await page.getByRole('button', { name: 'Abmelden' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('BASELINE')

    const konto = await page.evaluate(() => localStorage.getItem('baseline.account.v1'))
    const bestand = await page.evaluate(() => localStorage.getItem('baseline.data.v1'))
    expect(konto).toBeNull()
    expect(bestand, 'der Bestand überlebt das Abmelden').toBe(vorher)
  })

  test('das Profil zeigt, wer angemeldet ist', async ({ page }) => {
    const { openGuest } = await import('./helpers')
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Angemeldet als Prueflauf')).toBeVisible()
    await expect(page.getByText(/Deine Messwerte bleiben auf diesem Gerät/)).toBeVisible()
  })
})

test.describe('Die Rolle aus der Registrierung', () => {
  test('wer sich als Trainer anmeldet, findet den Trainerbereich vor', async ({ page }) => {
    await openColdStart(page)
    await page.evaluate(() =>
      localStorage.setItem(
        'baseline.account.v1',
        JSON.stringify({
          name: 'Sam',
          email: 'sam@example.org',
          role: 'coach',
          planId: 'coach_s',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Mit leerem Bestand starten/ }).click()
    await page.waitForTimeout(600)
    const bestand = await page.evaluate(() => localStorage.getItem('baseline.data.v1'))
    expect(bestand).toContain('"role":"coach"')
  })
})
