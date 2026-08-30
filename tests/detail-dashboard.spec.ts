import { expect, test } from "@playwright/test";
import { openDemo, openGuest } from "./helpers";

/**
 * Test-Detailseite (§65) und Entscheidungszeile im Dashboard (§64).
 *
 * Beide beantworten dieselbe Grundfrage aus zwei Richtungen: was sehe ich,
 * bevor ich handle? Auf dem Dashboard sind es vier Zahlen, auf der
 * Detailseite ist es die Herkunft einer einzigen.
 */

test.describe("Test-Detailseite", () => {
  test("zeigt Protokoll, Stand, Entwicklung und alle Messungen", async ({ page }) => {
    await openDemo(page);
    await page.goto("/tests/back_squat_1rm/details", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Kniebeuge|Squat/);
    await expect(page.getByText("Wo du stehst")).toBeVisible();
    await expect(page.getByText("Bestleistung").first()).toBeVisible();
    await expect(page.getByText("Alle Messungen")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Protokoll" })).toBeVisible();

    // Die Bestleistung steht NEBEN dem letzten Wert, nicht statt seiner —
    // was jemand vor zwei Jahren konnte, ist eine andere Aussage.
    await expect(page.getByText("Letzte Messung")).toBeVisible();
  });

  test("ohne Messung wird das erklärt statt eine leere Tabelle zu zeigen", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests/murph/details", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/noch keine Messung vor/).first()).toBeVisible();
    // Das Protokoll steht trotzdem da — dafür kommt man hierher.
    await expect(page.getByRole("heading", { name: "Protokoll" })).toBeVisible();
  });

  test("fehlt die Referenz, wird der Grund genannt statt eines Strichs", async ({ page }) => {
    await openGuest(page);
    // Ohne Profil gibt es kein Geschlecht — und damit keinen Vergleich.
    await page.goto("/tests/sprint_30m", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^Zeit|Dauer/).first().fill("4.2");
    await page.getByRole("button", { name: "Ergebnis speichern" }).click();
    await page.waitForURL("**/verlauf");

    await page.goto("/tests/sprint_30m/details", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Ohne Geschlecht gibt es keinen Referenzvergleich/)).toBeVisible();
  });

  test("vom Katalog führt ein eigener Weg zu den Details", async ({ page }) => {
    await openDemo(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Details & Verlauf" }).first().click();
    await page.waitForURL(/\/details$/);
    await expect(page.getByText("Wo du stehst")).toBeVisible();
  });
});

test.describe("Entscheidungszeile", () => {
  test("die vier Zahlen stehen oben und führen zu ihrer Herleitung", async ({ page }) => {
    await openDemo(page);

    await expect(page.getByText("Gesamtleistung")).toBeVisible();
    await expect(page.getByText("Primärer Limiter")).toBeVisible();
    await expect(page.getByText("Grösste Veränderung")).toBeVisible();

    // Die Gesamtleistung trägt ihre Belastbarkeit mit — eine Zahl ohne sie
    // wäre in dieser App eine Behauptung.
    await expect(page.getByText(/Belastbarkeit \d+ %/)).toBeVisible();

    await page.getByText("Gesamtleistung").click();
    await page.waitForURL("**/analyse");
  });

  test("ohne Daten behauptet sie nichts", async ({ page }) => {
    await openGuest(page);
    // Der Leerzustand des Dashboards greift, bevor die Zeile etwas zeigt.
    await expect(page.getByText(/Noch keine Messung/)).toBeVisible();
    await expect(page.getByText("Primärer Limiter")).toHaveCount(0);
  });

  test("eine laufende Diagnostik verdrängt den Terminvorschlag", async ({ page }) => {
    await openDemo(page);
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Diagnostik anlegen" }).click();
    await page.waitForURL(/\/diagnostik\/[^/]+$/);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Laufende Diagnostik")).toBeVisible();
    await expect(page.getByText("Nächster Termin")).toHaveCount(0);
  });
});
