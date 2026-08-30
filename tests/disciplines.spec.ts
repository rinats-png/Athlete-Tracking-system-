import { expect, test } from "@playwright/test";
import {
  BLOCKED_DISCIPLINES,
  DISCIPLINES,
  SPORT_CATEGORIES,
  disciplineById,
  disciplinesFor,
} from "../src/data/sportProfiles";
import { getTest } from "../src/data/testCatalog";
import { disciplineBattery } from "../src/data/testBatteries";
import { FORMULA_REGISTRY, provisionalFormulas } from "../src/domain/formulaRegistry";
import { PERFORMANCE_DIMENSIONS } from "../src/types/domain";

/**
 * Die Disziplinliste steuert Testvorschlag und Anforderungskontur. Ein
 * Verweis auf einen Test, den es nicht gibt, fällt in der Oberfläche nicht
 * auf — die Batterie ist dann einfach kürzer. Deshalb wird hier jede
 * Verknüpfung geprüft, nicht eine Stichprobe.
 */
test.describe("Disziplinen", () => {
  test("jede Kennung kommt genau einmal vor", () => {
    const ids = DISCIPLINES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("jede Disziplin gehört zu einer Kategorie, die es gibt", () => {
    const categories = new Set(SPORT_CATEGORIES.map((c) => c.id));
    for (const d of DISCIPLINES) {
      expect(categories, d.id).toContain(d.categoryId);
    }
  });

  test("jede Kategorie hat mindestens eine Disziplin", () => {
    for (const c of SPORT_CATEGORIES) {
      expect(disciplinesFor(c.id).length, c.id).toBeGreaterThan(0);
    }
  });

  test("jeder verwiesene Test steht im Katalog", () => {
    for (const d of DISCIPLINES) {
      for (const slug of [...d.coreTests, ...d.optionalTests]) {
        expect(getTest(slug), `${d.id} -> ${slug}`).toBeTruthy();
      }
    }
  });

  test("kein Test steht gleichzeitig unter Kern- und Zusatztests", () => {
    for (const d of DISCIPLINES) {
      const overlap = d.coreTests.filter((s) => d.optionalTests.includes(s));
      expect(overlap, d.id).toEqual([]);
    }
  });

  test("kein Labortest ist Voraussetzung für ein vollständiges Profil", () => {
    // Ein Kerntest, den nur ein Institut durchführen kann, macht das Profil
    // für alle anderen dauerhaft unvollständig.
    for (const d of DISCIPLINES) {
      for (const slug of d.coreTests) {
        expect(getTest(slug)?.setting ?? "field", `${d.id} -> ${slug}`).toBe("field");
      }
    }
  });

  test("jede Achsengewichtung zeigt auf eine echte Achse", () => {
    for (const d of DISCIPLINES) {
      for (const [dimension, weight] of Object.entries(d.dimensionWeights)) {
        expect(PERFORMANCE_DIMENSIONS, `${d.id}: ${dimension}`).toContain(dimension);
        expect(weight, `${d.id}: ${dimension}`).toBeGreaterThan(0);
        expect(weight, `${d.id}: ${dimension}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("die begrenzende Achse ist auch gewichtet", () => {
    for (const d of DISCIPLINES) {
      expect(Object.keys(d.dimensionWeights), d.id).toContain(d.typicalLimiter);
    }
  });

  test("Fussball bleibt ausgeschlossen", () => {
    // Als Datenregel und nicht als Auslassung: eine spätere Erweiterung soll
    // den Ausschluss nicht versehentlich rückgängig machen.
    const blocked = new Set(BLOCKED_DISCIPLINES.map((b) => b.id));
    for (const d of DISCIPLINES) {
      expect(blocked.has(d.id), d.id).toBe(false);
      for (const alias of d.aliases ?? []) {
        expect(blocked.has(alias.toLowerCase()), alias).toBe(false);
      }
    }
  });

  test("aus jeder Disziplin entsteht eine Batterie mit Tests", () => {
    for (const d of DISCIPLINES) {
      const battery = disciplineBattery(d.id);
      expect(battery, d.id).toBeTruthy();
      expect(battery!.testSlugs.length, d.id).toBeGreaterThan(0);
    }
  });

  test("eine unbekannte Kennung liefert nichts statt irgendetwas", () => {
    expect(disciplineById("gibtesnicht")).toBeUndefined();
    expect(disciplineBattery("gibtesnicht")).toBeNull();
    expect(disciplineBattery(null)).toBeNull();
  });
});

test.describe("Formelregister (§81)", () => {
  test("jede Kennzahl steht nur einmal drin", () => {
    const keys = FORMULA_REGISTRY.map((f) => f.metricKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("publizierte Formeln nennen ihre Quelle, vorläufige nennen keine", () => {
    for (const f of FORMULA_REGISTRY) {
      if (f.source === "published") {
        expect(f.reference, f.metricKey).toBeTruthy();
      } else {
        // Eine Quelle an einer selbst festgelegten Formel wäre genau die
        // scheinwissenschaftliche Aussage, die §81 ausschliesst.
        expect(f.reference, f.metricKey).toBeNull();
      }
    }
  });

  test("jede vorläufige Formel sagt, was sie ersetzen müsste", () => {
    for (const f of provisionalFormulas()) {
      expect(f.note.length, f.metricKey).toBeGreaterThan(40);
    }
  });
});
