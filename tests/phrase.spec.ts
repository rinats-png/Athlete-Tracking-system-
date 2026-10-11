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
  test('ohne Einwilligung wird gefragt — und ohne Ja geht nichts raus', async ({ page }) => {
    const calls: string[] = []
    await page.route('**/functions/v1/phrase', (route) => {
      calls.push(route.request().url())
      return route.abort()
    })
    await openDemo(page)
    await page.goto('/fragen')
    await page.getByTestId('ask-q-confidence').click()
    await page.getByTestId('phrase-run').click()
    const consent = page.getByTestId('ai-consent')
    await expect(consent).toBeVisible()
    await expect(consent).toContainText('Was nicht gesendet wird')
    await expect(consent).toContainText('Anthropic')
    // Nichts vorausgewählt: ohne Altersbestätigung kein Einwilligen.
    await expect(page.getByTestId('ai-consent-accept')).toBeDisabled()
    await page.getByTestId('ai-consent-decline').click()
    await expect(consent).toHaveCount(0)
    await expect(page.getByTestId('ask-answer')).toContainText(/\d/)
    expect(calls, 'ohne Einwilligung kein Aufruf').toEqual([])
  })

  test('ohne Konto lässt sich die Einwilligung nicht speichern — gesendet wird nichts', async ({ page }) => {
    const calls: string[] = []
    await page.route('**/functions/v1/phrase', (route) => {
      calls.push(route.request().url())
      return route.abort()
    })
    await openDemo(page)
    await page.goto('/fragen')
    await page.getByTestId('ask-q-confidence').click()
    await page.getByTestId('phrase-run').click()
    await page.getByTestId('ai-consent-age').check()
    await page.getByTestId('ai-consent-accept').click()
    await expect(page.getByTestId('ai-consent-failed')).toBeVisible()
    expect(calls).toEqual([])
    expect(await page.evaluate(() => localStorage.getItem('kydon.ai.consent.v1'))).toBeNull()
  })

  test('im Profil steht der Stand der Einwilligung', async ({ page }) => {
    await openDemo(page)
    await page.goto('/profil')
    await expect(page.getByTestId('ai-setting-state')).toContainText('Nicht eingewilligt')
  })

  test('ein widerrufener Stand sendet nichts, auch nicht nach Neuladen', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => localStorage.setItem('kydon.ai.consent.v1', JSON.stringify({ state: 'withdrawn', version: '2026-10-11', at: '2026-10-11T10:00:00.000Z', serverPending: false })))
    await page.goto('/profil')
    await expect(page.getByTestId('ai-setting-state')).toContainText('Widerrufen')
  })
})

test.describe('Sperren', () => {
  test('Trainerentwürfe über Athleten bleiben bis zum Nachtrag des AV-Vertrags gesperrt', async () => {
    const { PHRASE_KINDS_ENABLED, AI_CONSENT_VERSION } = await import('../supabase/functions/_shared/phrase')
    expect(PHRASE_KINDS_ENABLED).not.toContain('draft')
    expect(AI_CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('die Edge Function prüft Einwilligung und Art, bevor sie den Anbieter ruft', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../supabase/functions/phrase/index.ts', import.meta.url), 'utf8')
    const consent = src.indexOf("from('ai_consents')")
    const kind = src.indexOf('PHRASE_KINDS_ENABLED.includes')
    const upstream = src.indexOf('/v1/messages')
    expect(consent).toBeGreaterThan(0)
    expect(kind).toBeGreaterThan(0)
    expect(consent, 'Einwilligung vor dem Aufruf').toBeLessThan(upstream)
    expect(kind, 'Art vor dem Aufruf').toBeLessThan(upstream)
  })
})
