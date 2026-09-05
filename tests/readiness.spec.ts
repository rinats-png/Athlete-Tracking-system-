import { expect, test } from "@playwright/test";
import { openGuest } from "./helpers";
import {
  SLEEP_TARGET_MINUTES,
  formatSleepDuration,
  parseSleepDuration,
  readinessScore,
} from "../src/domain/readiness";
import type { ValidatedReadiness } from "../src/lib/store/schema";

/**
 * Selbsteinschätzung und Messbedingungen.
 *
 * Der Kern: die Bereitschaft darf nie mehr behaupten als die Zahl der
 * beantworteten Fragen hergibt, und aus fehlenden Antworten darf nichts
 * hochgerechnet werden.
 */

const readiness = (over: Partial<ValidatedReadiness> = {}): ValidatedReadiness => ({
  sleepMinutes: null,
  sleepQuality: null,
  fatigue: null,
  stress: null,
  soreness: null,
  motivation: null,
  recordedAt: "2026-04-01T06:30:00.000Z",
  ...over,
});

test.describe("Bereitschaft", () => {
  test("ohne jede Antwort gibt es keinen Wert statt eines Mittelwerts", () => {
    expect(readinessScore(null).score).toBeNull();
    expect(readinessScore(readiness()).score).toBeNull();
    expect(readinessScore(readiness()).answered).toBe(0);
  });

  test("fehlende Antworten werden nicht ersetzt, sondern ausgewiesen", () => {
    const score = readinessScore(readiness({ motivation: 10 }));
    expect(score.score).toBe(100);
    // Eine Antwort von sechs — die Zahl allein wäre irreführend.
    expect(score.answered).toBe(1);
    expect(score.total).toBe(6);
  });

  test("Skalen, bei denen hoch schlecht ist, werden gedreht", () => {
    // Ermüdung 10 = völlig erschöpft, muss zu 0 werden.
    expect(readinessScore(readiness({ fatigue: 10 })).score).toBe(0);
    expect(readinessScore(readiness({ fatigue: 1 })).score).toBe(100);
    // Motivation 10 = sehr hoch, bleibt 100.
    expect(readinessScore(readiness({ motivation: 10 })).score).toBe(100);
  });

  test("mehr Schlaf als das Ziel verbessert die Bewertung nicht weiter", () => {
    const target = readinessScore(readiness({ sleepMinutes: SLEEP_TARGET_MINUTES }));
    const excess = readinessScore(readiness({ sleepMinutes: SLEEP_TARGET_MINUTES * 1.5 }));
    expect(target.score).toBe(100);
    expect(excess.score).toBe(100);
  });

  test("alle beantworteten Fragen zählen gleich", () => {
    // Ohne Gewichtung: drei Antworten mit 10/1/10 auf einer gedrehten und
    // zwei normalen Skalen ergeben genau das ungewichtete Mittel.
    const score = readinessScore(
      readiness({ motivation: 10, fatigue: 1, sleepQuality: 10 }),
    );
    expect(score.score).toBe(100);
    expect(score.answered).toBe(3);
  });

  test("Schlafdauer wird als Uhrzeit und als Dezimalzahl verstanden", () => {
    expect(parseSleepDuration("7:30")).toBe(450);
    // Punkt und Komma sind Dezimaltrennzeichen, nicht Uhrzeittrenner: als
    // Uhrzeit gelesen wären «7.5» sieben Stunden und fünf Minuten — 25
    // Minuten daneben, und niemand würde es bemerken.
    expect(parseSleepDuration("7.5")).toBe(450);
    expect(parseSleepDuration("7,5")).toBe(450);
    expect(parseSleepDuration("")).toBeNull();
    // 7:75 gibt es nicht.
    expect(parseSleepDuration("7:75")).toBeNull();
    expect(parseSleepDuration("keine Ahnung")).toBeNull();
    expect(formatSleepDuration(450)).toBe("7:30");
  });
});

test.describe("Bereitschaft im Ablauf", () => {
  test("sie lässt sich erfassen, überspringen und trägt ihre Grundlage mit", async ({
    page,
  }) => {
    await openGuest(page);
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Diagnostik anlegen" }).click();
    await page.waitForURL(/\/diagnostik\/[^/]+$/);

    // Standardmässig nicht erfasst — kein Pflichtschritt.
    await expect(page.getByText("Nicht erfasst")).toBeVisible();

    await page.getByRole("button", { name: "Erfassen" }).click();
    await expect(page.getByText(/Freiwillig/)).toBeVisible();

    await page.getByLabel("Schlafdauer").fill("7:30");
    await page.getByLabel("Motivation").fill("9");
    await page.getByRole("button", { name: "Übernehmen" }).click();

    // Der Wert steht mit der Zahl der beantworteten Fragen daneben.
    await expect(page.getByText(/von 6 Fragen beantwortet/)).toBeVisible();

    // Und überlebt einen Reload.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(/von 6 Fragen beantwortet/)).toBeVisible();
  });

  test("eine unsinnige Schlafdauer wird benannt", async ({ page }) => {
    await openGuest(page);
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Diagnostik anlegen" }).click();
    await page.getByRole("button", { name: "Erfassen" }).click();

    await page.getByLabel("Schlafdauer").fill("7:99");
    await expect(page.getByRole("alert")).toContainText(/Stunden:Minuten/);
  });
});

/**
 * Der Bestand im Speicher.
 *
 * Gesucht wird nach der FORM, nicht nach dem Namen: der Bestand ist der
 * einzige Eintrag, dessen Wert ein JSON-Objekt ist. Eine Ausschlussliste von
 * Nebenschlüsseln war zu spröde — mit «baseline.sportAsked» kam ein neuer
 * hinzu, und der Fall las danach dessen Wert «1» statt der Daten.
 */
async function readStore(page: import("@playwright/test").Page) {
  // Der Schluessel wird benannt, nicht gesucht: es liegen mehrere
  // JSON-Eintraege unter `baseline.*` (Bestand, Konto), und "der erste, der
  // mit { beginnt" traf irgendwann den falschen.
  return page.evaluate(() => localStorage.getItem("baseline.data.v1"));
}

test.describe("Messbedingungen", () => {
  test("sie sind eingeklappt, optional und werden mitgespeichert", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests/sprint_30m", { waitUntil: "domcontentloaded" });

    // Eingeklappt: der Hinweis steht da, die Felder nicht.
    await expect(page.getByText(/hilft aber später beim Einordnen/)).toBeVisible();
    await expect(page.getByLabel("Untergrund")).toHaveCount(0);

    await page.getByRole("button", { name: /Bedingungen/ }).click();
    await page.getByLabel("Untergrund").fill("Tartanbahn, trocken");
    await page.getByLabel("Temperatur (°C)").fill("18");

    await page.getByLabel(/^Zeit|Dauer/).first().fill("4.2");
    await page.getByRole("button", { name: "Ergebnis speichern" }).click();
    await page.waitForURL("**/ergebnis/**");

    const raw = await readStore(page);
    expect(raw).toContain("Tartanbahn");
    expect(raw).toContain('"temperatureC":18');
  });

  test("ohne Angabe bleibt der Kontext leer statt geraten", async ({ page }) => {
    await openGuest(page);
    await page.goto("/tests/sprint_30m", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^Zeit|Dauer/).first().fill("4.2");
    await page.getByRole("button", { name: "Ergebnis speichern" }).click();
    await page.waitForURL("**/ergebnis/**");

    const raw = await readStore(page);
    expect(raw).toContain('"surface":""');
    expect(raw).toContain('"temperatureC":null');
  });
});
