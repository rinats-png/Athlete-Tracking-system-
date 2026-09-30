import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { FUELING_RULES } from '../src/domain/fueling'
import { canUse, accessFor } from '../src/domain/entitlement'
import { smallestPlanWith } from '../src/domain/entitlement'

/**
 * Fuel gehört zu Pro (docs/fuel.md, Entscheidung 2) — über dieselbe Schranke
 * wie die Ernährung: Merkmal «nutrition». Es gibt keinen zweiten Weg hinein.
 */

const ent = (product: string) => ({ product, status: 'active', currentPeriodEnd: null }) as never

test.describe('Fuel und die Pro-Schranke', () => {
  test('nur Pro schaltet die Ernährung — und damit Fuel — frei', () => {
    expect(smallestPlanWith('nutrition', 'athlete')).toBe('pro')
    expect(canUse('nutrition', accessFor('athlete', []))).toBe(false)
    expect(canUse('nutrition', accessFor('athlete', [ent('athlete_plus')]))).toBe(false)
    expect(canUse('nutrition', accessFor('athlete', [ent('athlete_pro')]))).toBe(true)
  })

  test('die Hinweisregeln zur Verpflegung verlangen dieselbe Stufe', () => {
    for (const r of FUELING_RULES ?? []) expect(r.requires, r.id).toBe('nutrition')
  })
})

async function withPlan(page: import('@playwright/test').Page, product: string | null, path = '/fuel') {
  await openDemo(page)
  await page.evaluate((p) => {
    localStorage.setItem('kydon.billing.mode', 'on')
    localStorage.setItem('kydon.billing.v1', JSON.stringify({ entitlements: p ? [{ product: p, status: 'active', currentPeriodEnd: null }] : [], coachGrant: false, checkedAt: null }))
    const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    data.athletes[0].profile.disciplineId = 'marathon'
    localStorage.setItem('kydon.data.v1', JSON.stringify(data))
  }, product)
  await page.goto(path, { waitUntil: 'domcontentloaded' })
}

for (const plan of [null, 'athlete_plus']) {
  test(`${plan ?? 'ohne Stufe'}: Schranke statt Fuel-Karten`, async ({ page }) => {
    await withPlan(page, plan)
    await expect(page.getByTestId('gate-nutrition')).toBeVisible()
    for (const id of ['fuel-rule', 'fuel-plan', 'fuel-profile', 'fuel-supplements']) await expect(page.getByTestId(id), id).toHaveCount(0)
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-nutrition')).toBeVisible()
    await expect(page.getByTestId('fuel-need')).toHaveCount(0)
  })
}

test('Pro: alle Fuel-Karten da, keine Schranke', async ({ page }) => {
  await withPlan(page, 'athlete_pro')
  await expect(page.getByTestId('gate-nutrition')).toHaveCount(0)
  for (const id of ['fuel-rule', 'fuel-plan', 'fuel-profile', 'fuel-supplements']) await expect(page.getByTestId(id), id).toBeVisible()
})

test('Plus: das Tagebuch zeigt kein Verpflegungsformular (auch nicht «Energie in der Einheit»)', async ({ page }) => {
  await withPlan(page, 'athlete_plus')
  await page.goto('/tagebuch', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('session-fueling')).toHaveCount(0)
})
