import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { buildIcs, ALARM_LEAD_DAYS } from '../src/lib/export/ics'
import type { DueTest } from '../src/domain/reminders'

/**
 * Wie eine Erinnerung ihren Empfänger erreicht.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: die App wusste, was fällig ist — sagen konnte
 * sie es nur jemandem, der sie ohnehin öffnet. Genau der braucht die
 * Erinnerung aber nicht.
 *
 * Der teuerste Fehler wäre ein Versprechen, das die App nicht halten kann:
 * ohne Push-Server benachrichtigt keine Web-App, während sie geschlossen ist
 * (§81). Dafür steht der letzte Fall.
 */

const due: DueTest[] = [
  {
    slug: 'cooper_12min',
    lastPerformedAt: '2026-01-10T17:00:00.000Z',
    intervalDays: 90,
    dueOn: '2026-04-10',
    overdueDays: 5,
  },
]

test.describe('Kalenderdatei', () => {
  test('enthält einen ganztägigen Termin mit Voralarm', () => {
    const ics = buildIcs(due, 'de', new Date('2026-04-15T08:00:00.000Z'))

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260410')
    // Ein ganztägiger Termin endet am Folgetag — sonst zeigen manche Kalender
    // ihn gar nicht an.
    expect(ics).toContain('DTEND;VALUE=DATE:20260411')
    expect(ics).toContain(`TRIGGER:-P${ALARM_LEAD_DAYS}D`)
    expect(ics).toContain('END:VCALENDAR')
  })

  test('jede Zeile endet mit CRLF und bleibt unter 75 Oktett', () => {
    const ics = buildIcs(due, 'de', new Date('2026-04-15T08:00:00.000Z'))

    // RFC 5545 verlangt beides. Wird es verletzt, verwerfen manche Kalender
    // die Datei stillschweigend — und niemand sieht, warum nichts passiert.
    expect(ics.endsWith('\r\n')).toBe(true)
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length, `zu lang: ${line}`).toBeLessThanOrEqual(75)
    }
  })

  test('der Termin sagt, dass die Bedingungen gleich bleiben müssen', () => {
    // Entfalten, wie es jeder Kalender beim Lesen tut: die Faltung nach 73
    // Oktett zerschneidet Wörter, und ohne dieses Entfalten prüfte der Test
    // die Faltstelle statt den Text.
    const unfold = (ics: string) => ics.replace(/\r\n /g, '')

    // Eine Nachmessung unter anderen Bedingungen ist keine Nachmessung.
    // Der Hinweis gehört dorthin, wo er drei Monate später gelesen wird.
    expect(unfold(buildIcs(due, 'de'))).toContain('vergleichbar')
    expect(unfold(buildIcs(due, 'en'))).toContain('comparable')
  })
})

test.describe('Erinnerungen im Bildschirm', () => {
  test('die Kalenderdatei lässt sich laden', async ({ page }) => {
    await openDemo(page)
    await page.goto('/verlauf/erinnerungen', { waitUntil: 'domcontentloaded' })

    const laden = page.getByRole('button', { name: 'Kalenderdatei laden' })
    await expect(laden).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), laden.click()])
    expect(download.suggestedFilename()).toBe('kydon-nachmessungen.ics')
  })

  test('die Grenze der Systembenachrichtigung steht daneben, nicht im Kleingedruckten', async ({
    page,
  }) => {
    await openDemo(page)
    await page.goto('/verlauf/erinnerungen', { waitUntil: 'domcontentloaded' })

    // «erinnert dich zuverlässig» wäre eine Behauptung, die die App ohne
    // Push-Server nicht einlösen kann (§81).
    await expect(page.getByText(/nur benachrichtigen, während sie geöffnet ist/)).toBeVisible()
  })
})
