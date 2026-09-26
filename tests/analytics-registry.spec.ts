import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { EVENTS as SERVER_EVENTS, FORBIDDEN_PROPERTIES } from '../supabase/functions/_shared/eventRegistry'
import { EVENTS as CLIENT_EVENTS, allowProperties } from '../src/lib/analyticsEvents'
import { sanitizeEvent } from '../supabase/functions/_shared/analytics'
import { errorEvent, topFrame } from '../src/lib/errorCapture'

/**
 * Ereignisliste und Fehlererfassung (Master-Spezifikation L, Entscheidung 10).
 *
 * Die Zusagen: nur Ereignisse aus der Liste, nur deren Eigenschaften, keine
 * davon aus der Sperrliste — und die Liste im Client ist dieselbe wie auf
 * dem Server.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(f) ? [p] : []
  })
}

test.describe('Ereignisliste', () => {
  test('Client und Server führen dieselbe Liste', () => {
    expect(CLIENT_EVENTS).toEqual(SERVER_EVENTS)
  })

  test('keine gesperrte Eigenschaft steht in der Liste', () => {
    const lower = FORBIDDEN_PROPERTIES.map((p) => p.toLowerCase())
    for (const [event, props] of Object.entries(SERVER_EVENTS)) {
      for (const key of Object.keys(props)) expect(lower, `${event}.${key}`).not.toContain(key.toLowerCase())
    }
  })

  test('jedes im Code ausgelöste Ereignis steht in der Liste', () => {
    const names = new Set<string>()
    for (const file of sourceFiles('src')) {
      const text = readFileSync(file, 'utf-8')
      for (const m of text.matchAll(/trackEvent\('([a-z_]+)'/g)) names.add(m[1])
      // Die gezählten Speicherfunktionen (trackedActions.ts) liefern ['name', {...}].
      if (file.endsWith('trackedActions.ts')) for (const m of text.matchAll(/\['([a-z_]+)',/g)) names.add(m[1])
    }
    expect(names.size).toBeGreaterThan(10)
    for (const name of names) expect(Object.keys(SERVER_EVENTS), name).toContain(name)
  })

  test('der Client lässt nur erlaubte Eigenschaften mit dem erlaubten Typ durch', () => {
    expect(allowProperties('page_view', { path: '/preise', email: 'a@b.c', extra: 1 })).toEqual({ path: '/preise' })
    expect(allowProperties('page_leave', { path: '/x', seconds: '12' })).toEqual({ path: '/x' })
    expect(allowProperties('erfunden', {})).toBeNull()
  })

  test('der Server verwirft unbekannte Ereignisse und unbekannte Eigenschaften', () => {
    expect(sanitizeEvent(JSON.stringify({ event_name: 'secret_probe' }))).toEqual({ ok: false, reason: 'unknown_event' })
    const out = sanitizeEvent(JSON.stringify({ event_name: 'test_completed', properties: { slug: 'cooper_12min', inAssessment: false, distanceM: 3000 } }))
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.event.properties).toEqual({ slug: 'cooper_12min', inAssessment: false })
  })
})

test.describe('Fehlererfassung', () => {
  test('oberster Rahmen ohne Herkunft und ohne Abfrage', () => {
    const stack = 'TypeError: x is undefined\n    at run (https://kydon.app/assets/index-AbC123.js?v=2:12:345)\n    at other (https://kydon.app/assets/vendor.js:1:1)'
    expect(topFrame(stack)).toBe('index-AbC123.js:12:345')
    expect(topFrame(undefined)).toBe('')
  })

  test('die Meldung geht nie mit — sie kann Eingaben enthalten', () => {
    const e = new TypeError('Cannot read 82,5 kg of max@example.com')
    const event = errorEvent(e, '/ergebnis/3f2a9c1e-7b4d-4e8a-9f21-0c5d6e7f8a9b')
    expect(event.errorType).toBe('TypeError')
    expect(event.route).toBe('/ergebnis/:id')
    expect(JSON.stringify(event)).not.toContain('82,5')
    expect(JSON.stringify(event)).not.toContain('example.com')
    expect(Object.keys(event).sort()).toEqual(Object.keys(SERVER_EVENTS.client_error).sort())
  })
})
