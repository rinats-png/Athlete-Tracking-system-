import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { OBSERVATIONS, observationByKey } from '../src/data/observations'
import { radarProfile } from '../src/lib/scoring'

/**
 * Beobachtungswerte.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: die Mastertabelle enthält Grössen, die keine
 * Leistung sind — ein CK-Wert, eine Hitzebelastung, ein Y-Balance-Ergebnis.
 * Die App kannte nur Leistungstests und hätte sie entweder weglassen oder
 * falsch einordnen müssen.
 *
 * Der teuerste Fehler wäre, ihnen eine Stufe zu geben. Für keinen dieser
 * Werte liegt eine belastbare Norm vor, und eine erfundene Einordnung hätte
 * ausgerechnet bei einem Laborwert nicht nur fachliche, sondern
 * gesundheitliche Folgen (§81, §82). Dafür stehen der zweite und dritte Fall.
 */

test.describe('Der Katalog der Beobachtungswerte', () => {
  test('jeder trägt Einheit, Bereich und die nötige Quelle', () => {
    expect(OBSERVATIONS.length).toBeGreaterThanOrEqual(10)
    for (const observation of OBSERVATIONS) {
      expect(observation.unit, observation.key).toBeTruthy()
      expect(observation.max, observation.key).toBeGreaterThan(observation.min)
      expect(['self', 'device', 'lab', 'medical']).toContain(observation.source)
    }
  })

  test('keiner trägt einen Grenzwert oder eine Stufe', () => {
    // Ein erfundener Cutoff wäre an dieser Stelle der schwerste denkbare
    // Verstoss: er ordnete einen Laborwert ein, den die App nicht deuten darf.
    for (const observation of OBSERVATIONS) {
      expect(Object.keys(observation)).not.toContain('bands')
      expect(Object.keys(observation)).not.toContain('reference')
      expect(Object.keys(observation)).not.toContain('cutoff')
    }
  })

  test('ein Blutwert ist als ärztliche Leistung gekennzeichnet', () => {
    expect(observationByKey('ck_u_l')?.source).toBe('medical')
  })
})

test.describe('Im Bildschirm', () => {
  test('ein Wert lässt sich erfassen und steht im Verlauf', async ({ page }) => {
    await openGuest(page)
    await page.goto('/beobachtung', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Beobachtungswerte', { exact: true }).selectOption('hrv_rmssd_ms')
    await page.getByLabel('Wert', { exact: true }).fill('68')
    await page.getByLabel('Gerät', { exact: true }).fill('Brustgurt H10')
    await page.getByRole('button', { name: 'Wert erfassen' }).click()

    await expect(page.getByText('Brustgurt H10')).toBeVisible()
    await expect(page.getByText('68').first()).toBeVisible()
  })

  test('er wird nirgends bewertet', async ({ page }) => {
    await openGuest(page)
    await page.goto('/beobachtung', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Beobachtungswerte', { exact: true }).selectOption('ck_u_l')
    await page.getByLabel('Wert', { exact: true }).fill('420')
    await page.getByRole('button', { name: 'Wert erfassen' }).click()

    // Keine Stufe, kein Perzentil, keine Deutung.
    for (const wort of ['Schwach', 'Durchschnitt', 'Sehr gut', 'Elite', 'Perzentil']) {
      await expect(page.getByText(wort, { exact: true })).toHaveCount(0)
    }
    await expect(page.getByText(/sagt eine Ärztin oder ein Arzt/)).toBeVisible()
  })

  test('er zahlt auf keine Profilachse ein', async ({ page }) => {
    await openGuest(page)
    await page.goto('/beobachtung', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Beobachtungswerte', { exact: true }).selectOption('fms_total')
    await page.getByLabel('Wert', { exact: true }).fill('16')
    await page.getByRole('button', { name: 'Wert erfassen' }).click()

    const bestand = JSON.parse(
      (await page.evaluate(() => localStorage.getItem('kydon.data.v1'))) ?? '{}',
    )
    const athlet = bestand.athletes[0]
    // Er liegt neben den Ergebnissen, nicht darin — sonst würde er früher
    // oder später mitgerechnet.
    expect(athlet.observations).toHaveLength(1)
    expect(athlet.results).toHaveLength(0)
    expect(radarProfile(athlet.results, 'personal_best').every((a) => !a.hasData)).toBe(true)
  })

  test('welches Gerät oder welche Fachperson nötig ist, steht dabei', async ({ page }) => {
    await openGuest(page)
    await page.goto('/beobachtung', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Beobachtungswerte', { exact: true }).selectOption('ck_u_l')
    await expect(page.getByText(/Blutentnahme und ärztliche Befundung/)).toBeVisible()

    await page.getByLabel('Beobachtungswerte', { exact: true }).selectOption('mip_cm_h2o')
    await expect(page.getByText(/Fachgerät oder ein Labor/)).toBeVisible()
  })
})
