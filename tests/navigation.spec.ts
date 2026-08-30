import { expect, test } from '@playwright/test'
import { bottomBarBox, headerNavVisible, openDemo, openGuest } from './helpers'

/**
 * Die Zusage lautet: die Navigation ist immer erreichbar. Diese Datei prüft
 * genau das — an jeder Scrollposition, auf jeder Breite, über Routenwechsel
 * und Orientierungswechsel hinweg.
 */

test.describe('Navigation dauerhaft erreichbar', () => {
  test('genau eine Navigation ist sichtbar', async ({ page }) => {
    await openDemo(page)
    const bar = await bottomBarBox(page)
    const header = await headerNavVisible(page)

    // Nie beide gleichzeitig, nie keine von beiden.
    expect(Boolean(bar) !== header, 'genau eine Navigation sichtbar').toBe(true)
  })

  test('Leiste bleibt an jeder Scrollposition am unteren Rand', async ({ page }) => {
    await openDemo(page)
    const bar = await bottomBarBox(page)
    test.skip(!bar, 'Auf dieser Breite übernimmt die Kopfzeile')

    const maxScroll = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )

    for (const y of [0, Math.round(maxScroll / 3), Math.round(maxScroll / 2), maxScroll, 999999]) {
      await page.evaluate((v) => window.scrollTo(0, v), y)
      await page.waitForTimeout(120)
      const box = await bottomBarBox(page)
      expect(box, `Leiste bei Scrollposition ${y}`).not.toBeNull()
      expect(box!.position, 'fixed statt sticky').toBe('fixed')
      expect(box!.flushWithBottom, `bündig bei Scrollposition ${y}`).toBe(true)
    }
  })

  test('Leiste überlebt Routenwechsel ohne Neumontage', async ({ page }, testInfo) => {
    // Im Profil mit auseinanderfallenden Viewports scrollt Playwright im
    // Layout-Viewport, trifft aber im sichtbaren — synthetische Klicks landen
    // dort unzuverlässig. Das ist ein Artefakt der Emulation, kein Fehler der
    // App; die dort entscheidende Eigenschaft (Verankerung am sichtbaren
    // Rand) prüfen die übrigen Fälle dieser Datei.
    test.skip(
      testInfo.project.name === 'phone-split-viewport',
      'Synthetische Klicks sind bei getrennten Viewports nicht aussagekräftig',
    )
    await openDemo(page)
    const bar = await bottomBarBox(page)
    test.skip(!bar, 'Auf dieser Breite übernimmt die Kopfzeile')

    // Markierung am DOM-Knoten: bleibt sie erhalten, wurde nicht neu montiert.
    await page.evaluate(() => {
      const nav = [...document.querySelectorAll('nav[aria-label]')].find((n) => !n.closest('header'))
      nav?.setAttribute('data-probe', 'original')
    })

    for (const label of [/^Diagnostik$/, /^Verlauf$/, /^Profil$/, /^Start$/]) {
      await page.getByRole('button', { name: label }).first().click()
      await page.waitForTimeout(150)
      const still = await page.evaluate(() => {
        const nav = [...document.querySelectorAll('nav[aria-label]')].find(
          (n) => !n.closest('header'),
        )
        return nav?.getAttribute('data-probe')
      })
      expect(still, 'Leiste nicht neu montiert').toBe('original')
    }
  })

  test('kein bedienbares Element liegt unter der Leiste', async ({ page }) => {
    await openDemo(page)
    const bar = await bottomBarBox(page)
    test.skip(!bar, 'Auf dieser Breite übernimmt die Kopfzeile')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(200)

    const covered = await page.evaluate(() => {
      const nav = [...document.querySelectorAll('nav[aria-label]')].find(
        (n) => !n.closest('header'),
      )!
      const navBox = nav.getBoundingClientRect()
      return [...document.querySelectorAll('main button, main a, main input, main select')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.height > 0 && r.bottom > navBox.top && r.top < navBox.bottom
        })
        .map((el) => el.textContent?.trim().slice(0, 30) ?? el.tagName)
    })

    expect(covered, 'nichts liegt unter der Leiste').toEqual([])
  })

  test('aktiver Eintrag folgt der Route und übersteht einen Reload', async ({ page }) => {
    await openDemo(page)
    await page.getByRole('button', { name: /^Verlauf$/ }).first().click()
    await expect(page).toHaveURL(/\/verlauf$/)

    await page.reload({ waitUntil: 'domcontentloaded' })
    const current = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-current="page"]')].map((el) =>
        el.textContent?.trim(),
      ),
    )
    expect(current.join(' ')).toMatch(/Verlauf/i)
  })
})

test.describe("Aufgeräumte Kopfzeile", () => {
  test("Sprache und Erscheinungsbild stehen im Profil, nicht in der Kopfzeile", async ({
    page,
  }) => {
    // Beides wird einmal eingestellt und danach jahrelang nicht angefasst.
    // Eine Einstellung, die auf jedem Bildschirm Platz belegt, obwohl sie
    // einmal im Jahr gebraucht wird, ist Ballast.
    await openGuest(page);

    const header = page.locator("header").first();
    await expect(header.getByRole("radiogroup", { name: /Sprache|Language/ })).toHaveCount(0);
    await expect(header.getByRole("radiogroup", { name: /Darstellung|Appearance/ })).toHaveCount(0);

    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("radiogroup", { name: /Sprache|Language/ })).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: /Darstellung|Appearance/ }),
    ).toBeVisible();
  });

  test("die Einstellung bleibt nach dem Umschalten erhalten", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("radio", { name: /^Hell$|^Light$/ }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("radio", { name: /^Hell$|^Light$/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
