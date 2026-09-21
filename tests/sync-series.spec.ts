import { expect, test } from '@playwright/test'
import { emptyData, parseAthlete } from '../src/lib/store/schema'
import { carriesSeries, mergeSeries, planSeriesPush, seriesRows, stripSeries, type SeriesRow } from '../src/lib/supabase/series'
import type { StoredAthlete, StoredDiaryEntry } from '../src/lib/store/localStore'

/**
 * Tabellentrennung (docs/ausbau.md §6, Etappe 0): Zeitreihen neben dem
 * Dokument — die Regeln ohne Netz.
 *
 * §89 gilt hier doppelt: kein Eintrag darf beim Übergang vom alten Dokument
 * in die Zeilen verloren gehen, und kein Eintrag darf zwischen zwei
 * Geräten verschwinden, nur weil einer früher schrieb.
 */

function entry(id: string, day: string, updatedAt: string, weightKg: number | null = null): StoredDiaryEntry {
  return { id, day, weightKg, sleepHours: null, sleepQuality: null, energy: null, stress: null, soreness: null, steps: null, adherence: null, sessions: [], note: '', createdAt: updatedAt, updatedAt }
}

function athleteWith(diary: StoredDiaryEntry[]): StoredAthlete {
  const a = emptyData().athletes[0]
  return { ...a, diary }
}

function row(athleteId: string, e: StoredDiaryEntry, extra: Partial<SeriesRow> = {}): SeriesRow {
  return { athlete_id: athleteId, kind: 'diary', entry_id: e.id, day: e.day, payload: e as unknown as Record<string, unknown>, device_id: 'other', updated_at: e.updatedAt, deleted_at: null, ...extra }
}

const T1 = '2026-09-01T08:00:00.000Z'
const T2 = '2026-09-02T08:00:00.000Z'
const T3 = '2026-09-03T08:00:00.000Z'

test.describe('Dokument und Zeilen', () => {
  test('stripSeries lässt das Dokument ohne Zeitreihen zurück, der Rest bleibt', () => {
    const a = athleteWith([entry('e1', '2026-09-01', T1)])
    const stripped = stripSeries(a)
    expect(stripped.diary).toEqual([])
    expect(stripped.workouts).toEqual([])
    expect(stripped.decisions).toEqual([])
    expect(stripped.meals).toEqual([])
    expect(stripped.profile).toBe(a.profile)
    expect(stripped.results).toBe(a.results)
    // Das Original bleibt unberührt.
    expect(a.diary.length).toBe(1)
  })

  test('seriesRows: eine Zeile je Eintrag, Tag aus dem Eintrag, Entscheidung aus decidedOn', () => {
    const a = athleteWith([entry('e1', '2026-09-01', T1)])
    a.decisions = [{ id: 'd1', decidedOn: '2026-08-20', updatedAt: T1 } as never]
    const rows = seriesRows(a, 'me')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ kind: 'diary', entry_id: 'e1', day: '2026-09-01', device_id: 'me' })
    expect(rows[1]).toMatchObject({ kind: 'decision', entry_id: 'd1', day: '2026-08-20' })
  })

  test('carriesSeries erkennt ein Dokument von vor der Trennung', () => {
    expect(carriesSeries({ diary: [{ id: 'x' }] })).toBe(true)
    expect(carriesSeries({ diary: [], workouts: [], decisions: [], meals: [] })).toBe(false)
    expect(carriesSeries({})).toBe(false)
    expect(carriesSeries(null)).toBe(false)
  })

  test('parseAthlete füllt ein altes Dokument mit Vorgaben — und weist Unsinn ab', () => {
    const old = { ...emptyData().athletes[0] } as Record<string, unknown>
    delete old.diary
    delete old.workouts
    delete old.decisions
    delete old.meals
    delete old.nutrition
    const parsed = parseAthlete(old)
    expect(parsed).not.toBeNull()
    expect(parsed?.diary).toEqual([])
    expect(parsed?.meals).toEqual([])
    expect(parseAthlete({ id: 42 })).toBeNull()
    expect(parseAthlete('nein')).toBeNull()
  })
})

test.describe('planSeriesPush — was hochgeht', () => {
  test('ohne Stand geht alles hoch, nichts wird Grabstein', () => {
    const a = athleteWith([entry('e1', '2026-09-01', T1), entry('e2', '2026-09-02', T2)])
    const plan = planSeriesPush(a, [], null, 'me')
    expect(plan.upserts.map((r) => r.entry_id)).toEqual(['e1', 'e2'])
    expect(plan.tombstones).toEqual([])
  })

  test('mit Stand gehen nur Einträge hoch, die seitdem geändert wurden', () => {
    const a = athleteWith([entry('e1', '2026-09-01', T1), entry('e2', '2026-09-02', T3)])
    const plan = planSeriesPush(a, [], T2, 'me')
    expect(plan.upserts.map((r) => r.entry_id)).toEqual(['e2'])
  })

  test('Grabstein nur für Zeilen, die der Server VOR dem letzten Abgleich hatte und die lokal fehlen', () => {
    const a = athleteWith([entry('e1', '2026-09-01', T1)])
    const gone = entry('gone', '2026-08-30', T1)
    const fresh = entry('fresh', '2026-09-03', T3)
    const remote = [row(a.id, entry('e1', '2026-09-01', T1)), row(a.id, gone), row(a.id, fresh), row(a.id, entry('dead', '2026-08-01', T1), { deleted_at: T2 })]
    const plan = planSeriesPush(a, remote, T2, 'me')
    // «gone» wurde lokal gelöscht → Grabstein. «fresh» kam nach dem Stand von
    // einem anderen Gerät → kein Grabstein. «dead» ist schon einer.
    expect(plan.tombstones).toEqual([{ kind: 'diary', entry_id: 'gone' }])
  })

  test('Zeilen anderer Athleten werden nicht angefasst', () => {
    const a = athleteWith([])
    const plan = planSeriesPush(a, [row('someone-else', entry('x', '2026-09-01', T1))], T2, 'me')
    expect(plan.tombstones).toEqual([])
  })
})

test.describe('mergeSeries — was hereinkommt', () => {
  test('unbekannt kommt dazu, Grabstein nimmt weg, Rest bleibt', () => {
    const a = athleteWith([entry('e1', '2026-09-01', T1), entry('e2', '2026-09-02', T1)])
    const { athlete, changed } = mergeSeries(a, [row(a.id, entry('e3', '2026-09-03', T3)), row(a.id, entry('e2', '2026-09-02', T1), { deleted_at: T3 })])
    expect(changed).toBe(2)
    expect(athlete.diary.map((e) => e.id)).toEqual(['e1', 'e3'])
  })

  test('bei bekanntem Eintrag gewinnt der jüngere; bei Gleichstand bleibt der lokale', () => {
    const local = entry('e1', '2026-09-01', T2, 80)
    const a = athleteWith([local])
    const newer = mergeSeries(a, [row(a.id, entry('e1', '2026-09-01', T3, 81))])
    expect(newer.changed).toBe(1)
    expect(newer.athlete.diary[0].weightKg).toBe(81)
    const older = mergeSeries(a, [row(a.id, entry('e1', '2026-09-01', T1, 79))])
    expect(older.changed).toBe(0)
    expect(older.athlete.diary[0].weightKg).toBe(80)
    const tie = mergeSeries(a, [row(a.id, entry('e1', '2026-09-01', T2, 99))])
    expect(tie.changed).toBe(0)
    expect(tie.athlete.diary[0]).toBe(local)
  })

  test('ohne Änderung kommt dieselbe Referenz zurück — kein Schreibvorgang ohne Grund', () => {
    const a = athleteWith([entry('e1', '2026-09-01', T2)])
    expect(mergeSeries(a, []).athlete).toBe(a)
    expect(mergeSeries(a, [row('other', entry('e9', '2026-09-01', T3))]).athlete).toBe(a)
    expect(mergeSeries(a, [row(a.id, entry('e1', '2026-09-01', T1))]).athlete).toBe(a)
  })

  test('eine Nutzlast, deren Kennung nicht zur Zeile passt, wird nicht übernommen', () => {
    const a = athleteWith([])
    const bad = row(a.id, entry('e1', '2026-09-01', T1), { entry_id: 'anders' })
    expect(mergeSeries(a, [bad]).changed).toBe(0)
  })

  test('Übergang: Einträge aus dem alten Dokument gehen vollständig als Zeilen hoch', () => {
    // Ein Dokument von vor der Trennung: Tagebuch im Dokument, Server ohne Zeilen.
    const old = athleteWith([entry('e1', '2026-09-01', T1), entry('e2', '2026-09-02', T2)])
    const parsed = parseAthlete(old)!
    const plan = planSeriesPush(parsed, [], null, 'me')
    expect(plan.upserts).toHaveLength(2)
    // …und das Dokument geht ohne sie hoch, verliert aber sonst nichts.
    expect(stripSeries(parsed).diary).toEqual([])
    expect(stripSeries(parsed).id).toBe(old.id)
  })
})
