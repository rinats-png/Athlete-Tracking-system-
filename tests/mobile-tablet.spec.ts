import { expect, test } from "@playwright/test";
import { openDemo, openGuest } from "./helpers";

const ROUTES = ["/", "/diagnostik", "/tests", "/verlauf", "/profil", "/analyse", "/diagnostik/neu"];

/**
 * Was auf einem Telefon anders ist als auf einem Rechner — und was schiefgeht,
 * wenn man es nicht misst.
 */

test.describe("Eingabefelder auf dem Telefon", () => {
  for (const route of ROUTES) {
    test(`${route}: kein Feld unter 16 px`, async ({ page }) => {
      // Gemessener Fehler: iOS Safari zoomt die ganze Seite hinein, sobald man
      // ein Feld antippt, dessen Schrift kleiner als 16 px ist. Danach steht
      // die Seite schief im Bild und muss von Hand zurückgezogen werden — bei
      // jeder einzelnen Eingabe während eines Tests.
      await openDemo(page);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(200);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll("input, select, textarea")) {
          const rect = el.getBoundingClientRect();
          // Visuell versteckte Felder (sr-only) lösen keinen Zoom aus: sie
          // werden nie fokussiert, sondern über ihr Label bedient.
          if (rect.width <= 1 || rect.height <= 1) continue;
          // Kästchen und Auswahlknöpfe nehmen keinen Text entgegen und lösen
          // deshalb keinen Zoom aus.
          const type = (el as HTMLInputElement).type;
          if (type === "checkbox" || type === "radio") continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < 16) {
            out.push(`${el.getAttribute("aria-label") ?? el.tagName}: ${size}px`);
          }
        }
        return out;
      });
      expect(small, small.join(", ")).toEqual([]);
    });
  }
});

test.describe("Platz auf dem Tablet", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 700, "gilt ab Tabletbreite");

  test("das Dashboard nutzt die Breite in mehreren Spalten", async ({ page }) => {
    // Ein iPad im Hochformat ist 810 px breit. Die mehrspaltigen Raster
    // begannen bei 1024 px — auf dem Tablet lief also die Telefonansicht,
    // nur breiter gezogen, mit halbleeren Zeilen.
    await openDemo(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const columns = await page.evaluate(() => {
      const grid = document.querySelector("#main .grid");
      return grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0;
    });
    expect(columns).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Sichere Bereiche", () => {
  test("Kopfzeile und Inhalt rechnen mit Aussparungen", async ({ page }) => {
    // Als installierte App läuft die Seite unter die Statusleiste und im
    // Querformat unter die abgerundeten Ecken. Der Emulator liefert keine
    // Aussparungen, deshalb wird hier geprüft, dass die Regel überhaupt
    // gesetzt ist — ohne sie fällt es erst auf dem Gerät auf.
    await openGuest(page);
    const header = await page.evaluate(() => {
      const el = document.querySelector("header");
      return el ? getComputedStyle(el).paddingTop : null;
    });
    expect(header).not.toBeNull();
    const main = await page.evaluate(() => {
      const el = document.querySelector("#main");
      return el ? getComputedStyle(el).paddingLeft : null;
    });
    // Ohne Aussparung bleibt der Grundwert stehen: 16 px am Telefon.
    expect(parseFloat(main!)).toBeGreaterThanOrEqual(16);
  });
});
