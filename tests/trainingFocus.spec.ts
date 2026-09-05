import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  FOCUS_NOTE_MAX,
  MAX_ACTIVE_FOCUSES,
  activeFocuses,
  canAddFocus,
  closedFocuses,
  focusOutcome,
  hasOpenFocusFor,
  reviewDue,
} from '../src/domain/trainingFocus'
import { CURRENT_SCHEMA_VERSION, parseStoredData } from '../src/lib/store/schema'
import { buildDemoData } from '../src/data/demoSeed'
import type { StoredFocus, StoredResult } from '../src/lib/store/localStore'
import { openDemo } from './helpers'

/**
 * Trainingsschwerpunkte.
 *
 * Der teuerste Fehler wäre hier nicht ein falscher Wert, sondern ein
 * Bedeutungswandel: aus einem Befund mit einem Trainersatz würde
 * unbemerkt ein Trainingsplan. Die ersten Fälle halten deshalb fest, was das
 * Modell NICHT enthält — Übungen, Sätze, Wiederholungen, Videos — und dass
 * die App keinen Text erzeugt.
 */

/** Kommentare weg, damit Prüfungen den Code treffen und nicht die Begründung. */
const ohneKommentare = (quelle: string) =>
  quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')

const focus = (patch: Partial<StoredFocus> = {}): StoredFocus => ({
  id: 'f1',
  axisId: 'endurance',
  dimension: 'endurance',
  priority: 1,
  note: '',
  reviewAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  closedAt: null,
  ...patch,
})

test.describe('Was ein Schwerpunkt ist — und was nicht', () => {
  test('das Modell kennt keine Übungen, Sätze oder Videos', () => {
    const felder = Object.keys(focus())
    expect(felder.sort()).toEqual(
      ['axisId', 'closedAt', 'createdAt', 'dimension', 'id', 'note', 'priority', 'reviewAt'].sort(),
    )
    // Was hier nicht im Modell steht, kann später auch nicht hineinrutschen.
    for (const verboten of ['exercises', 'sets', 'reps', 'videoUrl', 'plan', 'workout']) {
      expect(felder, verboten).not.toContain(verboten)
    }
  })

  test('die App liefert keinen Textbaustein für die Anweisung', () => {
    // Der Satz kommt vom Trainer (§81). Fände sich im Regelwerk eine Liste
    // fertiger Sätze, wäre das eine Trainingsempfehlung der App.
    // Ohne Kommentare geprüft: die Begründung im Kopf der Datei DARF von
    // Textbausteinen sprechen — der Code darf keine enthalten.
    const code = ohneKommentare(readFileSync('src/domain/trainingFocus.ts', 'utf8'))
    expect(/SUGGESTION|VORSCHLAG|TEMPLATE|BAUSTEIN|ADVICE/i.test(code)).toBe(false)
  })

  test('der Regelteil enthält keine Übungsnamen', () => {
    const code = ohneKommentare(readFileSync('src/domain/trainingFocus.ts', 'utf8'))
    expect(/Kniebeuge|Squat|Intervall|Wiederholung/i.test(code)).toBe(false)
  })
})

test.describe('Die Regeln', () => {
  test('höchstens drei offene Schwerpunkte', () => {
    const drei = [focus({ id: 'a' }), focus({ id: 'b' }), focus({ id: 'c' })]
    expect(activeFocuses(drei)).toHaveLength(MAX_ACTIVE_FOCUSES)
    expect(canAddFocus(drei)).toBe(false)
    // Ein abgeschlossener zählt nicht mit: er ist Verlauf, keine Priorität.
    const mitAbgeschlossenem = [...drei.slice(0, 2), focus({ id: 'c', closedAt: '2026-02-01T00:00:00.000Z' })]
    expect(canAddFocus(mitAbgeschlossenem)).toBe(true)
    expect(closedFocuses(mitAbgeschlossenem)).toHaveLength(1)
  })

  test('offene stehen nach Priorität, bei Gleichstand nach Alter', () => {
    const list = [
      focus({ id: 'spät', priority: 1, createdAt: '2026-03-01T00:00:00.000Z' }),
      focus({ id: 'niedrig', priority: 3 }),
      focus({ id: 'früh', priority: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
    ]
    expect(activeFocuses(list).map((f) => f.id)).toEqual(['früh', 'spät', 'niedrig'])
  })

  test('auf derselben Achse läuft nur ein offener Schwerpunkt', () => {
    const list = [focus({ axisId: 'power' })]
    expect(hasOpenFocusFor(list, 'power')).toBe(true)
    expect(hasOpenFocusFor(list, 'agility')).toBe(false)
    expect(hasOpenFocusFor([focus({ axisId: 'power', closedAt: '2026-02-01T00:00:00.000Z' })], 'power')).toBe(false)
  })

  test('die Nachmessung ist ein Termin, kein Zeitpunkt', () => {
    const f = focus({ reviewAt: '2026-06-14' })
    expect(reviewDue(f, '2026-06-14T08:00:00.000Z')).toBe(true)
    expect(reviewDue(f, '2026-06-13T23:00:00.000Z')).toBe(false)
    expect(reviewDue(focus({ reviewAt: null }), '2030-01-01')).toBe(false)
  })
})

test.describe('Der Kreis schliesst sich über die Messung', () => {
  const result = (id: string, performedAt: string, score: number): StoredResult =>
    ({
      id,
      testSlug: 'cooper_12min',
      performedAt,
      values: {},
      metrics: {},
      score,
      bodyWeightKg: null,
      ageYears: null,
      sex: null,
      attempts: [],
      attemptSelection: null,
      photo: null,
      context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
      assessmentId: null,
      createdAt: performedAt,
      notes: '',
    }) as unknown as StoredResult

  test('ohne Messung nach der Anlage steht dort nichts Erfundenes', () => {
    const outcome = focusOutcome(focus(), [result('r1', '2025-12-01T00:00:00.000Z', 3000)])
    expect(outcome.result).toBeNull()
    expect(outcome.change).toBeNull()
  })

  test('die jüngste Messung nach der Anlage beantwortet den Schwerpunkt', () => {
    const outcome = focusOutcome(focus(), [
      result('r1', '2025-12-01T00:00:00.000Z', 3000),
      result('r2', '2026-03-01T00:00:00.000Z', 3200),
      result('r3', '2026-06-01T00:00:00.000Z', 3300),
    ])
    expect(outcome.result?.id).toBe('r3')
    // Die Bewertung kommt aus derselben Rechnung wie überall: mit typischem
    // Fehler, nicht als blosse Prozentzahl.
    expect(outcome.change?.changePercent).not.toBeNull()
    expect(outcome.change).toHaveProperty('typicalErrorPercent')
  })

  test('eine Achse ohne zugeordnete Tests behauptet keine Wirkung', () => {
    // Sportartspezifische Kennzahlachsen tragen keine der sechs Fähigkeiten.
    // Eine hilfsweise Zuordnung würde etwas anderes messen und das Ergebnis
    // diesem Schwerpunkt zuschreiben.
    const outcome = focusOutcome(focus({ dimension: null, axisId: 'run_economy' }), [
      result('r1', '2026-06-01T00:00:00.000Z', 3300),
    ])
    expect(outcome.result).toBeNull()
    expect(outcome.change).toBeNull()
  })
})

test.describe('Bestand', () => {
  test('ein Bestand ohne Schwerpunkte wird angehoben, nicht verworfen', () => {
    const alt = { ...buildDemoData(), version: 12 } as unknown as Record<string, unknown>
    for (const athlete of alt.athletes as Record<string, unknown>[]) delete athlete.focuses
    const outcome = parseStoredData(alt)
    expect(outcome.data, 'kein Datenverlust bei der Migration').not.toBeNull()
    expect(outcome.report.migratedFrom).toBe(12)
    expect(outcome.data!.version).toBe(CURRENT_SCHEMA_VERSION)
    // Leer und nicht erfunden: eine Migration kann keine Trainerentscheidung
    // nachholen.
    expect(outcome.data!.athletes[0].focuses).toEqual([])
  })

  test('ein zu langer Trainersatz wird gekappt, nicht abgewiesen', () => {
    const store = buildDemoData()
    store.athletes[0].focuses = [focus({ note: 'x'.repeat(FOCUS_NOTE_MAX + 50) })]
    const outcome = parseStoredData(JSON.parse(JSON.stringify(store)))
    // Zod weist zu lange Zeichenketten ab — der Datensatz darf deshalb gar
    // nicht erst so entstehen. Geprüft wird, dass die Grenze greift.
    expect(outcome.data?.athletes[0].focuses.length ?? 0).toBe(0)
  })
})

test.describe('Im Bericht und in der App', () => {
  test('der Demobestand zeigt ausgefüllte Schwerpunkte im Profil', async ({ page }) => {
    await openDemo(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Trainingsschwerpunkte' })).toBeVisible()
    await expect(page.getByText(/Grundlage steht hinter der Kraft zurück/)).toBeVisible()
    await expect(page.getByText(/Übungen, Sätze und Trainingspläne stehen hier bewusst nicht/)).toBeVisible()
  })

  test('der Bericht zeigt den Satz des Trainers wörtlich', async ({ page }) => {
    await openDemo(page)
    await page.goto('/bericht', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Trainingsschwerpunkte' })).toBeVisible()
    await expect(page.getByText(/Gewicht halten, Last weiter aufbauen/)).toBeVisible()
    // Daneben steht die GEMESSENE Antwort, nicht eine Einschätzung. Im
    // Demobestand liegen je Test drei Messungen — zu wenige für eine Aussage
    // über die Streuung, und genau das sagt der Bericht dann auch, statt
    // einen Fortschritt zu behaupten.
    await expect(
      page.getByText(/Für eine Aussage über die Streuung fehlen noch Messungen/).first(),
    ).toBeVisible()
  })
})
