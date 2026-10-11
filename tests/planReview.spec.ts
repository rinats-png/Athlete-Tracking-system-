import { expect, test, type Page } from '@playwright/test'
import { blockReviewState, sessionReviewState } from '../src/domain/planReview'
import type { EvidenceRule } from '../src/domain/trainingTypes'
import type { StoredTrainingBlock } from '../src/lib/store/localStore'
import { openDemo } from './helpers'

/**
 * Kennzeichnung ungeprüfter Regeln (Umbauplan Sprint 0, Punkt 3; Regel 11).
 *
 * Die Bibliothek trug den Hinweis schon. Wer einen Plan aber nur über Heute,
 * Player oder Kalender benutzt, sah ihn nie. Diese Fälle halten fest: wo ein
 * Plan benutzt wird, steht «fachlich noch nicht geprüft», solange auch nur
 * eine Einheit aus einer ungeprüften Regel stammt — und bei rein eigenen
 * Einheiten steht nichts, weil dahinter keine Regel von KYDON steht.
 */

const session = (id: string, kind: 'rule' | 'open' | 'own' | 'library', day: number, ruleId: string | null = null) => ({ id, day, weekFrom: 1, weekTo: null, kind, title: kind === 'own' ? 'Eigene Einheit' : '', note: '', ruleId, ruleVersion: null, primaryIntent: 'AEROBIC_BASE', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: 30, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false })
const block = (sessions: unknown[], over: Record<string, unknown> = {}) =>
  ({ id: 'b', name: '', family: 'hybrid', disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, sessions, completions: [], libraryPlanId: null, libraryVersion: null, planVersion: 1, adjustments: [], moves: [], status: 'active', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...over }) as unknown as StoredTrainingBlock

const rule = (id: string, state: 'reviewed' | 'unreviewed') => ({ id, review: state === 'reviewed' ? { state, reviewer: 'Prüferin', reviewedOn: '2026-10-01' } : { state } }) as unknown as EvidenceRule

test.describe('Prüfstand', () => {
  const rules = [rule('R_OK', 'reviewed'), rule('R_NEU', 'unreviewed')]

  test('eine ungeprüfte Einheit macht den ganzen Block ungeprüft', () => {
    expect(blockReviewState(block([session('a', 'rule', 1, 'R_OK')]), rules)).toBe('reviewed')
    expect(blockReviewState(block([session('a', 'rule', 1, 'R_OK'), session('b', 'rule', 3, 'R_NEU')]), rules)).toBe('unreviewed')
    expect(blockReviewState(block([session('a', 'open', 1)]), rules), 'Vorlage ohne belegte Dosis').toBe('unreviewed')
    expect(blockReviewState(block([session('a', 'rule', 1, 'UNBEKANNT')]), rules), 'unbekannte Regel').toBe('unreviewed')
  })

  test('nur eigene Einheiten: nichts zu prüfen', () => {
    expect(blockReviewState(block([session('a', 'own', 1)]), rules)).toBe('own')
    expect(blockReviewState(block([session('a', 'own', 1), session('b', 'rule', 2, 'R_OK')]), rules)).toBe('reviewed')
  })

  test('ein Bibliotheksplan gilt ohne ausdrückliche Auskunft als ungeprüft', () => {
    const lib = block([session('a', 'library', 1)], { libraryPlanId: 'PLN_X' })
    expect(blockReviewState(lib, rules)).toBe('unreviewed')
    expect(blockReviewState(lib, rules, (id) => id === 'PLN_X')).toBe('reviewed')
    expect(sessionReviewState({ kind: 'library', ruleId: null }, rules, null, () => true), 'ohne Plan-ID keine Freigabe').toBe('unreviewed')
  })
})

test.describe('Sichtbar, wo der Plan benutzt wird', () => {
  const weekday = () => ((new Date().getUTCDay() + 6) % 7) + 1
  const monday = () => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - (weekday() - 1))
    return d.toISOString().slice(0, 10)
  }
  const seed = async (page: Page, sessions: unknown[]) => {
    await openDemo(page)
    const b = block(sessions, { startDay: monday() })
    await page.evaluate((list) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = list
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, [b])
  }

  test('ungeprüfter Block: Heute, Hub, Kalender, Startauswahl und Player zeigen es', async ({ page }) => {
    await seed(page, [session('heute', 'open', weekday())])
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('today-unreviewed')).toContainText('Fachlich noch nicht geprüft')
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('hub-unreviewed')).toBeVisible()
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('cal-unreviewed')).toBeVisible()
    await page.goto('/plan/start', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('start-unreviewed')).toBeVisible()
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('player-unreviewed')).toBeVisible()
  })

  test('nur eigene Einheiten: kein Hinweis', async ({ page }) => {
    await seed(page, [session('heute', 'own', weekday())])
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('hub-block')).toBeVisible()
    await expect(page.getByTestId('hub-unreviewed')).toHaveCount(0)
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('session-player')).toBeVisible()
    await expect(page.getByTestId('player-unreviewed')).toHaveCount(0)
  })
})
