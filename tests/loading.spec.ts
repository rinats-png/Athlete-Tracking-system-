import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'

/**
 * Was beim ersten Aufruf über die Leitung geht, entscheidet darüber, ob die
 * App in der Halle mit schlechtem Empfang benutzbar ist. Die Diagrammbiblio-
 * thek ist der grösste Einzelposten — sie darf nur laden, wenn wirklich ein
 * Diagramm gezeichnet wird.
 */

const isEcharts = (url: string) => /\/assets\/echarts-[^/]*\.js$/.test(url)

test.describe('Auslieferung', () => {
  test('ohne Diagramm wird die Diagrammbibliothek nicht geladen', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (request) => {
      if (isEcharts(request.url())) requested.push(request.url())
    })

    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    // Kurz Gelegenheit geben, den Baustein zu holen — er darf es nicht.
    await page.waitForTimeout(600)

    expect(requested, 'Diagrammbibliothek auf einer Seite ohne Diagramm').toEqual([])
  })

  test('mit Diagramm wird sie nachgeladen und das Diagramm erscheint', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (request) => {
      if (isEcharts(request.url())) requested.push(request.url())
    })

    await openDemo(page)

    // Auf das Diagramm warten statt auf `networkidle`: der Service Worker
    // hält die Verbindung offen, und unter Volllast lief die Wartezeit ins
    // Zeitlimit, obwohl das Diagramm längst da war.
    await expect(page.getByRole('img', { name: /Leistungsprofil/ })).toBeVisible()
    expect(requested.length).toBeGreaterThan(0)
  })

  test('das Nachladen verschiebt das Layout nicht', async ({ page }) => {
    await openDemo(page)

    // Position eines Elements UNTER dem Diagramm vor und nach dem Nachladen.
    const probe = page.getByRole('button', { name: /Als Tabelle/ }).first()
    await probe.waitFor()
    const before = await probe.boundingBox()

    await expect(page.getByRole('img', { name: /Leistungsprofil/ })).toBeVisible()
    const after = await probe.boundingBox()

    // Der Platzhalter hat exakt die Höhe des Diagramms — sonst wandern die
    // Bedienelemente unter dem Finger weg und es kommt zu Fehlklicks.
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1)
  })

  test('ein fehlgeschlagenes Nachladen reisst die Seite nicht mit', async ({ page }) => {
    // Abgebrochene Verbindung, geleerter Cache, blockierendes Netz: die
    // Diagrammfläche bleibt dann leer — aber die Seite muss stehen und die
    // Zahlen müssen erreichbar bleiben. Ohne Auffangnetz schlüge die Ausnahme
    // aus Suspense nach oben durch und der Nutzer stünde vor einer weissen
    // Seite, obwohl alle seine Daten da sind.
    //
    // Anmerkung zur Reichweite dieser Prüfung: `route.abort()` unterbricht
    // hier einen Teilbaustein, den der nachgeladene Baustein statisch
    // einbindet; das Versprechen bleibt in dieser Emulation offen, statt
    // abgelehnt zu werden. Der erklärende Hinweistext, den der Code für den
    // Ablehnungsfall vorhält, lässt sich damit nicht auslösen. Geprüft wird
    // deshalb die Zusage, die in beiden Fällen gelten muss.
    await page.route(/\/assets\/echarts-[^/]*\.js$/, (route) => route.abort())
    await openDemo(page)

    // Die Seite lebt.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByText('Leistungsprofil').first()).toBeVisible()

    // Und der Weg zu den Zahlen funktioniert ohne die Bibliothek.
    await page.getByRole('button', { name: /Als Tabelle/ }).first().click()
    await expect(page.getByRole('columnheader', { name: 'Achse' }).first()).toBeVisible()
    await expect(page.getByRole('cell', { name: /Ausdauer/ }).first()).toBeVisible()
  })
})
