import { expect, test } from "@playwright/test";
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  emptyData,
  parseStoredData,
} from "../src/lib/store/schema";
import type { StoredResult } from "../src/lib/store/localStore";
import { exportData, importData, loadData } from "../src/lib/store/localStore";

/**
 * Bestandsschutz.
 *
 * Diese Fälle halten die Zusage fest, dass ein Nutzer seine Historie nicht
 * verliert: nicht beim Versionswechsel, nicht bei einem beschädigten
 * Datensatz und nicht beim Zurückspielen einer alten Exportdatei. Bricht
 * einer dieser Tests, ist der Schaden für den Nutzer irreversibel — deshalb
 * stehen sie ohne Browser und laufen in jedem Durchgang mit.
 */

const APP_VERSION = "test";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

test.beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
});

const result = (
  id: string,
  overrides: Record<string, unknown> = {},
): StoredResult =>
  ({
    id,
    testSlug: "cooper_12min",
    performedAt: "2026-05-01T09:00:00.000Z",
    values: { distanceM: 3200 },
    metrics: { vo2max_ml_kg_min: 60.25 },
    score: 60.25,
    bodyWeightKg: 82,
    ageYears: 34,
    sex: "male",
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: "2026-05-01T09:05:00.000Z",
    ...overrides,
  }) as StoredResult;

/** Bestand mit genau einem Athleten, der diese Ergebnisse trägt. */
const storeWith = (results: StoredResult[] = []) => {
  const base = emptyData();
  return { ...base, athletes: [{ ...base.athletes[0], results }] };
};

test.describe("Migration", () => {
  test("die Kette ist lückenlos und endet auf der aktuellen Version", () => {
    let version = 1;
    for (const step of MIGRATIONS) {
      expect(step.from).toBe(version);
      expect(step.to).toBe(version + 1);
      version = step.to;
    }
    expect(version).toBe(CURRENT_SCHEMA_VERSION);
  });

  test("ein v1-Bestand wird angehoben, ohne Ergebnisse zu verlieren", () => {
    const v1 = {
      version: 1,
      profile: { firstName: "Ada", locale: "de" },
      biometrics: [],
      results: [result("r1"), result("r2")].map(
        ({ assessmentId: _drop, ...rest }) => rest,
      ),
    };

    const { data, report } = parseStoredData(v1);

    expect(report.migratedFrom).toBe(1);
    expect(report.rejected).toEqual([]);
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION);
    // Vier Schemastände auf einmal: der Bestand landet als erster Athlet,
    // vollständig und ohne dass irgendwo geraten wurde.
    expect(data?.athletes).toHaveLength(1);
    const athlete = data!.athletes[0];
    expect(athlete.results.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(athlete.results.every((r) => r.assessmentId === null)).toBe(true);
    expect(athlete.results.every((r) => r.attempts.length === 0)).toBe(true);
    expect(athlete.assessments).toEqual([]);
    expect(athlete.profile.firstName).toBe("Ada");
    expect(data?.role).toBe("solo");
    expect(data?.activeAthleteId).toBe(athlete.id);
  });

  test("ein neuerer Bestand wird nicht angefasst, sondern gemeldet", () => {
    const { data, report } = parseStoredData({
      ...emptyData(),
      version: CURRENT_SCHEMA_VERSION + 1,
      unbekanntesFeld: "darf nicht verloren gehen",
    });

    expect(report.fromNewerVersion).toBe(true);
    // Kein Bestand heisst hier: nicht überschreiben. Ein stilles Downgrade
    // würde die unbekannten Felder beim nächsten Speichern löschen.
    expect(data).toBeNull();
  });
});

test.describe("Rettung beschädigter Bestände", () => {
  test("ein kaputter Datensatz kostet nicht die ganze Historie", () => {
    const { data, report } = parseStoredData({
      ...storeWith([
        result("gut"),
        result("kaputt", { performedAt: "gestern" }),
        result("auchGut"),
      ]),
    });

    expect(data?.athletes[0].results.map((r) => r.id)).toEqual([
      "gut",
      "auchGut",
    ]);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0].kind).toBe("result");
    // Die Kennung nennt den Athleten mit, sonst ist bei mehreren Kunden nicht
    // erkennbar, wessen Datensatz fehlt.
    expect(report.rejected[0].id).toContain("kaputt");
    expect(report.rejected[0].reason).toContain("performedAt");
  });

  test("NaN und Infinity aus einer manipulierten Datei werden abgewiesen", () => {
    const { data } = parseStoredData(
      storeWith([result("inf", { score: Number.POSITIVE_INFINITY })]),
    );
    expect(data?.athletes[0].results).toEqual([]);
  });
});

test.describe("Export und Import", () => {
  test("Rundlauf: exportiert und wieder eingelesen ergibt denselben Bestand", () => {
    const base = emptyData();
    const original = {
      ...base,
      athletes: [
        {
          ...base.athletes[0],
          name: "Ada",
          profile: {
            ...base.athletes[0].profile,
            firstName: "Ada",
            sex: "female" as const,
          },
          results: [result("r1")],
          assessments: [
            {
              id: "a1",
              title: "Frühjahrstest",
              batterySlug: "general_fitness",
              performedOn: "2026-05-01",
              status: "completed" as const,
              plannedTestSlugs: ["cooper_12min"],
              readiness: null, nextAssessmentOn: null,
              createdAt: "2026-05-01T08:00:00.000Z",
              completedAt: "2026-05-01T10:00:00.000Z",
            },
          ],
        },
      ],
    };

    const outcome = importData(exportData(original, APP_VERSION));

    expect(outcome.error).toBeNull();
    expect(outcome.ok).toBe(true);
    expect(outcome.data).toEqual(original);
    // Und der Bestand liegt danach wirklich im Speicher.
    expect(loadData().data).toEqual(original);
  });

  test("ein Export ohne Umschlag bleibt lesbar", () => {
    const bare = JSON.stringify(storeWith([result("r1")]));
    const outcome = importData(bare);
    expect(outcome.ok).toBe(true);
    expect(outcome.data?.athletes[0].results).toHaveLength(1);
  });

  test("unbrauchbare Dateien werden benannt statt still verworfen", () => {
    expect(importData("{kein json").error).toBe("invalid_json");
    expect(importData('{"format":"etwas anderes"}').error).toBe(
      "unknown_format",
    );
    expect(
      importData(
        JSON.stringify({ ...emptyData(), version: CURRENT_SCHEMA_VERSION + 1 }),
      ).error,
    ).toBe("newer_version");
  });

  test("ein fehlgeschlagener Import lässt den vorhandenen Bestand stehen", () => {
    const bestand = storeWith([result("r1")]);
    importData(exportData(bestand, APP_VERSION));

    expect(importData("{kein json").ok).toBe(false);
    expect(loadData().data.athletes[0].results.map((r) => r.id)).toEqual(["r1"]);
  });
});

test.describe("Import in der Oberfläche", () => {
  test("eine unbrauchbare Datei wird benannt statt stillschweigend geschluckt", async ({
    page,
  }) => {
    const { openGuest } = await import("./helpers");
    await openGuest(page);

    // Erst eigene Daten anlegen — sie müssen den misslungenen Import
    // überstehen.
    await page.goto("/tests/standing_broad_jump", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByLabel(/Sprungweite|Weite|Distanz/)
      .first()
      .fill("2.40");
    await page.getByRole("button", { name: "Ergebnis speichern" }).click();
    await page.waitForURL("**/verlauf");

    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Importieren").setInputFiles({
      name: "kaputt.json",
      mimeType: "application/json",
      buffer: Buffer.from("{das ist kein json"),
    });

    // Der Grund steht da, nicht nur ein allgemeines Scheitern.
    await expect(page.getByRole("alert")).toContainText(/kein gültiges JSON/);

    // Und der eigene Bestand ist unversehrt.
    await page.goto("/verlauf", { waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByText(/240\s*cm/)
        .first(),
    ).toBeVisible();
  });

  test("eine fremde JSON-Datei wird als solche erkannt", async ({ page }) => {
    const { openGuest } = await import("./helpers");
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Importieren").setInputFiles({
      name: "fremd.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ irgendwas: true })),
    });

    await expect(page.getByRole("alert")).toContainText(/kein BASELINE-Export/);
  });
});
