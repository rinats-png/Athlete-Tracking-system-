import { expect, test } from "@playwright/test";
import { openDemo, openGuest } from "./helpers";

const ROUTES = ["/", "/tests", "/verlauf", "/profil", "/analyse", "/diagnostik/neu", "/bericht"];

/**
 * Keine Seite darf seitlich aus dem Bildschirm laufen.
 *
 * Gemessener Fehler, gegen den dieser Fall steht: der Untertitel einer Fläche
 * war auf Nichtumbruch gesetzt. Damit war er die breiteste Stelle der Seite,
 * die Rasterspalte richtete sich nach ihm, und die Profilseite war auf dem
 * Telefon 922 statt 412 Pixel breit — man musste waagerecht schieben, um die
 * Eingabefelder zu sehen. Auffällig war es nicht: die Seite sah normal aus,
 * nur ein Teil stand ausserhalb.
 */
test.describe("Seitliches Überlaufen", () => {
  for (const route of ROUTES) {
    test(`${route} passt in die Bildschirmbreite`, async ({ page }) => {
      await openDemo(page);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Warten, bis nachgeladene Inhalte stehen — ein Diagramm, das später
      // kommt, könnte die Breite noch verändern.
      await page.waitForTimeout(300);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      // Ein Pixel Toleranz für Rundung bei ungeraden Gerätepixelverhältnissen.
      expect(scrollWidth, `${route}: ${scrollWidth} statt ${clientWidth}`).toBeLessThanOrEqual(
        clientWidth + 1,
      );
    });
  }

  test("auch mit aufgeklapptem Katalog bleibt der Terminentwurf in der Breite", async ({
    page,
  }) => {
    // Eingeklappt war die breiteste Stelle der Seite unsichtbar: die Reihe der
    // Fähigkeits-Chips. Der Fall öffnet sie deshalb ausdrücklich.
    await openDemo(page);
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Anzeigen$/ }).click();
    await page.waitForTimeout(200);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `${scrollWidth} statt ${clientWidth}`).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("auch mit gewählter Disziplin bleibt das Profil in der Breite", async ({ page }) => {
    // Die Sportartauswahl führt die längsten Texte der App: Disziplinnamen,
    // Begründung und Testliste stehen dort untereinander.
    await openGuest(page);
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem("baseline.data.v1") ?? "{}");
      Object.assign(store.athletes[0].profile, { disciplineId: "special_forces", sportCategoryId: "tactical" });
      localStorage.setItem("baseline.data.v1", JSON.stringify(store));
    });
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Hauptsportart ändern" }).click();
    await page.waitForTimeout(200);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
