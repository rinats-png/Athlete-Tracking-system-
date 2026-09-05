import { readFileSync, readdirSync, statSync } from "node:fs";
import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'

/**
 * Was beim ersten Aufruf über die Leitung geht, entscheidet darüber, ob die
 * App in der Halle mit schlechtem Empfang benutzbar ist.
 *
 * BIS HIERHER war die Diagrammbibliothek der grösste Einzelposten — rund
 * 500 KB, nachgeladen, sobald irgendwo ein Diagramm stand. Diese Fälle
 * prüften, dass sie nur dann kam. Jetzt sind die Diagramme aus Streifen und
 * Schraffur gebaut und stecken im Markup: es gibt nichts mehr nachzuladen,
 * nichts, das scheitern kann, und keine Fläche, die erst später ihre Höhe
 * bekommt. Die Fälle prüfen deshalb die stärkere Zusage.
 */

test.describe('Auslieferung', () => {
  test('es wird überhaupt keine Diagrammbibliothek ausgeliefert', () => {
    // Geprüft wird die Abhängigkeit selbst, nicht ein Dateiname: gebaute
    // Bausteine tragen zufällige Kennungen, und ein Suchmuster darauf trifft
    // früher oder später etwas Falsches.
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    const alle = { ...pkg.dependencies, ...pkg.devDependencies }
    const diagramm = Object.keys(alle).filter((name) =>
      /^(echarts|chart\.js|d3|plotly|recharts|victory|nivo|@nivo)/.test(name),
    )
    expect(diagramm, 'die Diagramme kommen ohne Bibliothek aus').toEqual([])

    // Und kein ausgelieferter Baustein hat die Grössenordnung einer solchen
    // Bibliothek. Die Sprachdatei und das Hauptpaket sind die Ausnahmen.
    const dir = new URL('../dist/assets/', import.meta.url)
    const gross = readdirSync(dir)
      .filter((f) => f.endsWith('.js') && !/^(index|en)-/.test(f))
      .filter((f) => statSync(new URL(f, dir)).size > 200 * 1024)
    expect(gross, 'kein Baustein in der Grössenordnung einer Diagrammbibliothek').toEqual([])
  })

  test('das Profil steht sofort, ohne einen zweiten Ladevorgang', async ({ page }) => {
    const scripts: string[] = []
    await openDemo(page)
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url())
    })
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('img', { name: /Leistungsprofil/ }).first()).toBeVisible()
    // Der Bildschirm selbst wird nachgeladen; ein eigener Baustein für das
    // Diagramm darf nicht dabei sein.
    expect(scripts.filter((u) => /echarts/.test(u))).toEqual([])
  })

  test('das Diagramm verschiebt das Layout nicht', async ({ page }) => {
    await openDemo(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => document.fonts.ready)

    const probe = page.getByRole('button', { name: /Als Tabelle/ }).first()
    await probe.waitFor()
    const before = await probe.boundingBox()
    await expect(page.getByRole('img', { name: /Leistungsprofil/ }).first()).toBeVisible()
    await page.waitForTimeout(400)
    const after = await probe.boundingBox()

    // Ein Diagramm im Markup hat seine Höhe von Anfang an — es kann gar nicht
    // mehr nachträglich Platz nehmen.
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1)
  })

  test('der Weg zu den Zahlen bleibt', async ({ page }) => {
    // Diese Zusage galt schon, als sie das Auffangnetz für eine gescheiterte
    // Bibliothek war, und sie gilt weiter: wer das Diagramm nicht lesen kann
    // oder will, kommt an dieselben Zahlen.
    await openDemo(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
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
    //
    // Gewartet wird auf die aktive Registrierung, nicht darauf, dass der
    // Service Worker die Seite bereits übernommen hat. Gebraucht wird für
    // diesen Fall nur die Registrierung; die Übernahme kommt beim ersten
    // Aufruf irgendwann danach und hing unter Volllast am Zeitlimit — damit
    // hätte der Fall die Auslastung geprüft und nicht die App.
    await page.waitForFunction(
      async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        return registration?.active != null
      },
      null,
      { timeout: 90_000 },
    )

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

/**
 * Was jeder Start kostet.
 *
 * Gemessener Anlass: das Startpaket war 1,0 MB — bezahlt von jedem Aufruf,
 * auch dem, bei dem jemand nur einen Wert einträgt. Selten gebrauchte
 * Bildschirme und die zweite Sprache kommen deshalb erst beim Aufruf. Diese
 * Grenze hält den Stand fest; sie darf steigen, aber nicht unbemerkt.
 */
test.describe("Grösse des Startpakets", () => {
  const BUDGET_KB = 850;

  test(`das Hauptpaket bleibt unter ${BUDGET_KB} KB`, () => {
    const dir = new URL("../dist/assets/", import.meta.url);
    const entry = readdirSync(dir).find((f) => /^index-.*\.js$/.test(f));
    expect(entry, "kein gebautes Hauptpaket gefunden").toBeTruthy();
    const kb = statSync(new URL(entry!, dir)).size / 1024;
    expect(Math.round(kb), `${entry} ist ${Math.round(kb)} KB`).toBeLessThanOrEqual(BUDGET_KB);
  });

  test("die zweite Sprache liegt in einem eigenen Paket", () => {
    const dir = new URL("../dist/assets/", import.meta.url);
    const files = readdirSync(dir);
    expect(files.some((f) => /^en-.*\.js$/.test(f)), "en.json wird nicht mehr mitgeliefert").toBe(true);
  });
})
