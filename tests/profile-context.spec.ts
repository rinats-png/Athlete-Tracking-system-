import { expect, test } from "@playwright/test";
import { DISCIPLINES } from "../src/data/sportProfiles";
import { openGuest, openDemo } from "./helpers";
import { bodyComposition, compositionChange } from "../src/domain/bodyComposition";
import { coverageByDimension, lookupPercentile } from "../src/domain/benchmark";
import { rateResult } from "../src/domain/rating";
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

test.describe("Einordnung eines Ergebnisses", () => {
  test("die Referenz wird auch gefunden, wenn sie nicht auf der Primärkennzahl liegt", () => {
    // Beim Cooper-Test ist die Primärkennzahl die Laufdistanz, die Referenz
    // liegt auf der VO2max. Eine Suche allein über die Primärkennzahl fand
    // hier nie etwas und zeigte still einen Strich.
    const rating = rateResult(result(), { sex: "male", birthDate: null, disciplineIds: [] });
    expect(rating.metricKey).toBe("vo2max_ml_kg_min");
    expect(rating.comparison).not.toBeNull();
  });

  test("eine geschlechtsneutrale Kohorte gilt auch ohne Geschlechtsangabe", () => {
    // Für die VO2max gibt es eine Referenz über beide Geschlechter. Wer sein
    // Geschlecht nicht angibt, bekommt deshalb trotzdem eine Antwort — nur
    // eben aus der Gruppe, die ohne diese Angabe passt.
    const noSex = rateResult(result({ sex: null }), { sex: null, birthDate: null, disciplineIds: [] });
    expect(noSex.level).not.toBeNull();
    expect(noSex.comparison!.entry.sex).toBe("all");
  });

  test("ohne Geschlecht und ohne neutrale Kohorte wird die Lücke benannt", () => {
    // Die Griffkraft-Referenzen sind nach Geschlecht getrennt.
    const noSex = rateResult(
      result({ testSlug: "grip_strength", values: { gripKg: 50 }, metrics: {}, score: 50, sex: null }),
      { sex: null, birthDate: null, disciplineIds: [] },
    );
    expect(noSex.level).toBeNull();
    expect(noSex.gap).toBe("no_sex");
  });

  test("jede Einordnung trägt Kohorte, Quelle und Datenqualität mit", () => {
    const rating = rateResult(result(), { sex: "male", birthDate: null, disciplineIds: [] });
    const entry = rating.comparison!.entry;
    expect(entry.cohortLabel.de.length).toBeGreaterThan(3);
    expect(entry.source.study.length).toBeGreaterThan(3);
    expect(["A", "B", "C", "D"]).toContain(entry.quality);
  });

  test("ein Median ergibt einen Abstand, aber keine Stufe", () => {
    // Das FRIEND-Register nennt den Median je Dekade, keine Streuung.
    const rating = rateResult(result(), { sex: "male", birthDate: null, disciplineIds: [] });
    const median = [rating.comparison, ...rating.alternatives].find(
      (c) => c?.entry.method === "median",
    );
    expect(median, "eine Median-Referenz für VO2max muss es geben").toBeTruthy();
    expect(median!.percentFromMedian).not.toBeNull();
    expect(median!.percentile).toBeNull();
  });

  test("ohne Referenz gibt es kein Perzentil im Export", () => {
    expect(lookupPercentile(result({ testSlug: "plank_hold" }))).toBeNull();
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

  test("jede einzelne Sportart steht in der Liste — und die Wahl überlebt einen Reload", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Hauptsportart ändern" }).click();
    // Alle Disziplinen auf einmal, nach Bereichen gruppiert.
    await expect(page.getByRole("button", { name: /Kerntests?$/ })).toHaveCount(DISCIPLINES.length);
    await page.getByRole("button", { name: /^Judo/ }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Judo" })).toBeVisible();
  });

  test("der Sportbereich wird abgeleitet und nicht gefragt", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Sportbereich")).toHaveCount(0);
    await page.getByRole("button", { name: "Hauptsportart ändern" }).click();
    await page.getByRole("button", { name: /^Marathon/ }).click();
    const stored = await page.evaluate(() => localStorage.getItem("baseline.data.v1"));
    expect(stored).toContain('"sportCategoryId":"running"');
    expect(stored).toContain('"disciplineId":"marathon"');
  });

  test("die gewählte Disziplin steht als Vorschlag im Terminentwurf", async ({ page }) => {
    await openGuest(page);
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Hauptsportart ändern" }).click();
    await page.getByRole("button", { name: /^Judo/ }).click();

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
    const light = page.getByRole("radio", { name: /Mondstein/ });
    await light.scrollIntoViewIfNeeded();
    await light.click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("radio", { name: /Mondstein/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
