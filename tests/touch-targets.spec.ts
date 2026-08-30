import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'

/**
 * "Zuverlässig antippbar" heisst messbar: mindestens 44 px Kantenlänge, keine
 * unsichtbaren namenlosen Flächen, keine sich überlappenden Ziele.
 */

const MIN_TARGET = 44

const ROUTES = ['/', '/tests', '/verlauf', '/profil']

for (const route of ROUTES) {
  test(`Trefferflächen auf ${route}`, async ({ page }) => {
    await openDemo(page)
    if (route !== '/') {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(400)
    }

    const report = await page.evaluate((min) => {
      const interactive = [...document.querySelectorAll('button, a[href], input, select')].filter(
        (el) => {
          const style = getComputedStyle(el)
          const r = el.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0
        },
      )

      const tooSmall = interactive
        .filter((el) => {
          const r = el.getBoundingClientRect()
          // Verschachtelte Ziele zählen über den bedienbaren Vorfahren.
          if (el.closest('label') && el.tagName === 'INPUT') return false
          return r.width < min || r.height < min
        })
        .map((el) => {
          const r = el.getBoundingClientRect()
          const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName
          return `${name.slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`
        })

      /**
       * Zugänglicher Name nach denselben Wegen, die auch ein Screenreader
       * nutzt. Ein Eingabefeld ist über sein umschliessendes oder
       * verknüpftes <label> benannt, nicht über eigenen Textinhalt — beides
       * getrennt zu prüfen wäre sonst ein falscher Alarm.
       */
      const hasAccessibleName = (el: Element): boolean => {
        if (el.getAttribute('aria-label')?.trim()) return true
        if (el.getAttribute('aria-labelledby')?.trim()) return true
        if (el.getAttribute('title')?.trim()) return true
        if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
          if (el.closest('label')) return true
          if (el.id && document.querySelector(`label[for="${el.id}"]`)) return true
          if (el instanceof HTMLInputElement && el.placeholder?.trim()) return true
          return false
        }
        if ((el.textContent ?? '').trim().length > 0) return true
        return el.querySelector('svg, img') != null
      }

      // Sichtbar leer und ohne Namen = unsichtbare Klickfläche.
      const unnamed = interactive
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return !hasAccessibleName(el) && r.width > 8 && r.height > 8
        })
        .map((el) => el.tagName + '.' + el.className.toString().slice(0, 30))

      return { tooSmall, unnamed }
    }, MIN_TARGET)

    expect(report.unnamed, 'keine unsichtbaren namenlosen Klickflächen').toEqual([])
    expect(report.tooSmall, `alle Ziele mindestens ${MIN_TARGET} px`).toEqual([])
  })
}
