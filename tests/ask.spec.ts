import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { answer, askableTests, QUESTIONS } from '../src/domain/askKydon'
import { allowedNumbers, numbersIn, passesGuard, unknownNumbers } from '../src/domain/answerGuard'
import { coachCopilot } from '../src/domain/coachCopilot'
import { emptyData } from '../src/lib/store/schema'
import type { StoredResult } from '../src/lib/store/localStore'
import type { CoachToday } from '../src/domain/coachToday'

/** Etappe 5: Fragen an KYDON (deterministisch), Zahlenwächter, Coach Copilot. */

const asOf = new Date('2026-10-07T12:00:00.000Z')
const result = (slug: string, day: string, score: number): StoredResult =>
  ({
    id: `${slug}-${day}`,
    testSlug: slug,
    performedAt: `${day}T09:00:00.000Z`,
    values: {},
    metrics: {},
    score,
    bodyWeightKg: 80,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    protocol: { version: null, method: null, tester: '', deviation: '', abortReason: '', invalidAttempts: [] },
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    photo: null,
    createdAt: `${day}T09:00:00.000Z`,
  }) as StoredResult

const base = () => {
  const a = emptyData().athletes[0]
  return { profile: a.profile, workouts: [] as never[] }
}
const off = { remindersEnabled: false, reminderIntervalDays: {} }

test.describe('Fragen an KYDON: Fachlogik', () => {
  test('sieben feste Fragen, zwei davon brauchen einen Test', () => {
    expect(QUESTIONS.map((q) => q.key)).toEqual(['development', 'changed', 'overdue', 'whyUnchanged', 'missing', 'methods', 'confidence'])
    expect(QUESTIONS.filter((q) => q.needsTest).map((q) => q.key)).toEqual(['development', 'whyUnchanged'])
  })

  test('ohne Messung: leere Antworten sagen, was fehlt, und erfinden nichts', () => {
    const input = { athlete: { ...base(), results: [] }, reminders: off }
    expect(answer('development', { ...input, testSlug: 'grip_strength' }, asOf).facts.map((f) => f.key)).toEqual(['noMeasurements'])
    expect(answer('changed', input, asOf).facts.map((f) => f.key)).toEqual(['noneProven'])
    expect(answer('overdue', input, asOf).facts.map((f) => f.key)).toEqual(['remindersOff'])
    expect(answer('methods', input, asOf).facts.map((f) => f.key)).toEqual(['noRepeats'])
    expect(answer('confidence', input, asOf).facts[0]).toEqual({ key: 'level', params: { level: 'INSUFFICIENT', score: 0 } })
    expect(answer('whyUnchanged', { ...input, testSlug: 'grip_strength' }, asOf).empty).toBe(true)
  })

  test('Entwicklung: Anzahl, erste und letzte Messung stammen aus den Daten', () => {
    const results = [result('grip_strength', '2026-09-01', 50), result('grip_strength', '2026-10-01', 55)]
    expect(askableTests(results)).toEqual(['grip_strength'])
    const a = answer('development', { athlete: { ...base(), results }, reminders: off, testSlug: 'grip_strength' }, asOf)
    expect(a.facts[0]).toMatchObject({ key: 'count', params: { n: 2 } })
    expect(a.facts[1]).toMatchObject({ key: 'firstLast', params: { first: 50, last: 55, firstDay: '2026-09-01', lastDay: '2026-10-01' } })
    expect(a.link).toBe('/verlauf/test/grip_strength')
    const single = answer('development', { athlete: { ...base(), results: results.slice(0, 1) }, reminders: off, testSlug: 'grip_strength' }, asOf)
    expect(single.facts[1]).toMatchObject({ key: 'single', params: { value: 50, day: '2026-09-01' } })
  })

  test('Methoden: unterschiedliche Messbedingungen werden benannt', () => {
    const a = result('grip_strength', '2026-09-01', 50)
    const b = { ...result('grip_strength', '2026-10-01', 55), context: { ...a.context, surface: 'Halle' } }
    const c = { ...a, context: { ...a.context, surface: 'Rasen' } }
    const out = answer('methods', { athlete: { ...base(), results: [c, b] }, reminders: off }, asOf)
    expect(out.facts).toEqual([{ key: 'methodsDiffer', params: { slug: 'grip_strength', n: 2 } }])
  })
})

test.describe('Zahlenwächter', () => {
  test('liest Dezimalkomma und -punkt', () => {
    expect(numbersIn('5,5 % und 3.2 sowie 12')).toEqual([5.5, 3.2, 12])
  })
  test('erlaubt nur Zahlen aus den Fakten, gerundet auf null und eine Stelle', () => {
    const facts = [{ key: 'x', params: { percent: 4.26, n: 3, day: '2026-10-01' } }]
    expect(allowedNumbers(facts)).toContain(4.3)
    expect(passesGuard('Änderung um 4,3 % bei 3 Messungen am 2026-10-01', facts)).toBe(true)
    expect(passesGuard('Änderung um 4 %', facts)).toBe(true)
    expect(unknownNumbers('Änderung um 9 % bei 3 Messungen', facts)).toEqual([9])
    expect(passesGuard('keine Zahlen', facts)).toBe(true)
  })
})

test.describe('Coach Copilot', () => {
  const today = {
    week: { from: '2026-10-05', to: '2026-10-11' },
    status: { current: 2, review: 1, overdue: 1, total: 4 },
    priority: [
      { id: 'a1', name: 'Mia', reason: 'overdue', daysOverdue: 12 },
      { id: 'a2', name: '', reason: 'no_assessment', daysOverdue: null },
    ],
    matrix: null,
    pattern: null,
    testDay: null,
  } as CoachToday
  test('Zusammenfassung zählt, Entwürfe gibt es je markiertem Athleten', () => {
    const c = coachCopilot(today)
    expect(c.summary).toEqual([
      { key: 'status', params: { current: 2, review: 1, overdue: 1, total: 4 } },
      { key: 'priority', params: { count: 2 } },
    ])
    expect(c.drafts.map((d) => [d.athleteId, d.template, d.params.days])).toEqual([
      ['a1', 'overdue', 12],
      ['a2', 'no_assessment', 0],
    ])
  })
})

test.describe('Fragen an KYDON: Bildschirm', () => {
  test('Fragen wählen, Antwort erscheint, kein rohes Schlüsselwort', async ({ page }) => {
    await openDemo(page)
    await page.goto('/fragen')
    await expect(page.getByTestId('ask-screen')).toBeVisible()
    for (const q of QUESTIONS) {
      await page.getByTestId(`ask-q-${q.key}`).click()
      const answerBox = page.getByTestId('ask-answer')
      await expect(answerBox).toBeVisible()
      const text = await answerBox.innerText()
      expect(text).not.toMatch(/ask\.(fact|q|comp)\./)
      expect(text).not.toMatch(/\{\{/)
    }
  })

  test('Entwicklung nimmt den gewählten Test', async ({ page }) => {
    await openDemo(page)
    await page.goto('/fragen')
    await page.getByTestId('ask-q-development').click()
    await expect(page.getByTestId('ask-test')).toBeVisible()
    await expect(page.getByTestId('ask-answer')).toContainText(/\d/)
  })

  test('Mehr verweist auf die Fragen', async ({ page }) => {
    await openDemo(page)
    await page.goto('/mehr')
    await page.getByRole('link', { name: 'Fragen an KYDON' }).click()
    await expect(page).toHaveURL(/\/fragen$/)
  })
})
