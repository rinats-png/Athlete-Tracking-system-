import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { photoDays, photosOfDay, withdrawConsent } from '../src/domain/health'
import { deriveKey, encryptJson, newSalt, opaqueId } from '../src/lib/health/crypto'
import { healthRecords, planHealthPush, type RemoteHealthRow } from '../src/lib/health/sync'
import {
  CURRENT_SCHEMA_VERSION,
  HEALTH_CATEGORIES,
  MAX_HEALTH_PHOTO_CHARS,
  PHOTO_POSES,
  emptyAthlete,
  emptyData,
  parseStoredData,
} from '../src/lib/store/schema'
import { stripHealth } from '../src/lib/supabase/series'
import type { StoredHealth, StoredPhotoEntry } from '../src/lib/store/localStore'

/**
 * Vergleichsfotos — die empfindlichste Kategorie der Gesundheitsschicht.
 *
 * Vier Zusagen halten diese Fälle fest:
 *
 *   1. Eigene Einwilligung. Wer Laborwerte führt, hat nicht in Fotos
 *      eingewilligt — und der Widerruf löscht die Bilder sofort.
 *   2. Ein Bild, das nicht klein genug wird, kommt gar nicht erst in den
 *      Bestand: die Obergrenze steht im Schema, nicht nur in der Oberfläche.
 *   3. Auf dem Server steht weder das Bild noch die Tatsache, DASS es
 *      Bilder gibt — auch nicht in der Kennung.
 *   4. Verglichen wird nur innerhalb einer Pose, und die App sagt kein Wort
 *      dazu, was sie zeigt.
 */

const emptyHealth = (): StoredHealth => ({ consents: [], labs: [], symptoms: [], cycle: [], selfImage: [], meds: [], photos: [], trainingKcalPerDay: null, updatedAt: null })

const photo = (id: string, day: string, pose: StoredPhotoEntry['pose'], updatedAt = '2026-09-01T10:00:00.000Z'): StoredPhotoEntry => ({
  id,
  day,
  pose,
  dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  note: '',
  createdAt: updatedAt,
  updatedAt,
})

test.describe('Fotos als eigene Kategorie', () => {
  test('«photos» ist eine Kategorie mit eigener Einwilligung', () => {
    expect(HEALTH_CATEGORIES).toContain('photos')
  })

  test('der Widerruf löscht die Bilder, nicht nur die Einwilligung', () => {
    const health: StoredHealth = { ...emptyHealth(), photos: [photo('p1', '2026-09-01', 'frontRelaxed')] }
    const after = withdrawConsent(health, 'photos', '2026-09-02T08:00:00.000Z')
    expect(after.photos).toHaveLength(0)
    expect(after.consents.find((c) => c.category === 'photos')?.withdrawnAt).toBe('2026-09-02T08:00:00.000Z')
  })

  test('ein Bestand der Version 25 bekommt eine leere Fotoliste', () => {
    const athlete = { ...emptyAthlete('a1') } as unknown as Record<string, unknown>
    const health = { ...(athlete.health as Record<string, unknown>) }
    delete health.photos
    const old = { ...emptyData(), version: 25, athletes: [{ ...athlete, health }], activeAthleteId: 'a1' }
    const result = parseStoredData(old)
    expect(result.data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.data?.athletes[0].health.photos).toEqual([])
  })

  test('ein Bild über der Obergrenze kommt nicht in den Bestand', () => {
    const athlete = emptyAthlete('a1')
    athlete.health = { ...emptyHealth(), photos: [{ ...photo('p1', '2026-09-01', 'frontRelaxed'), dataUrl: 'x'.repeat(MAX_HEALTH_PHOTO_CHARS + 1) }] }
    const result = parseStoredData({ ...emptyData(), athletes: [athlete], activeAthleteId: 'a1' })
    expect(result.data?.athletes[0]?.health.photos ?? []).toHaveLength(0)
  })

  test('die Fotos eines Tages stehen in der Reihenfolge der Posen', () => {
    const photos = [photo('p1', '2026-09-01', 'sidePose'), photo('p2', '2026-09-01', 'frontRelaxed'), photo('p3', '2026-09-02', 'backPose')]
    expect(photosOfDay(photos, '2026-09-01').map((p) => p.pose)).toEqual(['frontRelaxed', 'sidePose'])
    expect(PHOTO_POSES.indexOf('frontRelaxed')).toBeLessThan(PHOTO_POSES.indexOf('sidePose'))
  })

  test('die Tage stehen jüngster zuerst und jeder nur einmal', () => {
    const photos = [photo('p1', '2026-09-01', 'frontRelaxed'), photo('p2', '2026-09-03', 'frontRelaxed'), photo('p3', '2026-09-03', 'backPose')]
    expect(photoDays(photos)).toEqual(['2026-09-03', '2026-09-01'])
  })

  test('Fotos gehen nicht in das unverschlüsselte Serverdokument', () => {
    const athlete = emptyAthlete('a1')
    athlete.health = { ...emptyHealth(), photos: [photo('p1', '2026-09-01', 'frontRelaxed')] }
    expect(stripHealth(athlete).health.photos).toEqual([])
  })
})

test.describe('Was der Server von den Fotos sieht', () => {
  const PHRASE = 'K7M2-9XQR-ABCD-EFGH-JKLM-NPQR'

  test('das Chiffrat enthält weder das Bild noch die Art', async () => {
    const keys = (await deriveKey(PHRASE, newSalt()))!
    const blob = (await encryptJson(keys, { e: 'photo:p1', d: photo('p1', '2026-09-01', 'frontRelaxed') }))!
    for (const wort of ['photo', 'pose', 'frontrelaxed', 'jpeg', 'image', 'dataurl', '2026-09-01']) {
      expect(blob.toLowerCase(), wort).not.toContain(wort)
    }
  })

  test('die Kennung verrät die Art nicht — und ist auf zwei Geräten dieselbe', async () => {
    const salt = newSalt()
    const a = (await deriveKey(PHRASE, salt))!
    const b = (await deriveKey(PHRASE, salt))!
    const fremd = (await deriveKey('K7M2-9XQR-ABCD-EFGH-JKLM-NPQQ', salt))!

    const kennung = (await opaqueId(a, 'photo:p1'))!
    // Dieselbe Phrase, dasselbe Salz, dieselbe Kennung — sonst gäbe es
    // keinen Abgleich zwischen zwei Geräten.
    expect(await opaqueId(b, 'photo:p1')).toBe(kennung)
    // Aber nichts davon steht im Klartext da.
    expect(kennung).not.toContain('photo')
    expect(kennung).not.toContain(':')
    expect(await opaqueId(a, 'photo:p2')).not.toBe(kennung)
    expect(await opaqueId(fremd, 'photo:p1')).not.toBe(kennung)
    // Auch die harmlos wirkende Sammelkennung ist ohne Schlüssel nicht bildbar.
    expect(await opaqueId(a, 'meta')).not.toBe(await opaqueId(fremd, 'meta'))
  })

  test('ein Foto wird als Datensatz geführt und beim Abgleich mitgeschrieben', async () => {
    const athlete = emptyAthlete('a1')
    athlete.health = { ...emptyHealth(), photos: [photo('p1', '2026-09-01', 'frontRelaxed', '2026-09-01T10:00:00.000Z')] }
    const records = healthRecords(athlete)
    expect(records.find((r) => r.entryId === 'photo:p1')?.kind).toBe('photo')

    const keys = (await deriveKey(PHRASE, newSalt()))!
    const withTags = []
    for (const r of records) withTags.push({ ...r, remoteId: (await opaqueId(keys, r.entryId))! })

    const fremdeZeile: RemoteHealthRow = { athlete_id: 'a1', entry_id: 'eine-fremde-kennung', payload: 'v1.a.b', updated_at: '2026-08-01T00:00:00.000Z' }
    const plan = planHealthPush(withTags, [fremdeZeile], 'a1', '2026-08-15T00:00:00.000Z')
    expect(plan.upserts.map((r) => r.entryId)).toContain('photo:p1')
    // Die Zeile, die lokal fehlt und vor dem letzten Abgleich da war,
    // bekommt einen Grabstein — der Vergleich läuft über die stumme Kennung.
    expect(plan.tombstones).toEqual(['eine-fremde-kennung'])
  })
})

test.describe('Der Bildschirm sagt nichts über das Bild', () => {
  test('kein Wort, das ein Foto einstuft', () => {
    const de = JSON.parse(readFileSync(new URL('../src/i18n/de.extra.json', import.meta.url), 'utf8')) as { health: Record<string, unknown> }
    const text = JSON.stringify({ photos: de.health.photos, poses: de.health.poses })
    for (const wort of ['zu dick', 'zu dünn', 'Symmetrie', 'Idealgewicht', 'Körperfettanteil von', 'Fortschritt von', 'Verbesserung um']) {
      expect(text, `«${wort}» wäre eine Bewertung`).not.toContain(wort)
    }
  })
})
