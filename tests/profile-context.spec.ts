import { expect, test } from "@playwright/test";
import { openGuest, openDemo } from "./helpers";
import { bodyComposition, compositionChange } from "../src/domain/bodyComposition";
import {
  BAND_THRESHOLDS,
  benchmarkResult,
  coverageByDimension,
  performanceBand,
} from "../src/domain/benchmark";
import { emptyData } from "../src/lib/store/schema";
import type { AthleteData, StoredResult } from "../src/lib/store/localStore";

/**
 * Athletenkontext, Körperzusammensetzung und Einordnung.
 *
 * Der rote Faden: eine Zahl darf nie mehr behaupten als ihre Grundlage. Ein
 * Leistungsband ist eine andere Darstellung desselben Perzentils, eine
 * fettfreie Masse ohne Körperfettmessung gibt es nicht, und eine Abdeckung
 * von 40 % muss als solche dastehen.
 */

const view = (over: Partial<AthleteData> = {}): AthleteData => {
  const base = emptyData();
  const a = base.athletes[0];
  return {
    branding: base.branding,
    profile: a.profile,
    biometrics: a.biometrics,
    assessments: a.assessments,
    results: a.results,
    ...over,
  };
};

const bio = (measuredOn: string, kg: number, fat: number | null = null) => ({
  id: `b-${measuredOn}`,
  measuredOn,
  bodyWeightKg: kg,
  bodyFatPercent: fat,
  restingHr: null,
  createdAt: `${measuredOn}T07:00:00.000Z`,
});

const result = (over: Partial<StoredResult> = {}): StoredResult =>
  ({
    id: "r1",
    testSlug: "cooper_12min",
    performedAt: "2026-04-01T09:00:00.000Z",
    // Cooper: der gespeicherte Primärwert ist die Distanz, die Referenz
    // liegt auf der daraus geschätzten VO2max.
    values: { distanceM: 2750 },
    metrics: { vo2max_ml_kg_min: 50.2 },
    score: 2750,
    bodyWeightKg: 82,
    ageYears: 30,
    sex: "male",
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: "2026-04-01T09:00:00.000Z",
    ...over,
  }) as StoredResult;

test.describe("Körperzusammensetzung", () => {
  test("ohne Körperfettmessung gibt es keine Fettmasse statt einer geschätzten", () => {
    const c = bodyComposition(
      view({ biometrics: [bio("2026-04-01", 82)], profile: { ...view().profile, heightCm: 181 } }),
    );
    expect(c?.bodyWeightKg).toBe(82);
    expect(c?.fatMassKg).toBeNull();
    expect(c?.fatFreeMassKg).toBeNull();
    // Der BMI braucht nur Gewicht und Grösse und ist deshalb da.
    expect(c?.bmi).toBeCloseTo(25.0, 1);
  });

  test("mit Körperfett ergänzen sich Fettmasse und fettfreie Masse zum Gewicht", () => {
    const c = bodyComposition(view({ biometrics: [bio("2026-04-01", 80, 15)] }));
    expect(c?.fatMassKg).toBe(12);
    expect(c?.fatFreeMassKg).toBe(68);
    expect((c!.fatMassKg as number) + (c!.fatFreeMassKg as number)).toBe(80);
  });

  test("ohne Körpergrösse gibt es keinen BMI statt eines falschen", () => {
    expect(bodyComposition(view({ biometrics: [bio("2026-04-01", 80)] }))?.bmi).toBeNull();
  });

  test("die Veränderung nennt Gewicht und fettfreie Masse getrennt", () => {
    const change = compositionChange(
      view({ biometrics: [bio("2026-01-01", 80, 15), bio("2026-04-01", 83, 14)] }),
      "2026-01-01T12:00:00.000Z",
      "2026-04-01T12:00:00.000Z",
    );
    expect(change?.weightDeltaKg).toBe(3);
    // +3 kg Gewicht, davon 3,6 kg fettfrei — ohne diese Trennung wäre die
    // Zunahme nicht lesbar.
    expect(change?.fatFreeDeltaKg).toBe(3.4);
    expect(change?.days).toBe(90);
  });
});

test.describe("Leistungsband", () => {
  test("die Bänder decken die ganze Skala lückenlos ab", () => {
    for (let p = 0; p <= 100; p += 1) {
      expect(performanceBand(p), `Perzentil ${p}`).not.toBeNull();
    }
    expect(BAND_THRESHOLDS[BAND_THRESHOLDS.length - 1].minPercentile).toBe(0);
  });

  test("die Zuordnung folgt den ausgewiesenen Schwellen", () => {
    expect(performanceBand(34)).toBe("recreational");
    expect(performanceBand(35)).toBe("trained");
    expect(performanceBand(60)).toBe("advanced");
    expect(performanceBand(80)).toBe("competitive");
    expect(performanceBand(95)).toBe("elite");
  });

  test("ohne Perzentil gibt es kein Band", () => {
    expect(performanceBand(null)).toBeNull();
  });
});

test.describe("Einordnung eines Ergebnisses", () => {
  test("die Referenz wird auch gefunden, wenn sie nicht auf der Primärkennzahl liegt", () => {
    // Beim Cooper-Test ist die Primärkennzahl die Laufdistanz, die Referenz
    // liegt auf der VO2max. Eine Suche allein über die Primärkennzahl fand
    // hier nie etwas und zeigte still einen Strich.
    const verdict = benchmarkResult(result(), view().profile);
    expect(verdict.percentile).not.toBeNull();
    expect(verdict.percentile).toBeGreaterThan(50);
    expect(verdict.percentile).toBeLessThan(80);
  });

  test("die fehlende Angabe wird benannt, nicht nur weggelassen", () => {
    const noSex = benchmarkResult(result({ sex: null }), view().profile);
    expect(noSex.missingReason).toBe("no_sex");
    expect(noSex.percentile).toBeNull();

    const noAge = benchmarkResult(result({ ageYears: null }), view().profile);
    expect(noAge.missingReason).toBe("no_age");
  });

  test("das Ergebnis trägt die Herkunft der Referenz mit", () => {
    const verdict = benchmarkResult(result(), view().profile);
    expect(verdict.percentile).not.toBeNull();
    expect(verdict.band).not.toBeNull();
    // Solange die Referenz nicht belegt ist, muss das an jeder Zahl hängen.
    expect(verdict.validated).toBe(false);
    expect(verdict.datasetId).toBe("baseline_v0_placeholder");
  });

  test("ein abweichendes Leistungsniveau wird als solches gekennzeichnet", () => {
    const base = view().profile;
    expect(
      benchmarkResult(result(), { ...base, performanceLevel: "elite" }).populationMismatch,
    ).toBe(true);
    expect(
      benchmarkResult(result(), { ...base, performanceLevel: "recreational" })
        .populationMismatch,
    ).toBe(true);
    // Das Kollektiv sind trainierte Erwachsene — dann passt es.
    expect(
      benchmarkResult(result(), { ...base, performanceLevel: "trained" }).populationMismatch,
    ).toBe(false);
  });
});

test.describe("Testabdeckung", () => {
  test("ohne Messungen ist jede Achse bei null, nicht leer", () => {
    const coverage = coverageByDimension([]);
    expect(coverage).toHaveLength(6);
    expect(coverage.every((c) => c.percent === 0)).toBe(true);
    expect(coverage.every((c) => c.available > 0)).toBe(true);
  });

  test("eine Messung hebt genau die Achsen, auf die sie einzahlt", () => {
    const coverage = coverageByDimension([result({ testSlug: "cooper_12min" })]);
    const endurance = coverage.find((c) => c.dimension === "endurance")!;
    expect(endurance.measured).toBe(1);
    expect(endurance.percent).toBeGreaterThan(0);
    expect(coverage.find((c) => c.dimension === "max_strength")!.percent).toBe(0);
  });
});

test.describe("Profil in der Oberfläche", () => {
  test("der sportliche Kontext lässt sich erfassen und bleibt erhalten", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Andere Sportart").fill("Sportklettern");
    await page.getByLabel("Position / Gewichtsklasse").fill("-81 kg");
    await page.getByLabel("Leistungsniveau").selectOption("competitive");
    await page.getByLabel("Trainingsalter (Jahre)").fill("12");
    await page.getByLabel("Einheiten pro Woche").fill("6");
    await page.getByLabel("Dominante Seite").selectOption("left");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Andere Sportart")).toHaveValue("Sportklettern");
    await expect(page.getByLabel("Leistungsniveau")).toHaveValue("competitive");
    await expect(page.getByLabel("Trainingsalter (Jahre)")).toHaveValue("12");
  });

  test("jede einzelne Sportart steht in einem Menü", async ({ page }) => {
    // Vorher standen hier zwei Menüs, das zweite gesperrt bis zur Antwort auf
    // das erste. Wer das Profil öffnete, sah sieben Oberbegriffe und keine
    // einzige Sportart — «Kampfsport» ist aber nicht das, was jemand über sich
    // sagen will.
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });

    const menu = page.getByLabel("Sportart / Disziplin");
    await expect(menu).toBeEnabled();
    await expect(menu).toHaveValue("");
    // Alle 39 Disziplinen plus «Keine Angabe».
    await expect(menu.locator("option")).toHaveCount(40);
    // Nach Bereichen gruppiert, damit die Liste sortiert bleibt.
    await expect(menu.locator("optgroup")).toHaveCount(7);
    await expect(menu.locator("option", { hasText: "Judo" })).toHaveCount(1);
    await expect(menu.locator("option", { hasText: "Ringen" })).toHaveCount(1);
    await expect(menu.locator("option", { hasText: "Bahnradsport" })).toHaveCount(1);

    await menu.selectOption("judo");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Sportart / Disziplin")).toHaveValue("judo");
  });

  test("die Auswahl zeigt sofort, welche Tests sie bedeutet", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Sportart / Disziplin").selectOption("judo");

    // Ohne diese Liste wäre die Wahl eine Behauptung ohne sichtbare Folge.
    await expect(page.getByText("Special Judo Fitness Test")).toBeVisible();
    await expect(page.getByText(/Kerntests? für diese Disziplin/)).toBeVisible();
    // Und je Zeile, woher der Test kommt.
    await expect(page.getByText("aus der Quellliste").first()).toBeVisible();
  });

  test("der Sportbereich wird abgeleitet und nicht gefragt", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    // Eine Angabe, die sich aus einer anderen ergibt, ist keine zweite Frage wert.
    await expect(page.getByLabel("Sportbereich")).toHaveCount(0);
    await page.getByLabel("Sportart / Disziplin").selectOption("marathon");
    const stored = await page.evaluate(() => localStorage.getItem("baseline.data.v1"));
    expect(stored).toContain('"sportCategoryId":"running"');
    expect(stored).toContain('"disciplineId":"marathon"');
  });

  test("die gewählte Disziplin steht als Vorschlag im Terminentwurf", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Sportart / Disziplin").selectOption("judo");

    await page.goto("/diagnostik/neu", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Vorschlag").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Judo/ }).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("kein Kontextfeld ist ein Pflichtfeld", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    const required = await page
      .locator("#main input[required], #main select[required]")
      .count();
    expect(required).toBe(0);
  });

  test("die Abdeckung steht je Achse in Prozent", async ({ page }) => {
    await openDemo(page);
    await page.goto("/analyse", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Testabdeckung")).toBeVisible();
    await expect(page.getByRole("meter", { name: /Testabdeckung Ausdauer/ })).toBeVisible();
    await expect(page.getByText(/% über alle Achsen/)).toBeVisible();
  });
});

test.describe("Darstellung und Sprache", () => {
  // Beides steht seit dem Aufräumen der Kopfzeile nur noch hier. Der Fall
  // gehört deshalb zu den Profilfällen und nicht zu den Navigationsfällen:
  // dort läuft er zusätzlich gegen ein Geräteprofil, dessen Layout- und
  // Sichtviewport um über tausend Pixel auseinanderfallen — das prüft die
  // Scroll-Mechanik des Testwerkzeugs und nicht die App. Ein echter Tipp auf
  // den Knopf funktioniert dort nachgemessen.
  test("die Einstellung bleibt nach dem Umschalten erhalten", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    const light = page.getByRole("radio", { name: /^Hell$|^Light$/ });
    await light.scrollIntoViewIfNeeded();
    await light.click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("radio", { name: /^Hell$|^Light$/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
