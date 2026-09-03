import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  REFERENCES,
  REFERENCE_GAPS,
  compareToReferences,
} from "../src/data/references";

/**
 * Referenzwerte ordnen einen Menschen ein. Ein Fehler hier erzeugt keine
 * Fehlermeldung, sondern eine falsche Aussage über eine Person — deshalb
 * prüfen diese Fälle vor allem, wann NICHT eingeordnet wird.
 */

test.describe("Vergleich mit Referenzwerten", () => {
  test("ohne Wert gibt es keinen Vergleich", () => {
    expect(compareToReferences("cooper_12min", "vo2max_ml_kg_min", null, "higher_is_better", "male", 30, null)).toEqual([]);
  });

  test("die Athletenkohorte greift nur bei der passenden Disziplin", () => {
    const mitMma = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 60, "higher_is_better", "male", 28, "mma");
    const mitMarathon = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 60, "higher_is_better", "male", 28, "marathon");
    expect(mitMma.some((c) => c.entry.cohortLabel.de.includes("MMA"))).toBe(true);
    // Ein MMA-Wert darf einem Marathonläufer nicht als Massstab untergeschoben werden.
    expect(mitMarathon.some((c) => c.entry.cohortLabel.de.includes("MMA"))).toBe(false);
  });

  test("ohne Disziplin bleiben nur Bevölkerungswerte", () => {
    const ohne = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 50, "higher_is_better", "male", 30, null);
    expect(ohne.length).toBeGreaterThan(0);
    expect(ohne.every((c) => c.entry.cohort === "population")).toBe(true);
  });

  test("Perzentil und SD-Abstand stimmen überein", () => {
    // Kontrollgruppe Männer: 34,17 ± 2,75. Genau der Mittelwert = 50. Perzentil.
    const amMittel = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 34.17, "higher_is_better", "male", 30, null)
      .find((c) => c.entry.cohortLabel.de.includes("Kontrollgruppe"))!;
    expect(amMittel.sdFromMean).toBeCloseTo(0, 5);
    expect(amMittel.percentile).toBeCloseTo(50, 0);

    // Eine Standardabweichung darüber ≈ 84. Perzentil.
    const eineSd = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 34.17 + 2.75, "higher_is_better", "male", 30, null)
      .find((c) => c.entry.cohortLabel.de.includes("Kontrollgruppe"))!;
    expect(eineSd.sdFromMean).toBeCloseTo(1, 5);
    expect(eineSd.percentile).toBeGreaterThan(83);
    expect(eineSd.percentile).toBeLessThan(85);
  });

  test("bei «kleiner ist besser» zeigt ein kleinerer Wert nach oben", () => {
    // Karate-Sprint: 1,97 ± 0,06 s. Schneller heisst besser.
    const schnell = compareToReferences("sprint_10m", "durationSeconds", 1.91, "lower_is_better", "male", 25, "karate")[0];
    const langsam = compareToReferences("sprint_10m", "durationSeconds", 2.03, "lower_is_better", "male", 25, "karate")[0];
    expect(schnell.sdFromMean).toBeCloseTo(1, 5);
    expect(langsam.sdFromMean).toBeCloseTo(-1, 5);
    expect(schnell.percentile!).toBeGreaterThan(langsam.percentile!);
  });

  test("Klassifikationen liefern eine Stufe und kein erfundenes Perzentil", () => {
    const sehrGut = compareToReferences("special_judo_fitness_test", "sjft_index", 11.0, "lower_is_better", "male", 22, "judo")[0];
    expect(sehrGut.band?.label.de).toBe("Excellent");
    // Die Quelle gibt kein Perzentil her — also gibt es keins.
    expect(sehrGut.percentile).toBeNull();

    const schlecht = compareToReferences("special_judo_fitness_test", "sjft_index", 15.5, "lower_is_better", "male", 22, "judo")[0];
    expect(schlecht.band?.label.de).toBe("Very poor");
  });

  test("ein Bezugswert zeigt den Abstand, nicht einen Rang", () => {
    const grip = compareToReferences("grip_strength", "gripKg", 45, "higher_is_better", "male", 30, null)
      .find((c) => c.entry.method === "anchor")!;
    expect(grip.percentOfAnchor).toBeCloseTo((45 / 51) * 100, 1);
    expect(grip.percentile).toBeNull();
  });

  test("das Geschlecht wird nicht übergangen", () => {
    const frau = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 40, "higher_is_better", "female", 30, null);
    expect(frau.some((c) => c.entry.sex === "male")).toBe(false);
  });
});

test.describe("Belegbarkeit der Einträge", () => {
  test("jeder Eintrag nennt Kohorte, Quelle und Datenqualität", () => {
    for (const e of REFERENCES) {
      expect(e.cohortLabel.de.length, e.metricKey).toBeGreaterThan(5);
      expect(e.source.study.length, e.metricKey).toBeGreaterThan(5);
      expect(["A", "B", "C", "D"]).toContain(e.quality);
    }
  });

  test("jede Methode bringt die Felder mit, die sie braucht", () => {
    for (const e of REFERENCES) {
      if (e.method === "mean_sd") {
        expect(e.mean, e.metricKey).not.toBeUndefined();
        expect(e.sd, e.metricKey).toBeGreaterThan(0);
      }
      if (e.method === "bands") expect(e.bands!.length).toBeGreaterThan(1);
      if (e.method === "anchor") expect(e.anchor).toBeGreaterThan(0);
      if (e.method === "percentiles") expect(e.values!.length).toBe(6);
    }
  });

  test("Athletenkohorten sind an Disziplinen gebunden", () => {
    // Ohne diese Bindung würde ein Elitewert jedem Nutzer vorgehalten.
    for (const e of REFERENCES.filter((x) => x.cohort === "athlete")) {
      expect(e.disciplineIds?.length, e.cohortLabel.de).toBeGreaterThan(0);
    }
  });

  test("die Bänder einer Klassifikation sind aufsteigend und oben offen", () => {
    for (const e of REFERENCES.filter((x) => x.method === "bands")) {
      const bands = e.bands!;
      expect(bands[bands.length - 1].upTo).toBeNull();
      for (let i = 1; i < bands.length - 1; i++) {
        expect(bands[i].upTo!).toBeGreaterThan(bands[i - 1].upTo!);
      }
    }
  });

  test("jede nicht übernommene Quellzeile nennt ihren Grund", () => {
    expect(REFERENCE_GAPS.length).toBeGreaterThan(0);
    for (const gap of REFERENCE_GAPS) {
      expect(gap.reason.length, gap.subject).toBeGreaterThan(60);
    }
  });
});

test.describe("Median als Bezug", () => {
  test("ein Medianwert ergibt einen Abstand in Prozent, aber keine Stufe", () => {
    const oben = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 55, "higher_is_better", "male", 25, null);
    const median = oben.find((c) => c.entry.method === "median");
    expect(median, "FRIEND-I nennt einen Median für Männer 20–29").toBeTruthy();
    expect(median!.percentile, "ohne Streuung gibt es kein Perzentil").toBeNull();
    expect(median!.percentFromMedian!).toBeGreaterThan(0);
    const unten = compareToReferences("cooper_12min", "vo2max_ml_kg_min", 40, "higher_is_better", "male", 25, null);
    expect(unten.find((c) => c.entry.method === "median")!.percentFromMedian!).toBeLessThan(0);
  });

  test("jeder Medianeintrag nennt einen Median und eine Quelle", () => {
    const medians = REFERENCES.filter((e) => e.method === "median");
    expect(medians.length).toBeGreaterThan(0);
    for (const e of medians) {
      expect(e.median, e.cohortLabel.de).toBeGreaterThan(0);
      expect(e.source.study.length, e.cohortLabel.de).toBeGreaterThan(10);
    }
  });

  test("beide Sprachen benennen den Medianbezug", () => {
    for (const file of ["de", "en"]) {
      const dict = JSON.parse(readFileSync(new URL(`../src/i18n/${file}.json`, import.meta.url), "utf-8"));
      expect(dict.rating.gap.median_only, file).toBeTruthy();
      expect(dict.result.percentFromMedian, file).toContain("{{percent}}");
      expect(dict.result.groupMedian, file).toBeTruthy();
    }
  });
});
