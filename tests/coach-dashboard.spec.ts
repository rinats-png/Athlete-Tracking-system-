import { expect, test } from "@playwright/test";
import { openGuest } from "./helpers";
import { athleteRows, coachSummary, overallTrend, THIN_DATA_CONFIDENCE } from "../src/domain/coach";
import { emptyData } from "../src/lib/store/schema";
import type { StoredAthlete, StoredResult } from "../src/lib/store/localStore";

/**
 * Trainerübersicht (§37, §38).
 *
 * Der Kern: «braucht Aufmerksamkeit» ist keine Bewertung der Person,
 * sondern ein Hinweis auf einen benannten Grund. Eine Markierung ohne
 * nachvollziehbaren Grund wäre ein Ampelgefühl und in einer Diagnostik
 * wertlos.
 */

const asOf = new Date("2026-05-01T12:00:00.000Z");

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

const athlete = (over: Partial<StoredAthlete> = {}): StoredAthlete => ({
  ...emptyData().athletes[0],
  id: "a1",
  name: "Athlet A",
  ...over,
});

test.describe("Athletenzeilen", () => {
  test("ohne Messung wird das als Grund genannt, nicht als schlechte Leistung", () => {
    const [row] = athleteRows([athlete()], asOf);
    expect(row.overall).toBeNull();
    expect(row.attention).toEqual(["no_assessment"]);
    // Ausdrücklich NICHT als überfällig oder fallend markiert — über
    // jemanden ohne Messung ist schlicht nichts bekannt.
    expect(row.attention).not.toContain("overdue");
    expect(row.attention).not.toContain("declining");
  });

  test("ein überfälliger Termin wird benannt", () => {
    const [row] = athleteRows(
      [athlete({ results: [result("back_squat_1rm", "2025-06-01", 150)] })],
      asOf,
    );
    expect(row.attention).toContain("overdue");
  });

  test("eine fallende Serie schlägt sich in Trend und Hinweis nieder", () => {
    const [row] = athleteRows(
      [
        athlete({
          results: [
            result("back_squat_1rm", "2026-02-01", 170, { id: "r1" }),
            result("back_squat_1rm", "2026-03-01", 162, { id: "r2" }),
            result("back_squat_1rm", "2026-04-20", 154, { id: "r3" }),
          ],
        }),
      ],
      asOf,
    );
    expect(row.trend).toBe("declining");
    expect(row.attention).toContain("declining");
  });

  test("der Gesamttrend ist ein Mehrheitsentscheid, kein Mittelwert", () => {
    const data = {
      ...emptyData().athletes[0],
      results: [
        // Kniebeuge steigend
        result("back_squat_1rm", "2026-01-01", 150, { id: "s1" }),
        result("back_squat_1rm", "2026-02-01", 160, { id: "s2" }),
        result("back_squat_1rm", "2026-03-01", 170, { id: "s3" }),
        // Bankdrücken steigend
        result("bench_press_1rm", "2026-01-01", 100, { id: "b1" }),
        result("bench_press_1rm", "2026-02-01", 105, { id: "b2" }),
        result("bench_press_1rm", "2026-03-01", 110, { id: "b3" }),
        // Cooper fallend
        result("cooper_12min", "2026-01-01", 3000, { id: "c1" }),
        result("cooper_12min", "2026-02-01", 2900, { id: "c2" }),
        result("cooper_12min", "2026-03-01", 2800, { id: "c3" }),
      ],
    };
    expect(
      overallTrend({
        branding: emptyData().branding,
        profile: data.profile,
        biometrics: [],
        assessments: [],
        results: data.results,
      }),
    ).toBe("improving");
  });

  test("eine dünne Datenlage wird als solche markiert", () => {
    // Eine einzige frische Messung: Aktualität und Qualität schlagen voll
    // aus, Abdeckung und Messtiefe nicht — 58 von 100. Für eine Aussage
    // reicht das nicht.
    const [row] = athleteRows(
      [athlete({ results: [result("back_squat_1rm", "2026-04-25", 150)] })],
      asOf,
    );
    expect(row.confidence).toBe(58);
    expect(row.confidence).toBeLessThan(THIN_DATA_CONFIDENCE);
    expect(row.attention).toContain("thin_data");
  });

  test("archivierte Athleten erscheinen nicht in der Liste", () => {
    const rows = athleteRows(
      [athlete(), athlete({ id: "a2", name: "Archiviert", archived: true })],
      asOf,
    );
    expect(rows.map((r) => r.id)).toEqual(["a1"]);
  });
});

test.describe("Kennzahlen des Trainers", () => {
  test("gezählt werden nur abgeschlossene Termine des laufenden Monats", () => {
    const withAssessments = athlete({
      assessments: [
        {
          id: "x1", title: null, batterySlug: null, performedOn: "2026-05-10",
          status: "completed", plannedTestSlugs: [], readiness: null,
          createdAt: "2026-05-10T09:00:00.000Z", completedAt: "2026-05-10T18:00:00.000Z",
        },
        {
          id: "x2", title: null, batterySlug: null, performedOn: "2026-05-20",
          status: "in_progress", plannedTestSlugs: [], readiness: null,
          createdAt: "2026-05-20T09:00:00.000Z", completedAt: null,
        },
        {
          id: "x3", title: null, batterySlug: null, performedOn: "2026-04-10",
          status: "completed", plannedTestSlugs: [], readiness: null,
          createdAt: "2026-04-10T09:00:00.000Z", completedAt: "2026-04-10T18:00:00.000Z",
        },
      ],
    });
    // Ein laufender Termin ist noch kein Ergebnis, ein Termin im Vormonat
    // gehört nicht in diesen Monat.
    expect(coachSummary([withAssessments], asOf).assessmentsThisMonth).toBe(1);
  });
});

test.describe("Trainerbereich in der Oberfläche", () => {
  test("im Einzelmodus wird erklärt, warum hier nichts steht", async ({ page }) => {
    await openGuest(page);
    await page.goto("/trainer", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Trainermodus nicht aktiv")).toBeVisible();
    await expect(page.getByRole("link", { name: "Modus umstellen" })).toBeVisible();
  });

  test("im Trainermodus steht eine Zeile je Athlet mit benanntem Grund", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("radio", { name: "Trainer" }).click();
    await page.getByRole("textbox", { name: /^Name von/ }).first().fill("Mara Vogt");
    await page.getByRole("button", { name: "Athlet hinzufügen" }).first().click();
    await page.getByRole("textbox", { name: /^Name von/ }).last().fill("Jonas Bauer");

    await page.goto("/trainer", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("rowheader", { name: /Mara Vogt/ })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: /Jonas Bauer/ })).toBeVisible();

    // Beide ohne Messung — der Grund steht da, nicht bloss eine Markierung.
    await expect(page.getByText("Noch keine Messung").first()).toBeVisible();
    await expect(page.getByText("Braucht Aufmerksamkeit", { exact: true })).toBeVisible();
  });

  test("der Filter zeigt nur markierte Athleten", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("radio", { name: "Trainer" }).click();
    await page.getByRole("textbox", { name: /^Name von/ }).first().fill("Mara Vogt");

    await page.goto("/trainer", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Nur markierte" }).click();
    await expect(page.getByRole("rowheader", { name: /Mara Vogt/ })).toBeVisible();
  });

  test("ein Klick auf den Namen wechselt zu diesem Athleten", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("radio", { name: "Trainer" }).click();
    await page.getByRole("textbox", { name: /^Name von/ }).first().fill("Mara Vogt");
    await page.getByRole("button", { name: "Athlet hinzufügen" }).first().click();
    await page.getByRole("textbox", { name: /^Name von/ }).last().fill("Jonas Bauer");

    await page.goto("/trainer", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Mara Vogt" }).click();
    await expect(page.getByRole("button", { name: /Mara Vogt/ }).last()).toBeVisible();
  });
});
