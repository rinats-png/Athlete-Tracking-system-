import { expect, test } from "@playwright/test";
import {
  SCORE_SCALES,
  fightEnduranceScore,
  gripScore,
  runEconomyScore,
  sportScoresFor,
} from "../src/domain/sportScores";
import type { StoredResult } from "../src/lib/store/localStore";

/**
 * Die drei Sammelwerte fassen mehrere Tests zu einer Zahl zusammen. Genau
 * deshalb sind sie gefährlich: sie sehen aus wie eine Messung. Diese Fälle
 * halten fest, wann sie NICHT entstehen — das ist die wichtigere Hälfte.
 */

const res = (testSlug: string, metrics: Record<string, number>): StoredResult =>
  ({
    id: `${testSlug}-1`,
    testSlug,
    performedAt: "2026-05-01T09:00:00.000Z",
    values: {},
    metrics,
    score: null,
    bodyWeightKg: 80,
    ageYears: 30,
    sex: "male",
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    photo: null,
    context: { surface: "", temperatureC: null, timeOfDay: null, equipment: "", trainingStatus: "" },
    createdAt: "2026-05-01T09:00:00.000Z",
  }) as StoredResult;

test.describe("Griffwert", () => {
  test("braucht beide Seiten der Eigenschaft", () => {
    // Nur Maximalkraft: kein Wert. Wer stark zupackt, aber nicht halten kann,
    // hat ein anderes Problem — ein Mittelwert aus einer Zahl verdeckt das.
    expect(gripScore([res("grip_strength", { grip_relative: 0.8 })])).toBeNull();
    expect(gripScore([res("grip_hang_time", { durationSeconds: 90 })])).toBeNull();
  });

  test("entsteht aus Maximalkraft und Haltezeit", () => {
    const score = gripScore([
      res("grip_strength", { grip_relative: 0.7 }),
      res("grip_hang_time", { durationSeconds: 70 }),
    ]);
    expect(score).not.toBeNull();
    expect(score!.value).toBeGreaterThan(0);
    expect(score!.value).toBeLessThanOrEqual(100);
    expect(score!.basis).toEqual(["grip_strength", "grip_hang_time"]);
    // Der Vermerk hängt am Wert und ist kein Anzeigedetail.
    expect(score!.provisional).toBe(true);
  });

  test("wird an den Rändern geklemmt statt extrapoliert", () => {
    const far = gripScore([
      res("grip_strength", { grip_relative: 5 }),
      res("grip_hang_time", { durationSeconds: 3000 }),
    ]);
    expect(far!.value).toBe(100);
    const low = gripScore([
      res("grip_strength", { grip_relative: 0.01 }),
      res("grip_hang_time", { durationSeconds: 1 }),
    ]);
    expect(low!.value).toBe(0);
  });

  test("nimmt den besten Wert, nicht den letzten", () => {
    const score = gripScore([
      res("grip_strength", { grip_relative: 0.9 }),
      res("grip_strength", { grip_relative: 0.5 }),
      res("grip_hang_time", { durationSeconds: 70 }),
    ]);
    const onlyBest = gripScore([
      res("grip_strength", { grip_relative: 0.9 }),
      res("grip_hang_time", { durationSeconds: 70 }),
    ]);
    expect(score!.value).toBe(onlyBest!.value);
  });
});

test.describe("Kampfausdauer", () => {
  test("ohne Ermüdungswert entsteht kein Sammelwert", () => {
    expect(
      fightEnduranceScore([res("special_judo_fitness_test", { sjft_index: 12 })]),
    ).toBeNull();
  });

  test("ohne Index entsteht kein Sammelwert", () => {
    expect(fightEnduranceScore([res("punch_test_60s", { fatigue_index_percent: 10 })])).toBeNull();
  });

  test("beim SJFT ist der kleinere Index der bessere", () => {
    const gut = fightEnduranceScore([
      res("special_judo_fitness_test", { sjft_index: 9 }),
      res("punch_test_60s", { fatigue_index_percent: 10 }),
    ]);
    const schlechter = fightEnduranceScore([
      res("special_judo_fitness_test", { sjft_index: 15 }),
      res("punch_test_60s", { fatigue_index_percent: 10 }),
    ]);
    expect(gut!.value).toBeGreaterThan(schlechter!.value);
  });

  test("der SWFT zählt genauso und wird als Grundlage benannt", () => {
    const score = fightEnduranceScore([
      res("special_wrestling_fitness_test", { swft_index: 10 }),
      res("fatigue_circuit_4x30s", { fatigue_index_percent: 12 }),
    ]);
    expect(score!.basis[0]).toBe("special_wrestling_fitness_test");
  });

  test("ein kleinerer Abfall ergibt einen höheren Wert", () => {
    const stabil = fightEnduranceScore([
      res("special_judo_fitness_test", { sjft_index: 12 }),
      res("kick_test_60s", { fatigue_index_percent: 6 }),
    ]);
    const einbrechend = fightEnduranceScore([
      res("special_judo_fitness_test", { sjft_index: 12 }),
      res("kick_test_60s", { fatigue_index_percent: 35 }),
    ]);
    expect(stabil!.value).toBeGreaterThan(einbrechend!.value);
  });
});

test.describe("Laufökonomie (Näherung)", () => {
  test("ohne Schwellentest gibt es keinen Wert", () => {
    expect(runEconomyScore([res("run_10k", { durationSeconds: 2400 })])).toBeNull();
  });

  test("ohne Wettkampfzeit gibt es keinen Wert", () => {
    expect(runEconomyScore([res("threshold_run_30min", { distanceM: 8000 })])).toBeNull();
  });

  test("wer näher an der Schwellenpace läuft, bekommt den höheren Wert", () => {
    const schwelle = res("threshold_run_30min", { distanceM: 8000 }); // 3:45 min/km
    const nah = runEconomyScore([schwelle, res("run_10k", { durationSeconds: 2300 })]);
    const fern = runEconomyScore([schwelle, res("run_10k", { durationSeconds: 2700 })]);
    expect(nah!.value).toBeGreaterThan(fern!.value);
  });

  test("nennt beide Grundlagen", () => {
    const score = runEconomyScore([
      res("threshold_run_30min", { distanceM: 8000 }),
      res("run_5k", { durationSeconds: 1150 }),
    ]);
    expect(score!.basis).toEqual(["threshold_run_30min", "run_5k"]);
  });
});

test.describe("Auswahl nach Disziplin", () => {
  const bestand = [
    res("grip_strength", { grip_relative: 0.7 }),
    res("grip_hang_time", { durationSeconds: 70 }),
    res("special_judo_fitness_test", { sjft_index: 11 }),
    res("punch_test_60s", { fatigue_index_percent: 12 }),
    res("threshold_run_30min", { distanceM: 8000 }),
    res("run_10k", { durationSeconds: 2400 }),
  ];

  test("im Kampfsport stehen Griffwert und Kampfausdauer", () => {
    const keys = sportScoresFor(bestand, "judo").map((s) => s.key);
    expect(keys).toContain("grip_score");
    expect(keys).toContain("fight_endurance_score");
    expect(keys).not.toContain("run_economy_score");
  });

  test("beim Laufen steht die Laufökonomie", () => {
    const keys = sportScoresFor(bestand, "marathon").map((s) => s.key);
    expect(keys).toEqual(["run_economy_score"]);
  });

  test("ohne Disziplin steht alles, was sich bilden lässt", () => {
    expect(sportScoresFor(bestand, null)).toHaveLength(3);
  });

  test("die Auswahl ist eine Anzeigehilfe und erfindet nichts", () => {
    // Kampfsport gewählt, aber keine Griffdaten: kein Griffwert.
    const keys = sportScoresFor(
      [res("special_judo_fitness_test", { sjft_index: 11 }), res("punch_test_60s", { fatigue_index_percent: 12 })],
      "judo",
    ).map((s) => s.key);
    expect(keys).toEqual(["fight_endurance_score"]);
  });
});

test("die Skalierungsspannen stehen an einer Stelle und sind gerichtet", () => {
  // Bei den Werten, wo kleiner besser ist, liegt low ÜBER high — das ist
  // Absicht und keine Verwechslung. Ein späterer Austausch gegen belegte
  // Referenzwerte muss diese Richtung beibehalten.
  expect(SCORE_SCALES.fightIndex.low).toBeGreaterThan(SCORE_SCALES.fightIndex.high);
  expect(SCORE_SCALES.fatigueDrop.low).toBeGreaterThan(SCORE_SCALES.fatigueDrop.high);
  expect(SCORE_SCALES.paceRatio.low).toBeGreaterThan(SCORE_SCALES.paceRatio.high);
  expect(SCORE_SCALES.gripRelative.low).toBeLessThan(SCORE_SCALES.gripRelative.high);
});
