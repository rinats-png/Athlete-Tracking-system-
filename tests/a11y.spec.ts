import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'

/**
 * Zugänglichkeit: mit der Tastatur und mit einer Hilfstechnik bedienbar.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: geprüft war bisher, dass Trefferflächen gross
 * genug und Kontraste ausreichend sind — also das, was jemand SIEHT. Ob man
 * ohne Maus überhaupt bis zum Speichern-Knopf kommt, hat nichts geprüft.
 *
 * Ein Trainer mit dem Klemmbrett in der Hand bedient das Formular mit der
 * Tabulatortaste. Wer eine Messung nicht ohne Zeigegerät eintragen kann,
 * benutzt die App nicht.
 */

const ROUTES = ['/', '/tests', '/verlauf', '/profil', '/analyse']

test.describe('Bedienbar ohne Zeigegerät', () => {
  for (const route of ROUTES) {
    test(`auf ${route} führt die Tabulatortaste durch die Seite`, async ({ page }) => {
      await openDemo(page)
      if (route !== '/') await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { level: 1 }).first().waitFor()

      // Zwanzig Sprünge genügen, um zu sehen, ob der Fokus überhaupt wandert
      // und nicht in einem Element hängen bleibt.
      const seen = new Set<string>()
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab')
        const where = await page.evaluate(() => {
          const el = document.activeElement
          if (!el || el === document.body) return null
          return `${el.tagName}:${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? ''}`
        })
        if (where) seen.add(where)
      }
      expect(seen.size, 'der Fokus muss über mehrere Ziele wandern').toBeGreaterThan(3)
    })
  }

  test('eine Messung lässt sich ohne Maus eintragen und speichern', async ({ page }) => {
    await openDemo(page)
    await page.goto('/tests/pull_up_max_reps', { waitUntil: 'domcontentloaded' })

    const feld = page.getByLabel(/Wiederholungen|^Reps/).first()
    await feld.focus()
    await page.keyboard.type('17')

    // Vom Feld aus mit der Tastatur bis zum Speichern — ohne einen Klick.
    const speichern = page.getByRole('button', { name: 'Ergebnis speichern' })
    for (let i = 0; i < 25; i++) {
      const drauf = await speichern.evaluate((el) => el === document.activeElement)
      if (drauf) break
      await page.keyboard.press('Tab')
    }
    await expect(speichern).toBeFocused()
    await page.keyboard.press('Enter')
    await page.waitForURL('**/ergebnis/**')
  })
})

test.describe('Für eine Hilfstechnik lesbar', () => {
  for (const route of ROUTES) {
    test(`auf ${route} hat jedes Bedienelement einen Namen`, async ({ page }) => {
      await openDemo(page)
      if (route !== '/') await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { level: 1 }).first().waitFor()

      const namenlos = await page.evaluate(() => {
        const out: string[] = []
        const targets = document.querySelectorAll('button, a[href], input, select, textarea')
        for (const el of targets) {
          const style = getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden') continue
          if (el.getAttribute('aria-hidden') === 'true') continue
          const label =
            el.getAttribute('aria-label') ??
            el.getAttribute('title') ??
            (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null) ??
            el.closest('label')?.textContent ??
            (el as HTMLElement).innerText
          if (!label || !label.trim()) out.push(`${el.tagName}.${el.className}`.slice(0, 60))
        }
        return out
      })
      // Ein namenloser Knopf wird von einer Sprachausgabe als «Schaltfläche»
      // vorgelesen — das ist keine Bedienung, das ist Raten.
      expect(namenlos, 'jedes Bedienelement braucht einen Namen').toEqual([])
    })
  }

  test('die Seite nennt ihre Sprache und hat genau eine Hauptüberschrift', async ({ page }) => {
    await openDemo(page)
    expect(await page.locator('html').getAttribute('lang')).toBeTruthy()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })

  test('der erste Tabulatorsprung führt an der Navigation vorbei zum Inhalt', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => document.body.focus())

    // Ohne diesen Sprung tabbt sich jemand auf JEDER Seite erneut durch die
    // gesamte Navigation, bevor er beim Inhalt ankommt.
    await page.keyboard.press('Tab')
    const sprung = page.getByRole('link', { name: 'Zum Inhalt springen' })
    await expect(sprung).toBeFocused()
    // Und er ist erst sichtbar, wenn er den Fokus hat.
    await expect(sprung).toBeVisible()

    // Er ist weggeblendet, bis er den Fokus hat — dann muss er aber eine
    // Fläche haben, die man auch treffen kann.
    const box = await sprung.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)

    await page.keyboard.press('Enter')
    expect(new URL(page.url()).hash).toBe('#main')
  })
})
