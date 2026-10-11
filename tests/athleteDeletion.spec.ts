import { expect, test } from '@playwright/test'
import { planDeletions } from '../src/lib/supabase/deletions'

/**
 * Löschweg ganzer Athleten (Migration 20261011100000_document_tombstones).
 *
 * Bis heute holte der Abgleich einen lokal gelöschten Athleten vom Server
 * zurück: das Dokument stand dort noch, und «auf dem Server, aber nicht auf
 * dem Gerät» hiess «noch nicht geholt». Diese Fälle halten die Entscheidung
 * fest, die das jetzt verhindert.
 */

const live = (id: string) => ({ athlete_id: id, deleted_at: null })
const dead = (id: string) => ({ athlete_id: id, deleted_at: '2026-10-11T10:00:00.000Z' })

test.describe('Löschen im Abgleich', () => {
  test('lokal gelöscht, auf dem Server lebendig: Grabstein schreiben, nicht zurückholen', () => {
    const plan = planDeletions([live('a'), live('b')], ['b'], { a: '2026-10-11T09:00:00.000Z' })
    expect(plan.pushTombstones).toEqual([{ id: 'a', at: '2026-10-11T09:00:00.000Z' }])
    expect(plan.skipPull.has('a'), 'sonst käme der Athlet zurück').toBe(true)
    expect(plan.dropLocally).toEqual([])
  })

  test('ein anderes Gerät hat gelöscht: lokal entfernen', () => {
    const plan = planDeletions([dead('a'), live('b')], ['a', 'b'], {})
    expect(plan.dropLocally).toEqual(['a'])
    expect(plan.skipPull.has('a')).toBe(true)
    expect(plan.pushTombstones).toEqual([])
  })

  test('Grabstein steht schon: Vormerkung erledigen', () => {
    const plan = planDeletions([dead('a')], [], { a: '2026-10-11T09:00:00.000Z' })
    expect(plan.clearPending).toEqual(['a'])
    expect(plan.pushTombstones).toEqual([])
  })

  test('nie hochgeladen: nichts zu schreiben, Vormerkung verfällt', () => {
    const plan = planDeletions([live('b')], ['b'], { a: '2026-10-11T09:00:00.000Z' })
    expect(plan.clearPending).toEqual(['a'])
    expect(plan.pushTombstones).toEqual([])
  })

  test('ohne Löschungen ändert sich nichts', () => {
    const plan = planDeletions([live('a')], ['a'], {})
    expect(plan).toEqual({ dropLocally: [], pushTombstones: [], clearPending: [], skipPull: new Set() })
  })
})

test.describe('Vormerken auf dem Gerät', () => {
  const memory = new Map<string, string>()
  test.beforeEach(() => {
    memory.clear()
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    }
  })

  test('nach einem Abgleich wird die Löschung vorgemerkt; ohne Abgleich nicht', async () => {
    const { markAthleteDeleted, readSyncState } = await import('../src/lib/supabase/syncState')
    markAthleteDeleted('a', '2026-10-11T09:00:00.000Z')
    expect(readSyncState().deleted, 'nie abgeglichen: nichts auf dem Server').toEqual({})

    memory.set('kydon.sync.v1', JSON.stringify({ seen: { a: 'x' }, lastSyncedAt: null, seriesSyncedAt: null, conflicts: [], pool: 'u' }))
    expect(readSyncState().deleted, 'alter Stand ohne Feld').toEqual({})
    markAthleteDeleted('a', '2026-10-11T09:00:00.000Z')
    expect(readSyncState().deleted).toEqual({ a: '2026-10-11T09:00:00.000Z' })
  })
})
