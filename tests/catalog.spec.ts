import { expect, test } from "@playwright/test";
import { TEST_CATALOG, getTest } from "../src/data/testCatalog";
import { DELIBERATELY_OMITTED } from "../src/data/testCatalogAdditions";
import { deriveMetrics } from "../src/lib/metrics/derive";
import {
  peakPowerSayers,
  averageVelocity,
  pacePerKm,
  SAYERS_VALID_HEIGHT_CM,
} from "../src/lib/metrics";
import { PERFORMANCE_DIMENSIONS } from "../src/types/domain";

/**
 * Der Testkatalog ist die Grundlage jeder Zahl in dieser App. Ein Test mit
 * fehlerhaften Metadaten fällt nicht auf — er liefert still falsche Werte.
 * Diese Fälle prüfen deshalb die Struktur jedes einzelnen Eintrags, nicht
 * nur eine Stichprobe.
 */

test.describe("Katalogstruktur", () => {
  test("jeder Slug kommt genau einmal vor", () => {
    const slugs = TEST_CATALOG.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("kein bewusst weggelassener Test ist versehentlich doch drin", () => {
    for (const slug of DELIBERATELY_OMITTED) {
      expect(getTest(slug), `${slug} war absichtlich ausgeschlossen`).toBeUndefined();
    }
  });

  test("jeder Test ist vollständig beschrieben", () => {
    for (const t of TEST_CATALOG) {
      expect(t.name.de, t.slug).toBeTruthy();
      expect(t.name.en, t.slug).toBeTruthy();
      expect(t.summary.de, t.slug).toBeTruthy();
      expect(t.instructions.de, t.slug).toBeTruthy();
      expect(t.instructions.en, t.slug).toBeTruthy();
      expect(t.equipment.de, t.slug).toBeTruthy();
      expect(t.fields.length, t.slug).toBeGreaterThan(0);
      expect(t.primaryUnit, t.slug).toBeTruthy();
    }
  });

  test("jede Achsenzuordnung zeigt auf eine echte Achse", () => {
    for (const t of TEST_CATALOG) {
      const dims = Object.keys(t.dimensionMetrics);
      expect(dims.length, t.slug).toBeGreaterThan(0);
      for (const d of dims) {
        expect(PERFORMANCE_DIMENSIONS, `${t.slug}: ${d}`).toContain(d);
      }
      expect(dims, t.slug).toContain(t.dimension);
    }
  });

  test("mindestens ein Pflichtfeld je Test — sonst ist nichts messbar", () => {
    for (const t of TEST_CATALOG) {
      expect(t.fields.some((f) => f.required), t.slug).toBe(true);
    }
  });

  test("jedes Zahlenfeld hat eine Ober- und Untergrenze", () => {
    for (const t of TEST_CATALOG) {
      for (const f of t.fields) {
        if (f.type === "rpe") continue;
        expect(f.min, `${t.slug}.${f.key}`).not.toBeUndefined();
        expect(f.max, `${t.slug}.${f.key}`).not.toBeUndefined();
        expect(f.max as number, `${t.slug}.${f.key}`).toBeGreaterThan(f.min as number);
      }
    }
  });

  test("die Primärkennzahl ist entweder Eingabefeld oder abgeleitet", () => {
    for (const t of TEST_CATALOG) {
      const isField = t.fields.some((f) => f.key === t.primaryMetric);
      const isDerived = t.derivedMetrics.includes(t.primaryMetric);
      expect(isField || isDerived, `${t.slug}: ${t.primaryMetric}`).toBe(true);
    }
  });

  test("Sortierreihenfolgen kollidieren nicht", () => {
    const orders = TEST_CATALOG.map((t) => t.sortOrder);
    expect(new Set(orders).size, "doppelte sortOrder").toBe(orders.length);
  });

  test("der Katalog deckt alle sechs Achsen ab", () => {
    const covered = new Set(TEST_CATALOG.flatMap((t) => Object.keys(t.dimensionMetrics)));
    for (const d of PERFORMANCE_DIMENSIONS) {
      expect([...covered], d).toContain(d);
    }
  });
});

test.describe("Neue Berechnungen", () => {
  test("Spitzenleistung nach Sayers", () => {
    // 60,7 × 40 + 45,3 × 80 − 2055 = 2428 + 3624 − 2055 = 3997
    expect(peakPowerSayers(40, 80)).toBeCloseTo(3997, 6);
  });

  test("ausserhalb des Gültigkeitsbereichs gibt es keinen Wert statt eines unsinnigen", () => {
    // 5 cm Sprunghöhe bei 40 kg rechnet die Gleichung zu 60 W aus — formal
    // positiv, inhaltlich Unsinn. Am Rand wird geklemmt, nicht extrapoliert.
    expect(peakPowerSayers(5, 40)).toBeNull();
    expect(peakPowerSayers(SAYERS_VALID_HEIGHT_CM.min - 0.1, 80)).toBeNull();
    expect(peakPowerSayers(SAYERS_VALID_HEIGHT_CM.max + 0.1, 80)).toBeNull();
    expect(peakPowerSayers(SAYERS_VALID_HEIGHT_CM.min, 80)).not.toBeNull();
    expect(peakPowerSayers(40, null)).toBeNull();
  });

  test("Geschwindigkeit und Pace", () => {
    expect(averageVelocity(30, 4.2)).toBeCloseTo(7.142857, 5);
    expect(pacePerKm(1440, 5000)).toBeCloseTo(288, 6);
    expect(averageVelocity(30, 0)).toBeNull();
  });

  test("Sprint: die Geschwindigkeit kommt aus der Protokolldistanz", () => {
    const test = getTest("sprint_30m")!;
    const metrics = deriveMetrics(
      test,
      { durationSeconds: 4.2 },
      { bodyWeightKg: 80, ageYears: 30, sex: "male" },
    );
    expect(metrics.avg_velocity_m_s).toBeCloseTo(7.143, 2);
  });

  test("Wiederholungssprünge: der Mittelwert wird gebildet, nicht eingegeben", () => {
    const test = getTest("repeated_jump_15s")!;
    const metrics = deriveMetrics(
      test,
      { jumpCount: 10, totalHeightCm: 320 },
      { bodyWeightKg: 80, ageYears: 30, sex: "male" },
    );
    expect(metrics.avg_jump_height_cm).toBe(32);
  });

  test("Klimmzug mit Zusatzgewicht wertet die Gesamtlast", () => {
    const test = getTest("weighted_pull_up_1rm")!;
    const metrics = deriveMetrics(
      test,
      { addedLoadKg: 40, reps: 1 },
      { bodyWeightKg: 80, ageYears: 30, sex: "male" },
    );
    // 80 kg Körpergewicht + 40 kg Zusatz, eine Wiederholung.
    expect(metrics.total_load_kg).toBe(120);
    expect(metrics.total_load_bw).toBe(1.5);
  });

  test("ohne Körpergewicht gibt es keine Gesamtlast statt einer falschen", () => {
    const test = getTest("weighted_pull_up_1rm")!;
    const metrics = deriveMetrics(
      test,
      { addedLoadKg: 40, reps: 1 },
      { bodyWeightKg: null, ageYears: 30, sex: "male" },
    );
    expect(metrics.total_load_kg).toBeUndefined();
  });

  test("Sprunghöhe ohne Körpergewicht liefert keine Leistungsschätzung", () => {
    const test = getTest("countermovement_jump")!;
    const metrics = deriveMetrics(
      test,
      { jumpHeightCm: 40 },
      { bodyWeightKg: null, ageYears: 30, sex: "male" },
    );
    expect(metrics.jumpHeightCm).toBe(40);
    expect(metrics.peak_power_w).toBeUndefined();
  });
});

test.describe("Testbatterien", () => {
  test("jede Batterie verweist ausschliesslich auf Tests, die es gibt", async () => {
    const { TEST_BATTERIES } = await import("../src/data/testBatteries");
    for (const battery of TEST_BATTERIES) {
      expect(battery.testSlugs.length, battery.slug).toBeGreaterThan(0);
      for (const slug of battery.testSlugs) {
        expect(getTest(slug), `${battery.slug} verweist auf ${slug}`).toBeTruthy();
      }
    }
  });

  test("keine Batterie führt denselben Test zweimal", async () => {
    const { TEST_BATTERIES } = await import("../src/data/testBatteries");
    for (const battery of TEST_BATTERIES) {
      expect(new Set(battery.testSlugs).size, battery.slug).toBe(battery.testSlugs.length);
    }
  });

  test("die Allgemein-Batterie deckt weiterhin alle sechs Achsen ab", async () => {
    const { TEST_BATTERIES, batteryDimensions } = await import("../src/data/testBatteries");
    const general = TEST_BATTERIES.find((b) => b.slug === "general_fitness")!;
    expect(batteryDimensions(general).length).toBe(PERFORMANCE_DIMENSIONS.length);
  });
});

test.describe("Einheiten (§61)", () => {
  test("Gewicht, Distanz und Höhe rechnen ins imperiale System um", async () => {
    const { formatMeasurement } = await import("../src/lib/format");

    expect(formatMeasurement(100, "kg", "de", "metric")).toEqual({ value: "100,0", unit: "kg" });
    expect(formatMeasurement(100, "kg", "de", "imperial").unit).toBe("lb");
    expect(Number(formatMeasurement(100, "kg", "en", "imperial").value)).toBeCloseTo(220.5, 0);

    // Sprungweiten unter 10 m liest man in Zentimetern bzw. Zoll.
    expect(formatMeasurement(2.4, "m", "de", "metric")).toEqual({ value: "240", unit: "cm" });
    expect(formatMeasurement(2.4, "m", "de", "imperial").unit).toBe("in");

    // Laufdistanzen bleiben Distanzen.
    expect(formatMeasurement(3200, "m", "de", "metric").unit).toBe("m");
    expect(formatMeasurement(3200, "m", "de", "imperial").unit).toBe("mi");

    // Sprunghöhen in Zoll, nicht in Fuss — Fuss wäre unbrauchbar grob.
    expect(formatMeasurement(42, "cm", "de", "metric")).toEqual({ value: "42", unit: "cm" });
    expect(formatMeasurement(42, "cm", "de", "imperial").unit).toBe("in");
  });

  test("SI-Einheiten werden nicht umgerechnet", async () => {
    const { formatMeasurement } = await import("../src/lib/format");
    // «Pferdestärken pro Ruderschlag» braucht niemand.
    expect(formatMeasurement(280, "W", "de", "imperial")).toEqual({ value: "280", unit: "W" });
    expect(formatMeasurement(120, "kcal", "de", "imperial").unit).toBe("kcal");
  });

  test("Zeiten werden lesbar gesetzt statt als Sekundenzahl", async () => {
    const { formatMeasurement } = await import("../src/lib/format");
    expect(formatMeasurement(430, "s", "de", "metric").value).toContain(":");
  });

  test("jede Primäreinheit des Katalogs ist behandelt", async () => {
    const { formatMeasurement } = await import("../src/lib/format");
    const units = [...new Set(TEST_CATALOG.map((t) => t.primaryUnit))];
    for (const unit of units) {
      for (const system of ["metric", "imperial"] as const) {
        const out = formatMeasurement(42, unit, "de", system);
        // Kein Test darf einen leeren oder unsinnigen Wert liefern.
        expect(out.value, `${unit}/${system}`).not.toBe("");
        expect(out.value, `${unit}/${system}`).not.toContain("NaN");
      }
    }
  });
});
