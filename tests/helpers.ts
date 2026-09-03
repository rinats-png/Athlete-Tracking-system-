import { emptyData } from '../src/lib/store/schema'
import type { Page } from '@playwright/test'

/**
 * Google Fonts blockieren.
 *
 * In gesperrten Netzen hängt `networkidle` sonst bis zum Timeout — und das
 * Ergebnis der Prüfung hängt nicht davon ab, ob die Schrift geladen ist.
 */
export async function blockFonts(page: Page) {
  await page.route('**fonts.g**', (route) => route.abort())
}

/**
 * Sauberer Ausgangszustand.
 *
 * Bewusst NICHT über `addInitScript`: das läuft vor jeder Navigation erneut
 * und würde den gewählten Modus bei jedem `goto` wieder löschen — der Test
 * landete dann mitten im Ablauf zurück auf dem Willkommensbildschirm.
 */
async function resetState(page: Page) {
  await blockFonts(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // Ein eingerichteter, aber leerer Bestand: der Einstieg (Konzept §3) gilt
  // als durchlaufen, damit nicht jeder Fall zuerst sechs Schritte
  // beantworten muss. Die Fälle, die den Einstieg selbst prüfen, benutzen
  // `openFirstRun`.
  const seeded = emptyData()
  seeded.athletes[0].profile.onboardingCompletedAt = '2026-01-01T00:00:00.000Z'
  await page.evaluate((store) => {
    localStorage.clear()
    localStorage.setItem('baseline.theme', 'dark')
    localStorage.setItem('baseline.locale', 'de')
    localStorage.setItem('baseline.data.v1', JSON.stringify(store))
  }, seeded)
  await page.reload({ waitUntil: 'domcontentloaded' })
}

/** Startet die App im Gastmodus mit leerem Bestand. */
export async function openGuest(page: Page) {
  await resetState(page)
  await page.getByRole('button', { name: /Ohne Konto starten/ }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}

/**
 * Erster Start ohne jede Vorbelegung — inklusive des Einstiegs.
 * Nur für die Fälle, die genau diesen Ablauf prüfen.
 */
export async function openFirstRun(page: Page) {
  await blockFonts(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('baseline.theme', 'dark')
    localStorage.setItem('baseline.locale', 'de')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Ohne Konto starten/ }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}

/** Startet die App mit dem Demobestand. */
export async function openDemo(page: Page) {
  await resetState(page)
  await page.getByRole('button', { name: /Demo ansehen/ }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}

/** Geometrie der Navigationsleiste, sofern sie sichtbar ist. */
export async function bottomBarBox(page: Page) {
  return page.evaluate(() => {
    // Die Kopfnavigation trägt denselben Namen — hier ausdrücklich die
    // Leiste ausserhalb des <header>.
    const nav = [...document.querySelectorAll('nav[aria-label]')].find((n) => !n.closest('header'))
    if (!nav) return null
    const style = getComputedStyle(nav)
    if (style.display === 'none' || style.visibility === 'hidden') return null
    const rect = nav.getBoundingClientRect()
    if (rect.height === 0) return null

    // Massgeblich ist der SICHTBARE Ausschnitt, nicht der Layout-Viewport.
    // Genau dort fallen beide auseinander, wenn eine Tastatur offen ist,
    // gezoomt wird oder mobile Emulation läuft — und genau dort verschwand
    // die Leiste unter dem Bildschirmrand.
    const viewport = window.visualViewport
    const visibleBottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight

    return {
      position: style.position,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      height: Math.round(rect.height),
      layoutViewportHeight: window.innerHeight,
      visibleBottom: Math.round(visibleBottom),
      flushWithBottom: Math.abs(rect.bottom - visibleBottom) <= 2,
    }
  })
}

/** Ist ab dieser Breite die Kopfnavigation zuständig? */
export async function headerNavVisible(page: Page) {
  return page.evaluate(() => {
    const nav = [...document.querySelectorAll('nav[aria-label]')].find((n) => n.closest('header'))
    return !!nav && getComputedStyle(nav).display !== 'none'
  })
}

/**
 * Leerer Bestand EINES Athleten.
 *
 * Die Auswertungen arbeiten auf dieser Sicht, nicht auf dem Gesamtbestand des
 * Geräts — ein Test, der den Gesamtbestand hineinreicht, würde eine Struktur
 * prüfen, die im Produktivcode nie bei diesen Funktionen ankommt.
 */
export function emptyAthleteView() {
  const store = emptyData()
  const athlete = store.athletes[0]
  return {
    branding: store.branding,
    profile: athlete.profile,
    biometrics: athlete.biometrics,
    assessments: athlete.assessments,
    results: athlete.results,
  }
}
