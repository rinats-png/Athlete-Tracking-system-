import { expect, test } from "@playwright/test";
import {
  DOCUMENT_COVERAGE,
  COVERAGE_BY_DISCIPLINE,
  openGaps,
  provenanceOf,
  additionReason,
} from "../src/data/documentCoverage";
import { DISCIPLINES, disciplineById } from "../src/data/sportProfiles";
import { getTest } from "../src/data/testCatalog";

/**
 * Die Zusage: ein Test, den das Zielgruppendokument für eine Disziplin nennt,
 * wird durch spätere Ergänzungen nicht verdrängt.
 *
 * Diese Datei ist der Grund, warum das mehr ist als eine Behauptung. Ohne sie
 * fiele ein Dokumenttest beim nächsten Aufräumen still aus einer Liste, und
 * niemand würde es bemerken.
 */

test.describe("Dokumentabdeckung", () => {
  test("jede Disziplin hat einen Abdeckungseintrag", () => {
    for (const d of DISCIPLINES) {
      expect(COVERAGE_BY_DISCIPLINE.has(d.id), d.id).toBe(true);
    }
  });

  test("jeder Abdeckungseintrag gehört zu einer Disziplin, die es gibt", () => {
    for (const c of DOCUMENT_COVERAGE) {
      expect(disciplineById(c.disciplineId), c.disciplineId).toBeTruthy();
    }
  });

  test("JEDER Dokumenttest mit Slug ist seiner Disziplin auch zugeordnet", () => {
    // Der Kern der Zusage. Fällt ein Dokumenttest aus den Listen, schlägt
    // dieser Fall fehl — er kann nicht still verschwinden.
    for (const c of DOCUMENT_COVERAGE) {
      const d = disciplineById(c.disciplineId)!;
      const assigned = new Set([...d.coreTests, ...d.optionalTests]);
      for (const doc of c.documentTests) {
        if (!doc.catalogSlug) continue;
        expect(
          assigned.has(doc.catalogSlug),
          `${c.disciplineId}: «${doc.label}» → ${doc.catalogSlug} fehlt in der Zuordnung`,
        ).toBe(true);
      }
    }
  });

  test("jeder verwiesene Slug steht im Katalog", () => {
    for (const c of DOCUMENT_COVERAGE) {
      for (const doc of c.documentTests) {
        if (!doc.catalogSlug) continue;
        expect(getTest(doc.catalogSlug), `${c.disciplineId} → ${doc.catalogSlug}`).toBeTruthy();
      }
      for (const a of c.additions) {
        expect(getTest(a.slug), `${c.disciplineId} → ${a.slug}`).toBeTruthy();
      }
    }
  });

  test("jede Zuordnung hat eine bekannte Herkunft", () => {
    // Eine Ergänzung ohne Begründung ist eine Zuordnung, die niemand mehr
    // erklären kann. Sie darf nicht in den Auslieferungsstand.
    for (const d of DISCIPLINES) {
      for (const slug of [...d.coreTests, ...d.optionalTests]) {
        const origin = provenanceOf(d.id, slug);
        expect(origin, `${d.id} → ${slug} hat keine Herkunft`).not.toBe("unknown");
        if (origin === "addition") {
          const reason = additionReason(d.id, slug);
          expect(reason, `${d.id} → ${slug}`).toBeTruthy();
          expect(reason!.length, `${d.id} → ${slug}: Begründung zu knapp`).toBeGreaterThan(25);
        }
      }
    }
  });

  test("keine Ergänzung steht zugleich als Dokumenttest", () => {
    for (const c of DOCUMENT_COVERAGE) {
      const docSlugs = new Set(c.documentTests.map((t) => t.catalogSlug).filter(Boolean));
      for (const a of c.additions) {
        expect(docSlugs.has(a.slug), `${c.disciplineId} → ${a.slug}`).toBe(false);
      }
    }
  });

  test("jede Lücke nennt Art und Grund", () => {
    for (const gap of openGaps()) {
      expect(["buildable", "equipment", "no_protocol", "elsewhere"]).toContain(gap.kind);
      expect(gap.reason.length, `${gap.disciplineId}: ${gap.label}`).toBeGreaterThan(40);
    }
  });

  test("ein Dokumenttest ohne Slug hat immer einen Grund", () => {
    for (const c of DOCUMENT_COVERAGE) {
      for (const doc of c.documentTests) {
        if (doc.catalogSlug === null) {
          expect(doc.gap, `${c.disciplineId}: «${doc.label}»`).toBeTruthy();
        }
      }
    }
  });

  test("kein Dokumenttest ist als Kerntest gesetzt, den nur ein Labor durchführen kann", () => {
    for (const d of DISCIPLINES) {
      for (const slug of d.coreTests) {
        expect(getTest(slug)?.setting ?? "field", `${d.id} → ${slug}`).toBe("field");
      }
    }
  });

  test("die offenen Lücken sind gezählt und benannt", () => {
    const gaps = openGaps();
    // Kein Zielwert, sondern eine Sichtbarkeitsprüfung: die Zahl darf sich
    // ändern, aber nie unbemerkt.
    expect(gaps.length).toBeGreaterThan(0);
    const buildable = gaps.filter((g) => g.kind === "buildable");
    expect(
      buildable.length,
      `noch baubar ohne Fremdgerät: ${buildable.map((g) => g.label).join(", ")}`,
    ).toBeLessThanOrEqual(2);
  });
});
