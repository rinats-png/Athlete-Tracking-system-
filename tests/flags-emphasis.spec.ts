import { expect, test } from "@playwright/test";
import { openDemo } from "./helpers";
import {
  SIGNIFICANT_CHANGE_PERCENT,
  flagsFor,
  largestRegression,
} from "../src/domain/flags";
import { allEmphasis, emphasisConfidence, emphasisFor } from "../src/domain/emphasis";
import { testsForDimension } from "../src/domain/insights";
import { PERFORMANCE_DIMENSIONS } from "../src/types/domain";
import type { StoredResult } from "../src/lib/store/localStore";

/**
 * Markierungen (§70–§72), RPE-Analyse (§26) und Trainingsschwerpunkte (§30).
 *
 * Die Grenze, die hier bewacht wird: ein Schwerpunkt darf Qualitäten und
 * einen Umfang nennen, aber keinen Trainingsplan. Der Datentyp hat kein Feld
 * für Übungen, Sätze oder Wiederholungen — und ein Test hält das fest.
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

test.describe("Markierungen", () => {
  test("die erste Messung wird als solche markiert, nicht bewertet", () => {
    const first = result("back_squat_1rm", "2026-01-01", 150);
    const kinds = flagsFor(first, [first]).map((f) => f.kind);
    expect(kinds).toContain("insufficient_data");
    // Eine erste Messung ist zwangsläufig auch die beste — das ist eine
    // Information, keine Leistung.
    expect(kinds).toContain("personal_best");
    expect(kinds).not.toContain("significant_improvement");
  });

  test("eine deutliche Verbesserung wird mit ihrem Beleg genannt", () => {
    const history = [
      result("back_squat_1rm", "2026-01-01", 150, { id: "a" }),
      result("back_squat_1rm", "2026-03-01", 165, { id: "b" }),
    ];
    const flag = flagsFor(history[1], history).find(
      (f) => f.kind === "significant_improvement",
    );
    expect(flag?.values.changePercent).toBe(10);
  });

  test("eine Verschlechterung wird genauso benannt wie eine Verbesserung", () => {
    const history = [
      result("back_squat_1rm", "2026-01-01", 165, { id: "a" }),
      result("back_squat_1rm", "2026-03-01", 150, { id: "b" }),
    ];
    const kinds = flagsFor(history[1], history).map((f) => f.kind);
    expect(kinds).toContain("significant_regression");
    expect(kinds).not.toContain("personal_best");
  });

  test("knapp unter der Schwelle wird nichts gemeldet", () => {
    const history = [
      result("back_squat_1rm", "2026-01-01", 100, { id: "a" }),
      result("back_squat_1rm", "2026-03-01", 104, { id: "b" }),
    ];
    expect(SIGNIFICANT_CHANGE_PERCENT).toBe(5);
    const kinds = flagsFor(history[1], history).map((f) => f.kind);
    expect(kinds).not.toContain("significant_improvement");
  });

  test("bei Zeitmessungen ist schneller eine Verbesserung", () => {
    const history = [
      result("illinois_agility", "2026-01-01", 18, { id: "a" }),
      result("illinois_agility", "2026-03-01", 17, { id: "b" }),
    ];
    const kinds = flagsFor(history[1], history).map((f) => f.kind);
    expect(kinds).toContain("significant_improvement");
    expect(kinds).toContain("personal_best");
  });

  test("mehr Leistung bei weniger Anstrengung wird als solche erkannt", () => {
    // §26: RPE wird nicht nur gespeichert, sondern gelesen.
    const history = [
      result("back_squat_1rm", "2026-01-01", 150, { id: "a", values: { rpe: 9 } }),
      result("back_squat_1rm", "2026-03-01", 165, { id: "b", values: { rpe: 8 } }),
    ];
    const flag = flagsFor(history[1], history).find((f) => f.kind === "efficiency_gain");
    expect(flag?.values.changePercent).toBe(10);
    expect(flag?.values.rpeDelta).toBe(1);
  });

  test("mehr Leistung bei MEHR Anstrengung ist kein Effizienzgewinn", () => {
    const history = [
      result("back_squat_1rm", "2026-01-01", 150, { id: "a", values: { rpe: 7 } }),
      result("back_squat_1rm", "2026-03-01", 165, { id: "b", values: { rpe: 10 } }),
    ];
    expect(
      flagsFor(history[1], history).some((f) => f.kind === "efficiency_gain"),
    ).toBe(false);
  });

  test("ein submaximaler Versuch wird markiert", () => {
    const r = result("back_squat_1rm", "2026-03-01", 150, { values: { rpe: 6 } });
    const flag = flagsFor(r, [r]).find((f) => f.kind === "submaximal_effort");
    expect(flag?.values.rpe).toBe(6);
  });
});

test.describe("Grösste Verschlechterung", () => {
  test("gefunden wird die stärkste, nicht die jüngste", () => {
    const results = [
      result("back_squat_1rm", "2026-01-01", 165, { id: "a" }),
      result("back_squat_1rm", "2026-02-01", 150, { id: "b" }), // −9,1 %
      result("cooper_12min", "2026-01-01", 3000, { id: "c" }),
      result("cooper_12min", "2026-03-01", 2400, { id: "d" }), // −20 %
    ];
    const worst = largestRegression(results);
    expect(worst?.result.id).toBe("d");
    expect(worst?.changePercent).toBe(-20);
  });

  test("ohne Verschlechterung über der Schwelle gibt es keine Meldung", () => {
    const results = [
      result("back_squat_1rm", "2026-01-01", 150, { id: "a" }),
      result("back_squat_1rm", "2026-02-01", 165, { id: "b" }),
    ];
    expect(largestRegression(results)).toBeNull();
  });
});

test.describe("Trainingsschwerpunkte", () => {
  test("jede Achse hat einen Schwerpunkt mit Fokus, Umfang und Nachweis", () => {
    const all = allEmphasis();
    expect(all).toHaveLength(PERFORMANCE_DIMENSIONS.length);
    for (const e of all) {
      expect(e.focusKeys.length, e.dimension).toBeGreaterThan(0);
      expect(e.sessionsPerWeek[0], e.dimension).toBeGreaterThan(0);
      expect(e.sessionsPerWeek[1], e.dimension).toBeGreaterThanOrEqual(e.sessionsPerWeek[0]);
      expect(e.weeksToRetest[1], e.dimension).toBeGreaterThanOrEqual(e.weeksToRetest[0]);
      // Der Nachweis muss wirklich auf diese Achse einzahlen.
      expect(e.verifyWith.length, e.dimension).toBeGreaterThan(0);
      for (const slug of e.verifyWith) {
        expect(testsForDimension(e.dimension), `${e.dimension}: ${slug}`).toContain(slug);
      }
    }
  });

  test("der Umfang ist eine Bandbreite, keine Punktzahl", () => {
    for (const e of allEmphasis()) {
      // Eine Punktzahl («3,5 Einheiten pro Woche») würde eine Genauigkeit
      // vortäuschen, die niemand belegen kann.
      expect(e.sessionsPerWeek[1], e.dimension).toBeGreaterThan(e.sessionsPerWeek[0]);
      expect(e.weeksToRetest[1], e.dimension).toBeGreaterThan(e.weeksToRetest[0]);
    }
  });

  test("ein Schwerpunkt enthält keinen Trainingsplan", () => {
    // Der Datentyp hat gar kein Feld für Übungen, Sätze oder
    // Wiederholungen. Bricht dieser Test, wurde die Grenze verschoben.
    for (const e of allEmphasis()) {
      expect(Object.keys(e).sort()).toEqual(
        ["dimension", "focusKeys", "sessionsPerWeek", "verifyWith", "weeksToRetest"].sort(),
      );
    }
  });

  test("die Belastbarkeit wird von der Achse geerbt", () => {
    expect(emphasisConfidence("strong")).toBe("high");
    expect(emphasisConfidence("moderate")).toBe("medium");
    expect(emphasisConfidence("weak")).toBe("low");
  });

  test("neuromuskuläre Achsen werden früher nachgemessen als aerobe", () => {
    // Die Faustregel hinter den Zeitfenstern, festgenagelt.
    expect(emphasisFor("power").weeksToRetest[0]).toBeLessThan(
      emphasisFor("endurance").weeksToRetest[0],
    );
    expect(emphasisFor("agility").weeksToRetest[0]).toBeLessThan(
      emphasisFor("max_strength").weeksToRetest[0],
    );
  });
});

test.describe("In der Oberfläche", () => {
  test("Schwerpunkt und Abgrenzung stehen zusammen", async ({ page }) => {
    await openDemo(page);
    await page.goto("/analyse", { waitUntil: "domcontentloaded" });

    const emphasis = page.getByText("Schwerpunkt", { exact: true }).first();
    if ((await emphasis.count()) > 0) {
      await expect(emphasis).toBeVisible();
      await expect(page.getByText(/keine medizinische oder trainingsplanerische/)).toBeVisible();
      await expect(page.getByText(/Nachprüfen mit:/)).toBeVisible();
    } else {
      // Kein Limiter im Demobestand: dann darf auch kein Schwerpunkt
      // dastehen — eine Empfehlung ohne Befund wäre erfunden.
      await expect(page.getByText(/Nachprüfen mit:/)).toHaveCount(0);
    }
  });
});
