import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import {
  bandPosition,
  CARB_BANDS,
  dailyFuelNeed,
  intraSessionBand,
  loadLevel,
  recentFueling,
  sessionFueling,
  weeklyWeightRate,
} from '../src/domain/fueling'
import { runInsights, type InsightContext } from '../src/domain/insightEngine'
import type { StoredDiaryEntry, StoredDiarySession } from '../src/lib/store/localStore'

/**
 * Ernährung, erweitert (Master-Spezifikation E): Spannen nach Quelle,
 * Verpflegung je Einheit, Gewichtsband. Nichts davon ist ein Ziel.
 */

const TODAY = '2026-09-26'
const day = (o: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + o * 86_400_000).toISOString().slice(0, 10)

function entry(offset: number, patch: Partial<StoredDiaryEntry> = {}): StoredDiaryEntry {
  const d = day(offset)
  return {
    id: `d${offset}`,
    day: d,
    weightKg: null,
    sleepHours: null,
    sleepQuality: null,
    energy: null,
    stress: null,
    soreness: null,
    steps: null,
    adherence: null,
    sessions: [],
    note: '',
    createdAt: `${d}T08:00:00.000Z`,
    updatedAt: `${d}T08:00:00.000Z`,
    ...patch,
  }
}
const session = (id: string, durationMin: number, extra: Partial<StoredDiarySession> = {}): StoredDiarySession => ({ id, kind: 'endurance', durationMin, rpe: 6, note: '', ...extra })

function ctx(diary: StoredDiaryEntry[], band: { minPctWeek: number; maxPctWeek: number } | null = null): InsightContext {
  return {
    today: TODAY,
    axes: [],
    results: [],
    assessments: [],
    profile: { sex: 'male', birthDate: '1995-01-01' },
    diary,
    workouts: [],
    decisions: [],
    observations: [],
    meals: [],
    nutrition: { pal: 1.55, weightRateBand: band },
    can: () => true,
  }
}

test.describe('Tagesbedarf nach Quelle', () => {
  test('Stufen und Spannen nach Thomas et al. (2016)', () => {
    expect(CARB_BANDS.moderate).toEqual([5, 7])
    expect(loadLevel(30)).toBe('light')
    expect(loadLevel(60)).toBe('moderate')
    expect(loadLevel(120)).toBe('high')
    expect(loadLevel(300)).toBe('very_high')
  })

  test('Spanne aus Körpermasse und Trainingsminuten der erfassten Tage', () => {
    // Drei erfasste Tage mit je 60 min — Tage ohne Eintrag zählen nicht als Ruhetag.
    const diary = [0, -1, -2].map((o) => entry(o, { sessions: [session(`s${o}`, 60)] }))
    const need = dailyFuelNeed(diary, TODAY, 70)!
    expect(need.level).toBe('moderate')
    expect(need.carbsG).toEqual([350, 490])
    expect(need.proteinG).toEqual([84, 140])
    expect(need.daysWithEntry).toBe(3)
  })

  test('ohne Gewicht oder ohne Eintrag keine Spanne', () => {
    expect(dailyFuelNeed([entry(0)], TODAY, null)).toBeNull()
    expect(dailyFuelNeed([], TODAY, 70)).toBeNull()
  })
})

test.describe('Verpflegung je Einheit', () => {
  test('Spanne nach Dauer', () => {
    expect(intraSessionBand(40)).toEqual({ kind: 'none' })
    expect(intraSessionBand(60)).toEqual({ kind: 'small' })
    expect(intraSessionBand(120)).toEqual({ kind: 'range', lo: 30, hi: 60 })
    expect(intraSessionBand(180)).toEqual({ kind: 'range', lo: 60, hi: 90 })
  })

  test('g/h, Schweissrate und Masseverlust', () => {
    const f = sessionFueling(session('a', 120, { carbsG: 40, fluidMl: 1000, massBeforeKg: 70, massAfterKg: 68.6 }), TODAY)
    expect(f.carbsPerHour).toBe(20)
    expect(f.belowBand).toBe(true)
    // (1,4 kg + 1,0 l) / 2 h = 1,2 l/h; 1,4 / 70 = 2 %.
    expect(f.sweatRateLph).toBe(1.2)
    expect(f.massLossPct).toBe(2)
  })

  test('kurze Einheit: keine Spanne, also auch kein «darunter»', () => {
    expect(sessionFueling(session('b', 50, { carbsG: 0 }), TODAY).belowBand).toBeNull()
  })

  test('Regel: erst ab zwei Einheiten unter der Spanne', () => {
    const one = [entry(-1, { sessions: [session('a', 120, { carbsG: 30 })] })]
    expect(runInsights(ctx(one), []).active.filter((i) => i.ruleId === 'fueling_below_plan')).toHaveLength(0)
    const two = [...one, entry(-3, { sessions: [session('b', 100, { carbsG: 20 })] })]
    expect(recentFueling(two, TODAY, 14)).toHaveLength(2)
    expect(runInsights(ctx(two), []).active.filter((i) => i.ruleId === 'fueling_below_plan')).toHaveLength(1)
  })

  test('Regel: wiederholte Magen-Darm-Beschwerden', () => {
    const diary = [entry(-1, { sessions: [session('a', 90, { giScore: 2 })] }), entry(-5, { sessions: [session('b', 90, { giScore: 3 })] })]
    expect(runInsights(ctx(diary), []).active.filter((i) => i.ruleId === 'gi_issue_pattern')).toHaveLength(1)
  })
})

test.describe('Gewichtsband', () => {
  // Drei Wochen: 80 kg, dann 79,2, dann 78,4 — je −1 % je Woche.
  const weights = (w: [number, number, number]) =>
    Array.from({ length: 21 }, (_, i) => entry(-20 + i, { weightKg: i < 7 ? w[0] : i < 14 ? w[1] : w[2] }))

  test('Wochenrate aus zwei 7-Tage-Mitteln', () => {
    expect(weeklyWeightRate(weights([80, 79.2, 78.4]), TODAY)).toBe(-1)
  })

  test('Position im Band', () => {
    expect(bandPosition(-1, { minPctWeek: -0.7, maxPctWeek: -0.3 })).toBe('below')
    expect(bandPosition(-0.5, { minPctWeek: -0.7, maxPctWeek: -0.3 })).toBe('within')
  })

  test('Regel: zwei Wochen in Folge auf derselben Seite, und nur mit gesetztem Band', () => {
    const diary = weights([80, 79.2, 78.4])
    const band = { minPctWeek: -0.7, maxPctWeek: -0.3 }
    expect(runInsights(ctx(diary, band), []).active.filter((i) => i.ruleId === 'weight_rate_outside_target')).toHaveLength(1)
    expect(runInsights(ctx(diary, null), []).active.filter((i) => i.ruleId === 'weight_rate_outside_target')).toHaveLength(0)
  })
})

test.describe('Im Bildschirm', () => {
  test('Einheit mit Verpflegung im Tagebuch, Auswertung in der Ernährung', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Einheit hinzufügen' }).click()
    await page.getByRole('radio', { name: 'Anstrengung (RPE 1–10): 7' }).click()
    await page.getByRole('button', { name: 'Verpflegung erfassen (freiwillig)' }).click()
    await page.getByLabel('Kohlenhydrate in der Einheit').fill('30')
    await page.getByRole('button', { name: 'Einheit eintragen' }).click()
    await expect(page.getByTestId('session-carbs')).toContainText('g KH/h')

    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('fuel-need')).toBeVisible()
    await expect(page.getByTestId('fuel-sessions').locator('li')).toHaveCount(1)
    await expect(page.getByTestId('weight-band')).toBeVisible()
  })
})
