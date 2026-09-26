import { expect, test } from '@playwright/test'
import { BLOCKED_PATH_PREFIXES, MAX_PROPERTIES_BYTES, isBlockedKey, sanitizeEvent } from '../supabase/functions/_shared/analytics'

/**
 * Empfang der Nutzungsereignisse — was der Server annimmt und was nicht.
 *
 * Geprüft wird die reine Logik aus `_shared/analytics.ts`, dieselbe Datei,
 * die die Edge Function `track` importiert. Drei Zusagen:
 *
 *   1. Nichts aus der Gesundheitsschicht, auch nicht versteckt.
 *   2. Keine Kontokennung aus dem Anfragekörper.
 *   3. Keine Inhalte — nur, dass etwas passierte.
 */

const SESSION = '3f2a9c1e-7b4d-4e8a-9f21-0c5d6e7f8a9b'

test.describe('Was angenommen wird', () => {
  test('ein schlichtes Ereignis kommt durch', () => {
    const out = sanitizeEvent(JSON.stringify({ event_name: 'page_view', properties: { path: '/preise' }, session_id: SESSION }))
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.event.event_name).toBe('page_view')
    expect(out.event.properties).toEqual({ path: '/preise' })
    expect(out.event.session_id).toBe(SESSION)
  })

  test('fehlende Felder sind in Ordnung', () => {
    const out = sanitizeEvent(JSON.stringify({ event_name: 'session_start' }))
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.event.properties).toEqual({})
    expect(out.event.session_id).toBeNull()
    expect(out.event.access_token).toBeNull()
  })

  test('der Körper darf Text sein — so schickt ihn ein Beacon', () => {
    expect(sanitizeEvent('{"event_name":"page_view"}').ok).toBe(true)
  })
})

test.describe('Was abgelehnt wird', () => {
  test('kaputtes JSON, falscher Name', () => {
    expect(sanitizeEvent('{kaputt')).toEqual({ ok: false, reason: 'bad_json' })
    expect(sanitizeEvent('[1,2]')).toEqual({ ok: false, reason: 'bad_json' })
    expect(sanitizeEvent(JSON.stringify({ event_name: 'Böser Name!' }))).toEqual({ ok: false, reason: 'bad_name' })
    expect(sanitizeEvent(JSON.stringify({}))).toEqual({ ok: false, reason: 'bad_name' })
  })

  test('eine ungültige Sitzungskennung wird verworfen, nicht das Ereignis', () => {
    const out = sanitizeEvent(JSON.stringify({ event_name: 'page_view', session_id: 'nicht-eine-uuid' }))
    expect(out.ok && out.event.session_id).toBeNull()
  })
})

test.describe('Die Gesundheitsschicht', () => {
  for (const prefix of BLOCKED_PATH_PREFIXES) {
    test(`nichts unter ${prefix}`, () => {
      expect(sanitizeEvent(JSON.stringify({ event_name: 'page_view', properties: { path: prefix } }))).toEqual({ ok: false, reason: 'blocked_path' })
      expect(sanitizeEvent(JSON.stringify({ event_name: 'page_view', properties: { path: `${prefix}/irgendwas?x=1` } }))).toEqual({ ok: false, reason: 'blocked_path' })
    })
  }

  test('auch nicht versteckt in einem anderen Feld oder tiefer', () => {
    expect(sanitizeEvent(JSON.stringify({ event_name: 'x_klick', properties: { from: '/gesundheit' } })).ok).toBe(false)
    expect(sanitizeEvent(JSON.stringify({ event_name: 'x_klick', properties: { ctx: { ref: '/peakweek' } } })).ok).toBe(false)
  })

  test('ein ähnlich klingender Pfad ist kein gesperrter', () => {
    expect(sanitizeEvent(JSON.stringify({ event_name: 'page_view', properties: { path: '/gesundheitstipps' } })).ok).toBe(true)
  })
})

test.describe('Keine Inhalte, keine fremde Kennung', () => {
  test('eine user_id im Körper wird nicht gelesen', () => {
    const out = sanitizeEvent(JSON.stringify({ event_name: 'page_view', user_id: '11111111-1111-1111-1111-111111111111' }))
    expect(out.ok).toBe(true)
    // Es gibt im Ergebnis gar kein Feld dafür — die Kennung kommt nur aus dem Token.
    expect(out.ok && 'user_id' in out.event).toBe(false)
  })

  test('Schlüssel, die nach Inhalt klingen, fliegen raus — in jeder Schreibweise', () => {
    const out = sanitizeEvent(
      JSON.stringify({
        event_name: 'test_completed',
        properties: { slug: 'cooper_12min', value: 3000, userEmail: 'a@b.de', user_email: 'a@b.de', Weight_Kg: 80, nested: { note: 'geheim', ok: 1 } },
      }),
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    // Seit der Ereignisliste bleibt nur, was für test_completed erlaubt ist;
    // die Sperrwörter sind die zweite Schicht dahinter.
    expect(out.event.properties).toEqual({ slug: 'cooper_12min' })
  })

  test('harmlose Schlüssel, die einen gesperrten Wortteil nur ähnlich enthalten, bleiben', () => {
    // «key» und «name» sind nur exakt gesperrt — sonst flögen diese mit raus.
    for (const k of ['keyboard', 'feature', 'slug', 'screenName', 'plan', 'lang', 'step', 'valueCard']) {
      expect(isBlockedKey(k), k).toBe(false)
    }
    for (const k of ['email', 'contactEmail', 'e_mail_address', 'accessToken', 'bodyWeightKg', 'photoUrl', 'healthCategory', 'name', 'value']) {
      expect(isBlockedKey(k), k).toBe(true)
    }
  })

  test('lange Zeichenketten werden gekürzt, unbekannte Ereignisse abgelehnt', () => {
    const out = sanitizeEvent(JSON.stringify({ event_name: 'page_view', properties: { path: 'x'.repeat(500) } }))
    expect(out.ok && (out.event.properties.path as string).length).toBe(200)

    // Ein Ereignis ausserhalb der Liste kommt gar nicht bis zur Grössenprüfung.
    const big: Record<string, string> = {}
    for (let i = 0; i < 29; i++) big[`k${i}`] = 'x'.repeat(199)
    expect(JSON.stringify(big).length).toBeGreaterThan(MAX_PROPERTIES_BYTES)
    expect(sanitizeEvent(JSON.stringify({ event_name: 'x_y', properties: big }))).toEqual({ ok: false, reason: 'unknown_event' })
  })

})
