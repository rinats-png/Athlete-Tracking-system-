import { expect, test } from "@playwright/test";
import { openGuest } from "./helpers";
import { DISCIPLINES } from "../src/data/sportProfiles";

/**
 * Der Testbereich ist sportartgeführt.
 *
 * Gemessener Fehler, gegen den diese Fälle stehen: der Bereich war nach
 * Fähigkeiten geordnet — Ausdauer, Kraft, Schnellkraft. Das ist die Sicht der
 * Trainingswissenschaft, nicht die des Athleten. Die Sportart steckte in
 * einem Profilfeld, das niemand aufsuchte; der Testbereich sah deshalb aus
 * wie ein allgemeiner Fitnesskatalog, und die Verbindung zwischen Sportart
 * und Test war nirgends sichtbar.
 */

test.describe("Sportart als Einstieg", () => {
  test("der Testbereich beginnt mit der Sportartwahl", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Sportart wählen").first()).toBeVisible();
    // Die Sportarten stehen offen da und nicht hinter einem Menü.
    await expect(page.getByRole("button", { name: /^Judo/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Ringen/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Feuerwehr/ })).toBeVisible();
  });

  test("jede Sportart aus der Liste ist antippbar", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });
    // Alle 39, nicht nur die des ersten Clusters.
    const buttons = page.locator("button[aria-pressed]");
    await expect(buttons).toHaveCount(DISCIPLINES.length);
  });

  test("die Suche findet eine Sportart über ihren Zweitnamen", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder(/Suchen/).fill("wrestling");
    // «Wrestling» ist der Zweitname von Ringen — wer so sucht, soll es finden.
    await expect(page.getByRole("button", { name: /^Ringen/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Judo/ })).toHaveCount(0);
  });

  test("nach der Wahl stehen die Tests dieser Sportart oben", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Judo/ }).click();

    await expect(page.getByText("Kerntests für Judo")).toBeVisible();
    await expect(page.getByText("Special Judo Fitness Test")).toBeVisible();
    await expect(page.getByText("Uchi-komi Fitness Test")).toBeVisible();
    // Und je Zeile, woher der Test kommt.
    await expect(page.getByText("aus der Quellliste").first()).toBeVisible();
  });

  test("der vollständige Katalog bleibt erreichbar", async ({ page }) => {
    // Wer einen Test sucht, den seine Disziplin nicht führt, soll ihn finden.
    // Er steht nur nicht mehr an erster Stelle.
    await openGuest(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Judo/ }).click();
    await expect(page.getByText("Übriger Katalog")).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /Kategorie/ })).toBeVisible();
  });

  test("die Wahl übersteht einen Neuladen und wirkt im Terminentwurf", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Kickboxen/ }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Deine Sportart")).toBeVisible();
    await expect(page.getByText("Kickboxen").first()).toBeVisible();

    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Vorschlag").first()).toBeVisible();
  });

  test("ohne Sportart weist der Startbildschirm den Weg", async ({ page }) => {
    await openGuest(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Ein neuer Nutzer landet im Leerzustand — genau dort muss der Weg stehen.
    const hint = page.getByRole("link", { name: /Sportart wählen/ }).first();
    await expect(hint).toBeVisible();
    await hint.click();
    await expect(page).toHaveURL(/\/tests$/);
  });

  test("mit Sportart führt der Startbildschirm zur Messung statt zur Wahl", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Judo/ }).click();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Sportart wählen/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Diagnostik starten|Start assessment/ }).first()).toBeVisible();
  });
});
