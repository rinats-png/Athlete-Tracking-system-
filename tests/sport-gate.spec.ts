import { expect, test } from "@playwright/test";
import { openFirstRun } from "./helpers";

/**
 * Die Sportart wird vor allem anderen gefragt.
 *
 * Begründung, die auch in der Datei steht: ohne Sportart schlägt die App eine
 * allgemeine Batterie vor. Wer damit beginnt, misst Dinge, die für seine
 * Disziplin wenig aussagen — und merkt es erst, wenn Monate an Messungen
 * zusammengekommen sind, die sich nicht vergleichen lassen.
 */

test.describe("Sportartfrage beim ersten Start", () => {
  test("sie steht vor der App, nicht darin", async ({ page }) => {
    await openFirstRun(page);
    await expect(page.getByRole("heading", { name: /Welche Sportart/ })).toBeVisible();
    // Keine Navigationsleiste, kein Dashboard: die Frage ist der ganze Bildschirm.
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("sie lässt sich nicht durch eine Route umgehen", async ({ page }) => {
    await openFirstRun(page);
    await page.goto("/verlauf", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Welche Sportart/ })).toBeVisible();
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Welche Sportart/ })).toBeVisible();
  });

  test("alle Sportarten stehen zur Wahl", async ({ page }) => {
    await openFirstRun(page);
    await expect(page.getByRole("button", { name: /^Judo/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Marathon/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Feuerwehr/ })).toBeVisible();
  });

  test("der allgemeine Weg ist gleichwertig und keine Sackgasse", async ({ page }) => {
    // Wer eine Sportart betreibt, die nicht in der Liste steht, darf nicht
    // das Gefühl bekommen, die App sei nichts für ihn.
    await openFirstRun(page);
    await page.getByRole("button", { name: /Allgemeine Diagnostik/ }).click();
    await expect(page.getByRole("heading", { name: /Welche Sportart/ })).toHaveCount(0);
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Allgemeine Diagnostik").first()).toBeVisible();
  });

  test("nach der Antwort kommt sie nicht wieder", async ({ page }) => {
    await openFirstRun(page);
    await page.getByRole("button", { name: /^Judo/ }).click();
    await expect(page.getByRole("heading", { name: /Welche Sportart/ })).toHaveCount(0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Welche Sportart/ })).toHaveCount(0);
  });

  test("die Wahl wirkt sofort auf den Diagnostikvorschlag", async ({ page }) => {
    await openFirstRun(page);
    await page.getByRole("button", { name: /^Judo/ }).click();
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Tests für Judo").first()).toBeVisible();
    await expect(page.getByText("Special Judo Fitness Test").first()).toBeVisible();
  });
});

test.describe("Diagnostik anlegen, sportartgeführt", () => {
  const withJudo = async (page: import("@playwright/test").Page) => {
    await openFirstRun(page);
    await page.getByRole("button", { name: /^Judo/ }).click();
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
  };

  test("die Kerntests stehen oben, mit Begründung je Test", async ({ page }) => {
    await withJudo(page);
    await expect(page.getByText("Tests für Judo").first()).toBeVisible();
    // Die Begründung steht an der Zeile, nicht in einem Tooltip: auf dem
    // Telefon gibt es kein Überfahren mit der Maus.
    await expect(
      page.getByText(/Der etablierteste sportartspezifische Test im Kampfsport/),
    ).toBeVisible();
  });

  test("die Kerntests sind vorausgewählt", async ({ page }) => {
    await withJudo(page);
    // Sechs Haken, ohne dass jemand etwas angetippt hat.
    expect(await page.locator('input[type="checkbox"]:checked').count()).toBe(6);
  });

  test("weitere Tests lassen sich dazunehmen", async ({ page }) => {
    await withJudo(page);
    const before = await page.locator('input[type="checkbox"]:checked').count();
    await page.getByRole("button", { name: /^Anzeigen$/ }).click();
    const box = page.locator('input[type="checkbox"]:not(:checked)').first();
    await box.check();
    expect(await page.locator('input[type="checkbox"]:checked').count()).toBe(before + 1);
  });

  test("der Umfang sagt, was mehr Tests bewirken — und was nicht", async ({ page }) => {
    await withJudo(page);
    await expect(page.getByText("Umfang dieses Termins")).toBeVisible();
    // Der Satz muss den Unterschied benennen: breitere Grundlage, nicht
    // genauere Einzelmessung. Sonst verspricht die App Präzision, die kein
    // Test liefert.
    await expect(page.getByText(/Genauigkeit der einzelnen Messung ändert sich dadurch nicht/)).toBeVisible();
  });

  test("die allgemeine Diagnostik bleibt wählbar", async ({ page }) => {
    await withJudo(page);
    await expect(page.getByText("Allgemeine Diagnostik").first()).toBeVisible();
    await page.getByRole("button", { name: /Allgemeine Fitness/ }).click();
    await expect(page.getByRole("button", { name: /Allgemeine Fitness/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
