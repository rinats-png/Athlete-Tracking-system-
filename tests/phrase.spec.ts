import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { buildPrompt, isKind, isLocale, monthKey, MONTHLY_LIMIT, NAME_TOKEN, PHRASE_PRODUCTS, sanitizeFacts } from '../supabase/functions/_shared/phrase'
import { passesGuard } from '../src/domain/answerGuard'

/** Etappe 7c: Sprachmodell-Schicht — was hinausgeht, was zurückkommt, was nie passieren darf. */

test.describe('Fakten für den Anbieter', () => {
  test('Zahlen, Testkennungen, Daten und Stufen sind erlaubt', () => {
    const facts = [{ key: 'firstLast', params: { first: 50, last: 55.5, unit: 'kg', firstDay: '2026-09-01', lastDay: '2026-10-01' } }, { key: 'withinNoise', params: { slug: 'grip_strength', percent: 1.2 } }, { key: 'level', params: { level: 'HIGH', score: 71 } }]
    expect(sanitizeFacts(facts)).toEqual(facts)
  })
  test('ein Name oder Freitext wird abgewiesen, auch ohne Leerzeichen', () => {
    expect(sanitizeFacts([{ key: 'x', params: { name: 'Mia' } }])).toBeNull()
    expect(sanitizeFacts([{ key: 'x', params: { slug: 'Mia Müller' } }])).toBeNull()
    expect(sanitizeFacts([{ key: 'x', params: { note: 'Knie tut weh' } }])).toBeNull()
    expect(sanitizeFacts([{ key: 'x', params: { day: 'gestern' } }])).toBeNull()
  })
  test('Form: leer, zu viele, kein Objekt, unendliche Zahl', () => {
    expect(sanitizeFacts([])).toBeNull()
    expect(sanitizeFacts('x')).toBeNull()
    expect(sanitizeFacts(Array.from({ length: 25 }, () => ({ key: 'a', params: {} })))).toBeNull()
    expect(sanitizeFacts([{ key: 'a', params: { n: Infinity } }])).toBeNull()
    expect(sanitizeFacts([{ key: 'a b', params: {} }])).toBeNull()
  })
})

test.describe('Vorgaben', () => {
  test('Art, Sprache, Monat, Grenze und Stufen', () => {
    expect(isKind('brief') && isKind('answer') && isKind('draft')).toBe(true)
    expect(isKind('report')).toBe(false)
    expect(isLocale('nb')).toBe(true)
    expect(isLocale('pt')).toBe(false)
    expect(monthKey(new Date('2026-10-31T23:59:00Z'))).toBe('2026-10')
    expect(MONTHLY_LIMIT).toBe(30)
    expect(PHRASE_PRODUCTS).toEqual(['athlete_pro', 'athlete_elite', 'coach_pro', 'coach_club'])
  })
  test('der Auftrag verbietet Rat, Ursache und neue Zahlen; der Entwurf trägt nur den Platzhalter', () => {
    const facts = [{ key: 'overdue', params: { days: 12 } }]
    const a = buildPrompt('answer', 'de', facts)
    expect(a.system).toMatch(/German/)
    expect(a.system).toMatch(/no training advice/i)
    expect(a.system).toMatch(/Do not invent/i)
    expect(a.user).toBe(JSON.stringify({ facts }))
    expect(buildPrompt('draft', 'en', facts).system).toContain(NAME_TOKEN)
    expect(buildPrompt('brief', 'en', facts).system).not.toContain(NAME_TOKEN)
  })
})

test.describe('Zahlenwächter an einem Modelltext', () => {
  const facts = [{ key: 'overdue', params: { days: 12 } }]
  test('Text mit den Zahlen der Fakten besteht, erfundene Zahl nicht', () => {
    expect(passesGuard('Die Messung ist seit 12 Tagen fällig.', facts)).toBe(true)
    expect(passesGuard('Die Messung ist seit 14 Tagen fällig.', facts)).toBe(false)
    expect(passesGuard('Seit 12 Tagen, das sind 2 Wochen.', facts)).toBe(false)
  })
})

test.describe('Bildschirm', () => {
  test('ohne Konto bleibt die feste Antwort und ein Satz sagt warum', async ({ page }) => {
    await openDemo(page)
    await page.goto('/fragen')
    await page.getByTestId('ask-q-confidence').click()
    await page.getByTestId('phrase-run').click()
    await expect(page.getByTestId('phrase-fallback')).toBeVisible()
    await expect(page.getByTestId('ask-answer')).toContainText(/\d/)
    expect(await page.getByTestId('phrase').innerText()).not.toMatch(/phrase\.reason/)
  })
})
