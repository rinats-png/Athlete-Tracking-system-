import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Die Farbrollen der App, gemessen an der gerenderten Oberfläche.
 *
 * WARUM DIESE DATEI EXISTIERT
 *
 * Eine Palette wird nach Aussehen gewählt und nach Lesbarkeit verantwortet.
 * Beim Umstellen auf die neue Palette fiel auf, dass zwei Rollen der alten
 * Fassung die Schwelle nie erreicht hatten: «warning» stand als Schriftfarbe
 * bei 1,6:1 auf hellem Grund — sichtbar nur für den, der weiss, wo er
 * hinsehen muss. Ohne eine Messung fällt so etwas erst dem Nutzer auf, und
 * der sagt es niemandem.
 *
 * Gemessen wird gegen WCAG 2.1 AA:
 *   4,5:1 für Fliesstext
 *   3,0:1 für grosse Schrift, Bedienelemente und Diagrammlinien
 *
 * Trennlinien und Gitter tragen keine Bedeutung und stehen deshalb nicht in
 * dieser Liste — eine Linie, die man kaum sieht, ist eine Gestaltungsfrage,
 * keine Zugänglichkeitsfrage.
 */

const BODY_TEXT = 4.5
const LARGE_OR_UI = 3.0

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const lum = (rgb: [number, number, number]) => {
    const [r, g, bl] = rgb.map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Wahrnehmbarer Farbabstand nach CIE76. Ab etwa 25 gelten zwei Farben als
 *  klar verschieden, auch für die meisten Formen der Farbsehschwäche. */
function deltaE(a: [number, number, number], b: [number, number, number]): number {
  const lab = ([r, g, bl]: [number, number, number]) => {
    const lin = [r, g, bl].map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    const x = (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.95047
    const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    const z = (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.08883
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
  }
  const [la, lb] = [lab(a), lab(b)]
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2])
}

/** Liest die Farbrollen so aus, wie der Browser sie tatsächlich auflöst. */
async function roles(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    const read = (name: string): [number, number, number] => {
      probe.style.color = style.getPropertyValue(name).trim()
      const parsed = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g) ?? []
      return [Number(parsed[0]), Number(parsed[1]), Number(parsed[2])]
    }
    const names = [
      'plane', 'surface', 'surface-raised', 'surface-sunken',
      'ink', 'ink-secondary', 'ink-muted',
      'accent', 'accent-ink', 'accent-text',
      'series-1', 'series-2', 'series-3', 'reference',
      'good', 'warning', 'critical', 'delta-up', 'delta-down',
    ]
    const out: Record<string, [number, number, number]> = {}
    for (const name of names) out[name] = read(`--${name}`)
    probe.remove()
    return out
  })
}

const GROUNDS = ['plane', 'surface', 'surface-raised', 'surface-sunken'] as const

/** Schrift- und Grafikrollen mit ihrer Mindestschwelle. */
const ON_GROUND: [string, number][] = [
  ['ink', BODY_TEXT],
  ['ink-secondary', BODY_TEXT],
  ['ink-muted', BODY_TEXT],
  ['accent-text', BODY_TEXT],
  ['good', BODY_TEXT],
  ['warning', BODY_TEXT],
  ['critical', BODY_TEXT],
  ['delta-up', BODY_TEXT],
  ['delta-down', BODY_TEXT],
  ['series-1', LARGE_OR_UI],
  ['series-2', LARGE_OR_UI],
  ['series-3', LARGE_OR_UI],
  ['reference', LARGE_OR_UI],
]

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Farbkontraste (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await openGuest(page)
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    })

    test('jede Schriftrolle ist auf jeder Fläche lesbar', async ({ page }) => {
      const role = await roles(page)
      const failures: string[] = []
      for (const ground of GROUNDS) {
        for (const [name, threshold] of ON_GROUND) {
          const ratio = contrast(role[name], role[ground])
          if (ratio < threshold) {
            failures.push(`${name} auf ${ground}: ${ratio.toFixed(2)}:1 (nötig ${threshold}:1)`)
          }
        }
      }
      expect(failures).toEqual([])
    })

    test('die Schrift auf der Akzentfläche ist lesbar', async ({ page }) => {
      const role = await roles(page)
      // Buttons tragen Fliesstextgrösse — hier gilt die strengere Schwelle.
      expect(contrast(role['accent-ink'], role.accent)).toBeGreaterThanOrEqual(BODY_TEXT)
    })

    test('die drei Datenreihen sind voneinander unterscheidbar', async ({ page }) => {
      const role = await roles(page)
      // Gemessen wird der wahrnehmbare Abstand (ΔE), nicht der
      // Helligkeitskontrast: eine grüne und eine blaue Linie können gleich
      // hell sein und trotzdem sofort auseinanderzuhalten. Umgekehrt wären
      // zwei Grünstufen mit grossem Helligkeitsabstand auf einem Display in
      // der Sonne dennoch eine Linie.
      expect(deltaE(role['series-1'], role['series-2'])).toBeGreaterThan(25)
      expect(deltaE(role['series-2'], role['series-3'])).toBeGreaterThan(25)
      expect(deltaE(role['series-1'], role['series-3'])).toBeGreaterThan(25)
    })

    test('die Statusfarben sind von der Marke getrennt', async ({ page }) => {
      const role = await roles(page)
      // Eine Statusfarbe, die aussieht wie die Marke, sagt nichts mehr aus.
      for (const status of ['good', 'warning', 'critical'] as const) {
        expect(contrast(role[status], role.accent), status).toBeGreaterThan(1.25)
      }
    })
  })
}
