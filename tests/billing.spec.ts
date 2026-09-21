import { expect, test } from '@playwright/test'
import { ATHLETE_PLANS, COACH_TIERS, FREE_CORE, athletePlan, coachTier, productOfPlan } from '../src/data/pricing'
import { accessFor, activeProducts, canUse, smallestPlanWith, type Entitlement } from '../src/domain/entitlement'
import { productOf, priceEnvName, signForTest, statusOf, verifyStripeSignature } from '../supabase/functions/_shared/stripe'
import { openGuest } from './helpers'

/**
 * Bezahlweg und Stufen — Etappe 4 aus docs/ausbau.md.
 *
 * Vier Dinge dürfen hier nie passieren:
 *   1. Der kostenlose Kern wird gesperrt — für niemanden, in keiner Stufe.
 *   2. Eine Schranke hält DATEN zurück statt Merkmale (§32).
 *   3. Ein Gerät schaltet sich selbst frei — der Weg geht nur über den
 *      Webhook mit geprüfter Signatur.
 *   4. Ohne Bezahlweg gibt es Schranken. Sperren ohne Kaufmöglichkeit
 *      nähmen allen etwas weg.
 */

const ent = (product: Entitlement['product'], status: Entitlement['status'] = 'active', end: string | null = null): Entitlement => ({ product, status, currentPeriodEnd: end })

test.describe('Stufen', () => {
  test('vier Athletenstufen, jede mit dem ganzen Kern, jede mit Export', () => {
    expect(ATHLETE_PLANS.map((p) => p.id)).toEqual(['free', 'plus', 'pro', 'termin'])
    for (const plan of [...ATHLETE_PLANS, ...COACH_TIERS]) {
      for (const f of FREE_CORE) expect(plan.features, `${plan.id} ohne ${f}`).toContain(f)
    }
    expect(FREE_CORE).toContain('diaryLight')
    expect(athletePlan('plus').yearlyEur).toBe(49)
    expect(athletePlan('pro').yearlyEur).toBe(99)
    // Pro enthält alles aus Plus — eine höhere Stufe nimmt nichts weg.
    for (const f of athletePlan('plus').features) expect(athletePlan('pro').features).toContain(f)
  })

  test('jede kaufbare Stufe hat ein Produkt; die kostenlose keins', () => {
    expect(productOfPlan('free')).toBeNull()
    expect(productOfPlan('plus')).toBe('athlete_plus')
    expect(productOfPlan('coach_free')).toBeNull()
    expect(productOfPlan('coach_team')).toBe('coach_team')
  })
})

test.describe('Zugriff aus Freischaltungen', () => {
  test('ohne Freischaltung: frei — und der Kern immer erlaubt', () => {
    const access = accessFor('athlete', [])
    expect(access.athletePlan).toBe('free')
    for (const f of FREE_CORE) expect(canUse(f, access)).toBe(true)
    expect(canUse('trainingLog', access)).toBe(false)
    expect(canUse('nutrition', access)).toBe(false)
    expect(canUse('export', access)).toBe(true)
  })

  test('abgelaufen, gekündigt oder in Verzug trägt nicht; Probe trägt', () => {
    const now = new Date('2026-09-21T12:00:00Z')
    expect(activeProducts([ent('athlete_plus', 'active', '2026-09-20T00:00:00Z')], now).size).toBe(0)
    expect(activeProducts([ent('athlete_plus', 'canceled')], now).size).toBe(0)
    expect(activeProducts([ent('athlete_plus', 'past_due')], now).size).toBe(0)
    expect(activeProducts([ent('athlete_plus', 'trialing', '2026-10-01T00:00:00Z')], now).has('athlete_plus')).toBe(true)
    expect(activeProducts([ent('athlete_termin')], now).has('athlete_termin')).toBe(true)
  })

  test('die höchste Stufe zählt; Termin bringt Zielwerte, aber keine Ernährung', () => {
    expect(accessFor('athlete', [ent('athlete_plus'), ent('athlete_pro')]).athletePlan).toBe('pro')
    const termin = accessFor('athlete', [ent('athlete_termin')])
    expect(canUse('targetStandards', termin)).toBe(true)
    expect(canUse('trainingLog', termin)).toBe(true)
    expect(canUse('nutrition', termin)).toBe(false)
    expect(canUse('nutrition', accessFor('athlete', [ent('athlete_pro')]))).toBe(true)
  })

  test('der Trainer-Zuschuss gibt Plus, nicht Pro', () => {
    const a = accessFor('athlete', [], true)
    expect(a.athletePlan).toBe('plus')
    expect(canUse('trainingLog', a)).toBe(true)
    expect(canUse('nutrition', a)).toBe(false)
  })

  test('ein zahlender Trainer hat die volle Tiefe, ein freier den Trainerkern', () => {
    const free = accessFor('coach', [])
    expect(free.coachTier).toBe('coach_free')
    expect(canUse('groupTest', free)).toBe(true)
    expect(canUse('coachProof', free)).toBe(true)
    expect(canUse('heatmap', free)).toBe(false)
    expect(canUse('nutrition', free)).toBe(false)
    const start = accessFor('coach', [ent('coach_start')])
    expect(canUse('heatmap', start)).toBe(true)
    expect(canUse('nutrition', start)).toBe(true)
    expect(canUse('whiteLabel', start)).toBe(false)
    expect(canUse('whiteLabel', accessFor('coach', [ent('coach_team')]))).toBe(true)
  })

  test('die Schranke nennt die kleinste Stufe, die das Merkmal enthält', () => {
    expect(smallestPlanWith('trainingLog', 'athlete')).toBe('plus')
    expect(smallestPlanWith('nutrition', 'athlete')).toBe('pro')
    expect(smallestPlanWith('targetStandards', 'athlete')).toBe('termin')
    expect(smallestPlanWith('heatmap', 'coach')).toBe('coach_start')
    expect(smallestPlanWith('multiCoach', 'coach')).toBe('coach_team')
    expect(smallestPlanWith('export', 'athlete')).toBe('free')
    expect(coachTier('coach_start').yearlyEur).toBe(149)
  })
})

test.describe('Stripe-Hilfen ohne Netz', () => {
  test('Plan und Zahlweise werden nur in bekannte Produkte übersetzt', () => {
    expect(productOf('plus', 'yearly')).toEqual({ product: 'athlete_plus', interval: 'yearly' })
    expect(productOf('termin', 'once')).toEqual({ product: 'athlete_termin', interval: 'once' })
    expect(productOf('termin', 'yearly')).toBeNull()
    expect(productOf('free', 'yearly')).toBeNull()
    expect(productOf('plus', 'once')).toBeNull()
    expect(productOf({ toString: () => 'plus' }, 'yearly')).toBeNull()
    expect(priceEnvName('coach_team', 'monthly')).toBe('STRIPE_PRICE_COACH_TEAM_MONTHLY')
    expect(statusOf('unpaid')).toBe('expired')
    expect(statusOf('trialing')).toBe('trialing')
  })

  test('die Signatur wird geprüft: richtig, falsch, alt', async () => {
    const body = '{"type":"checkout.session.completed"}'
    const secret = 'whsec_test'
    const now = Date.now()
    const t = Math.floor(now / 1000)
    const good = await signForTest(body, secret, t)
    expect(await verifyStripeSignature(body, good, secret, now)).toBe(true)
    expect(await verifyStripeSignature(body + ' ', good, secret, now)).toBe(false)
    expect(await verifyStripeSignature(body, good, 'whsec_other', now)).toBe(false)
    expect(await verifyStripeSignature(body, null, secret, now)).toBe(false)
    const old = await signForTest(body, secret, t - 600)
    expect(await verifyStripeSignature(body, old, secret, now)).toBe(false)
  })
})

test.describe('Im Bildschirm', () => {
  test('ohne Bezahlweg gibt es keine Schranke', async ({ page }) => {
    await openGuest(page)
    await page.goto('/training', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-trainingLog')).toHaveCount(0)
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-nutrition')).toHaveCount(0)
  })

  test('mit Bezahlweg und ohne Stufe: die Schranke nennt die Stufe und führt zu den Preisen', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => localStorage.setItem('kydon.billing.mode', 'on'))
    await page.goto('/training', { waitUntil: 'domcontentloaded' })
    const gate = page.getByTestId('gate-trainingLog')
    await expect(gate).toContainText('Kydon Plus')
    await expect(gate).toContainText('49')
    await expect(gate).not.toContainText('gesperrt')
    await gate.getByRole('link', { name: 'Freischalten' }).click()
    await expect(page).toHaveURL(/\/preise\?plan=plus/)
    // Die Preisseite zeigt Kaufknöpfe — und sagt, dass man dafür angemeldet sein muss.
    await expect(page.getByRole('button', { name: /Plus.*wählen|wählen/ }).first()).toBeVisible()
  })

  test('mit gespeicherter Freischaltung steht die Schranke nicht; der Export bleibt immer', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      localStorage.setItem('kydon.billing.mode', 'on')
      localStorage.setItem('kydon.billing.v1', JSON.stringify({ entitlements: [{ product: 'athlete_plus', status: 'active', currentPeriodEnd: null }], coachGrant: false, checkedAt: null }))
    })
    await page.goto('/training', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-trainingLog')).toHaveCount(0)
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-nutrition')).toBeVisible()
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /Export/ }).first()).toBeVisible()
  })

  test('das Tagebuch light bleibt frei; die Zusatzfelder gehören zu Plus', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => localStorage.setItem('kydon.billing.mode', 'on'))
    await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-diaryLight')).toHaveCount(0)
    await expect(page.getByLabel('Gewicht', { exact: false }).first()).toBeVisible()
    await expect(page.getByTestId('gate-diaryFull')).toBeVisible()
  })
})
