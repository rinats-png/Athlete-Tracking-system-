import { expect, test } from "@playwright/test";
import { openDemo, openGuest, emptyAthleteView } from "./helpers";
import {
  EMPTY_QUERY,
  personalBests,
  queryHistory,
  searchWorthwhile,
} from "../src/domain/historyQuery";
import { nextAssessment } from "../src/domain/insights";
import type { AthleteData, StoredResult } from "../src/lib/store/localStore";

/**
 * Filtern, Suchen, Sortieren (§66–§68), Bestleistungen (§69) und der
 * festgelegte nächste Termin (§32).
 */

const result = (
  testSlug: string,
  performedAt: string,
  score: number,
  over: Partial<StoredResult> = {},
): StoredResult =>
  ({
    id: `${testSlug}-${performedAt}`,
    testSlug,
    performedAt: `${performedAt}T09:00:00.000Z`,
    values: {},
    metrics: {},
    score,
    bodyWeightKg: 82,
    ageYears: 30,
    sex: "male",
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: "", temperatureC: null, timeOfDay: null, equipment: "", trainingStatus: "" },
    createdAt: `${performedAt}T09:00:00.000Z`,
    ...over,
  }) as StoredResult;

const view = (results: StoredResult[]): AthleteData => ({
  ...emptyAthleteView(),
  results,
});

const sample = [
  result("back_squat_1rm", "2026-01-10", 150, { id: "s1" }),
  result("back_squat_1rm", "2026-03-10", 170, { id: "s2" }),
  result("cooper_12min", "2026-02-10", 2800, { id: "c1", assessmentId: "a1" }),
  result("illinois_agility", "2026-04-10", 17.2, { id: "i1" }),
];

test.describe("Filtern und Sortieren", () => {
  test("ohne Filter kommt alles zurück, neueste zuerst", () => {
    const rows = queryHistory(view(sample), EMPTY_QUERY, "de");
    expect(rows.map((r) => r.id)).toEqual(["i1", "s2", "c1", "s1"]);
  });

  test("nach Kategorie und Achse", () => {
    expect(
      queryHistory(view(sample), { ...EMPTY_QUERY, category: "endurance" }, "de").map((r) => r.id),
    ).toEqual(["c1"]);
    expect(
      queryHistory(view(sample), { ...EMPTY_QUERY, dimension: "agility" }, "de").map((r) => r.id),
    ).toEqual(["i1"]);
    // Die Kniebeuge zahlt auf Maxkraft UND Relativkraft ein.
    expect(
      queryHistory(view(sample), { ...EMPTY_QUERY, dimension: "relative_strength" }, "de").length,
    ).toBeGreaterThan(0);
  });

  test("nach Zeitraum, Grenzen eingeschlossen", () => {
    const rows = queryHistory(
      view(sample),
      { ...EMPTY_QUERY, from: "2026-02-10", to: "2026-03-10" },
      "de",
    );
    expect(rows.map((r) => r.id).sort()).toEqual(["c1", "s2"]);
  });

  test("nach Termin", () => {
    expect(
      queryHistory(view(sample), { ...EMPTY_QUERY, assessmentId: "a1" }, "de").map((r) => r.id),
    ).toEqual(["c1"]);
  });

  test("die Suche findet über den Testnamen und die Notiz", () => {
    expect(searchWorthwhile()).toBe(true);
    expect(
      queryHistory(view(sample), { ...EMPTY_QUERY, search: "cooper" }, "de").map((r) => r.id),
    ).toEqual(["c1"]);

    const withNote = [...sample, result("row_2000m", "2026-05-01", 430, { id: "r1", notes: "Nach Krankheit" })];
    expect(
      queryHistory(view(withNote), { ...EMPTY_QUERY, search: "krankheit" }, "de").map((r) => r.id),
    ).toEqual(["r1"]);
  });

  test("«bester» misst den Abstand zur eigenen Bestleistung, nicht den Rohwert", () => {
    // 170 kg und 2800 m sind keine gemeinsame Skala. Oben muss stehen, was
    // dem eigenen Maximum am nächsten liegt — hier die Bestleistungen
    // selbst, danach der schwächere Kniebeugewert.
    const rows = queryHistory(view(sample), { ...EMPTY_QUERY, sort: "best" }, "de");
    expect(rows[rows.length - 1].id).toBe("s1");

    const worst = queryHistory(view(sample), { ...EMPTY_QUERY, sort: "worst" }, "de");
    expect(worst[0].id).toBe("s1");
  });

  test("bei Zeitmessungen ist der kleinere Wert der bessere", () => {
    const times = [
      result("illinois_agility", "2026-01-01", 18.5, { id: "slow" }),
      result("illinois_agility", "2026-03-01", 16.9, { id: "fast" }),
    ];
    const rows = queryHistory(view(times), { ...EMPTY_QUERY, sort: "best" }, "de");
    expect(rows[0].id).toBe("fast");
  });
});

test.describe("Bestleistungen", () => {
  test("je Test genau eine, mit Zahl der Messungen", () => {
    const bests = personalBests(sample);
    expect(bests).toHaveLength(3);
    const squat = bests.find((b) => b.testSlug === "back_squat_1rm")!;
    expect(squat.result.id).toBe("s2");
    expect(squat.attempts).toBe(2);
  });

  test("bei Zeitmessungen ist die schnellste die beste", () => {
    const bests = personalBests([
      result("illinois_agility", "2026-01-01", 18.5, { id: "slow" }),
      result("illinois_agility", "2026-03-01", 16.9, { id: "fast" }),
    ]);
    expect(bests[0].result.id).toBe("fast");
  });

  test("Messungen ohne Wert erscheinen nicht", () => {
    expect(personalBests([result("back_squat_1rm", "2026-01-01", 0, { score: null })])).toEqual([]);
  });
});

test.describe("Festgelegter Termin", () => {
  const asOf = new Date("2026-05-01T12:00:00.000Z");
  const base = {
    id: "a1",
    title: null,
    batterySlug: null,
    performedOn: "2026-03-01",
    status: "completed" as const,
    plannedTestSlugs: [],
    readiness: null,
    nextAssessmentOn: null,
    createdAt: "2026-03-01T09:00:00.000Z",
    completedAt: "2026-03-01T18:00:00.000Z",
  };

  test("eine Festlegung schlägt den gerechneten Vorschlag", () => {
    const suggested = nextAssessment([base], [], asOf);
    expect(suggested.basis).toBe("last_assessment");

    const planned = nextAssessment([{ ...base, nextAssessmentOn: "2026-07-15" }], [], asOf);
    expect(planned.basis).toBe("planned");
    expect(planned.date).toBe("2026-07-15");
  });

  test("auch eine Festlegung kann überfällig werden", () => {
    const planned = nextAssessment([{ ...base, nextAssessmentOn: "2026-04-01" }], [], asOf);
    expect(planned.overdue).toBe(true);
  });
});

test.describe("In der Oberfläche", () => {
  test("Filter, Suche und Bestleistungen stehen im Verlauf", async ({ page }) => {
    await openDemo(page);
    await page.goto("/verlauf", { waitUntil: "domcontentloaded" });

    await expect(page.getByLabel("Suche")).toBeVisible();
    await expect(page.getByLabel("Kategorie")).toBeVisible();
    await expect(page.getByLabel("Sortierung")).toBeVisible();
    await expect(page.getByText("Bestleistungen")).toBeVisible();

    // Filtern reduziert die Liste und meldet, wie viel übrig bleibt.
    await page.getByLabel("Kategorie").selectOption("endurance");
    await expect(page.getByText(/^\d+ Messung(en)?$/).first()).toBeVisible();

    // Und der Weg zurück ist immer da.
    await page.getByRole("button", { name: "Zurücksetzen" }).click();
    await expect(page.getByLabel("Kategorie")).toHaveValue("all");
  });

  test("der nächste Termin lässt sich festlegen und überlebt einen Reload", async ({ page }) => {
    await openGuest(page);
    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Diagnostik anlegen" }).click();
    await page.waitForURL(/\/diagnostik\/[^/]+$/);

    await page.getByRole("link", { name: "Messen" }).first().click();
    await page.getByLabel(/Sprunghöhe/).first().fill("42");
    await page.getByRole("button", { name: "Ergebnis speichern" }).click();
    await page.waitForURL(/\/diagnostik\/[^/]+$/);
    await page.getByRole("button", { name: "Diagnostik abschliessen" }).click();
    await page.waitForURL(/\/abschluss$/);

    await page.getByLabel("Nächster Termin").fill("2026-12-01");
    await expect(page.getByText(/Von dir festgelegt/)).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Nächster Termin")).toHaveValue("2026-12-01");
  });
});
