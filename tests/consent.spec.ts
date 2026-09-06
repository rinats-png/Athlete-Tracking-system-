import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { ADULT_AGE, consentStatus, consentTodo } from '../src/domain/consent'
import type { StoredAthlete } from '../src/lib/store/localStore'

/**
 * Einwilligung in die Verarbeitung fremder Messwerte.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: ein Trainer mit zwölf Athleten verarbeitet
 * personenbezogene Daten anderer Menschen. Bei Minderjährigen genügt deren
 * eigenes Einverständnis nicht. Solange das nur in den Nutzungsbedingungen
 * stand, hakte es niemand ab — und genau das Segment, das am ehesten zahlen
 * würde, konnte die App nicht einsetzen.
 *
 * Der gefährlichste denkbare Standardwert wäre hier «erteilt»: eine
 * erfundene Rechtsgrundlage. Dafür stehen der erste und der letzte Fall.
 */

const asOf = new Date('2026-09-06T12:00:00.000Z')

const athlete = (over: Partial<StoredAthlete> = {}, birthDate: string | null = '1990-01-01') =>
  ({
    id: 'a',
    name: 'Person',
    archived: false,
    profile: { birthDate },
    consent: { grantedAt: null, grantedBy: '', forMinor: false, withdrawnAt: null },
    results: [],
    ...over,
  }) as unknown as StoredAthlete

test.describe('Zustand der Einwilligung', () => {
  test('ohne Eintrag darf nicht gemessen werden', () => {
    const status = consentStatus(athlete(), asOf)
    expect(status.state).toBe('missing')
    expect(status.mayRecord).toBe(false)
  })

  test('ohne Geburtsdatum wird vom Schutzbedarf ausgegangen', () => {
    // Die bequeme Annahme (volljährig) kostet die Rechtsgrundlage, die
    // vorsichtige kostet einen Haken.
    expect(consentStatus(athlete({}, null), asOf).needsGuardian).toBe(true)
  })

  test('ein Widerruf beendet die Erfassung, bleibt aber sichtbar', () => {
    const status = consentStatus(
      athlete({
        consent: {
          grantedAt: '2026-01-01T00:00:00.000Z',
          grantedBy: 'Mutter',
          forMinor: true,
          withdrawnAt: '2026-06-01T00:00:00.000Z',
        },
      } as Partial<StoredAthlete>),
      asOf,
    )
    expect(status.state).toBe('withdrawn')
    expect(status.mayRecord).toBe(false)
  })

  test('wer volljährig wird, entscheidet selbst', () => {
    // Eine für ein Kind erteilte Einwilligung trägt nicht ins Erwachsenenalter.
    const status = consentStatus(
      athlete(
        {
          consent: {
            grantedAt: '2020-01-01T00:00:00.000Z',
            grantedBy: 'Vater',
            forMinor: true,
            withdrawnAt: null,
          },
        } as Partial<StoredAthlete>,
        '2008-01-01',
      ),
      asOf,
    )
    expect(status.ageYears).toBeGreaterThanOrEqual(ADULT_AGE)
    expect(status.state).toBe('outgrown')
  })

  test('die Aufgabenliste nennt jeden ohne gültige Einwilligung', () => {
    const list = consentTodo(
      [
        athlete({ id: 'x' }),
        athlete({
          id: 'y',
          consent: {
            grantedAt: '2026-01-01T00:00:00.000Z',
            grantedBy: 'selbst',
            forMinor: false,
            withdrawnAt: null,
          },
        } as Partial<StoredAthlete>),
      ],
      asOf,
    )
    expect(list.map((a) => a.id)).toEqual(['x'])
  })
})

test.describe('Im Bildschirm', () => {
  test('ohne Einwilligung lässt sich für einen betreuten Athleten nichts speichern', async ({
    page,
  }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Trainer' }).click()
    await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')

    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2800')

    await expect(page.getByText(/erfasst diese App .* keine Messwerte/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ergebnis speichern' })).toBeDisabled()
  })

  test('nach dem Erfassen der Einwilligung geht es', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Trainer' }).click()
    await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')

    await page.getByLabel(/^Erteilt von/).first().fill('Erziehungsberechtigte')
    await page.getByRole('button', { name: 'Einwilligung erfassen' }).first().click()
    await expect(page.getByText('Einwilligung liegt vor')).toBeVisible()

    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2800')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
  })

  test('die App sagt, dass sie keine Rechtsberatung gibt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Trainer' }).click()
    await expect(page.getByText(/keine Rechtsberatung/).first()).toBeVisible()
  })
})
