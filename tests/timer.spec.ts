import { expect, test } from "@playwright/test";
import { openGuest } from "./helpers";

/**
 * Die Uhr während eines Tests. Ein Fehler hier macht nicht die Anzeige
 * falsch, sondern die Messung — und man sieht es dem Ergebnis nicht an.
 */

test.describe("Zeitvorgabe", () => {
  test("hält den Bildschirm wach, solange sie läuft", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Bildschirmsperre nur in Chromium prüfbar");
    // Vor jeder Navigation einhängen, sonst greift die Aufzeichnung erst nach
    // dem Laden — und der Aufruf beim Start wäre schon vorbei.
    await page.addInitScript(() => {
      const w = window as unknown as { __wakeLocks: string[] };
      w.__wakeLocks = [];
      const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<unknown> } };
      const original = nav.wakeLock?.request?.bind(nav.wakeLock);
      if (nav.wakeLock && original) {
        nav.wakeLock.request = async (type: string) => {
          w.__wakeLocks.push(type);
          return original(type);
        };
      }
    });
    await openGuest(page);

    await page.goto("/tests/cooper_12min", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Start/ }).first().click();
    await page.waitForTimeout(300);

    const locks = await page.evaluate(
      () => (window as unknown as { __wakeLocks?: string[] }).__wakeLocks ?? [],
    );
    // Ohne die Sperre schaltet das Telefon während eines Zwölf-Minuten-Laufs
    // ab, und die Zeit steht hinter dem Sperrbildschirm.
    expect(locks).toContain("screen");
  });

  test("zählt gegen die Wanduhr, nicht gegen die Zahl der Ticks", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests/cooper_12min", { waitUntil: "domcontentloaded" });

    // Uhrzeit vorspulen, ohne die Zeit real verstreichen zu lassen: ein
    // Zähler auf Tick-Basis bliebe stehen, die Wanduhr springt.
    await page.getByRole("button", { name: /Start/ }).first().click();
    // Erst nach einer vollen Sekunde ändert sich die Anzeige: gerundet wird
    // aufwärts, damit «12:00» nicht sofort auf «11:59» springt.
    await page.waitForTimeout(1400);
    expect(await page.locator("output").first().innerText()).toBe("11:59");
  });

  test("die Uhr lässt sich anhalten und zurücksetzen", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests/cooper_12min", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Start/ }).first().click();
    await page.waitForTimeout(1400);
    await page.getByRole("button", { name: /Pause/ }).click();
    const paused = await page.locator("output").first().innerText();
    await page.waitForTimeout(400);
    // Angehalten heisst angehalten — auch wenn das Intervall weiterliefe.
    expect(await page.locator("output").first().innerText()).toBe(paused);

    await page.getByRole("button", { name: /Zurücksetzen|Reset/ }).click();
    expect(await page.locator("output").first().innerText()).toBe("12:00");
  });
});
