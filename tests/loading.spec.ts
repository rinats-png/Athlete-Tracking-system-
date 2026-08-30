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

test.describe('Aktualisierung der installierten App', () => {
  test('die App fragt von sich aus nach einer neuen Fassung', async ({ page }) => {
    // Gemessener Fehler, gegen den dieser Fall steht: die mitgelieferte
    // Registrierung von vite-plugin-pwa ruft einmal `register()` auf und
    // fragt danach nie wieder. Ein zurückkehrender Nutzer blieb auch nach
    // drei Reloads auf dem alten Stand — nach einem Deploy sah er weiterhin
    // die Version von gestern, ohne dass ihm etwas auffiel.
    const updateCalls: string[] = []
    await page.addInitScript(() => {
      ;(window as unknown as { __swUpdates: number }).__swUpdates = 0
    })

    await openDemo(page)

    // Registrierung ist vorhanden …
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 20_000,
    })

    // … und die Aktualisierungsprüfung hängt an der Rückkehr zur Seite.
    const wired = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return 'keine Registrierung'

      let called = 0
      const original = registration.update.bind(registration)
      registration.update = async () => {
        called += 1
        return original()
      }

      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))

      await new Promise((r) => setTimeout(r, 200))
      return called
    })

    expect(updateCalls).toEqual([])
    expect(wired, 'Rückkehr zur Seite muss eine Update-Prüfung auslösen').toBeGreaterThan(0)
  })

  test('die Registrierung des Plugins ist nicht zusätzlich eingebunden', async ({ page }) => {
    // Zwei Registrierungen nebeneinander würden sich gegenseitig
    // überschreiben; die eigene ist die mit der Update-Prüfung.
    const requested: string[] = []
    page.on('request', (r) => {
      if (r.url().endsWith('/registerSW.js')) requested.push(r.url())
    })
    await openDemo(page)
    expect(requested).toEqual([])
  })
})
