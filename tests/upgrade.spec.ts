import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { COACH_TIERS } from '../src/data/pricing'
import { accessFor, canUse } from '../src/domain/entitlement'
import { GRACE_DAYS, canMeasureAthlete, changeDirection, limitStatus, proratedUpgradeEur, smallestTierFor } from '../src/domain/upgrade'
import { parseCoachStatus, tokenFromInput, inviteLink } from '../src/lib/coachStatus'
import {
  coachRank,
  coachSeats,
  downgradePhaseFields,
  intervalOf,
  periodOf,
  previewFields,
  productOf,
  upgradeFields,
} from '../supabase/functions/_shared/stripe'

/**
 * Stufe überschritten, anteilig wechseln, Teams.
 *
 * Die Regeln vom 25.09.2026, als Prüffälle:
 *   - Nie mitten am Testtag sperren: Frist von vierzehn Tagen.
 *   - Wer schon gezählt ist, bleibt immer messbar.
 *   - Hochstufen kostet die Differenz für den Rest des Zeitraums, nicht mehr.
 *   - Herabstufen erstattet nichts und kostet nichts.
 *   - Im Team wird für das Team gezählt; die Zahlen im Server und in der App
 *     sind dieselben.
 */

const DAY = 86_400_000

test.describe('Grenze und Frist', () => {
  test('unter der Grenze: nichts zu tun, kurz davor ein leiser Hinweis', () => {
    expect(limitStatus(5, 'coach_start', null).state).toBe('ok')
    expect(limitStatus(8, 'coach_start', null).state).toBe('near')
    expect(limitStatus(10, 'coach_start', null).state).toBe('near')
    // Coach Free (3) bekommt keinen «fast voll»-Hinweis — der wäre ab dem dritten Athleten Dauerzustand.
    expect(limitStatus(3, 'coach_free', null).state).toBe('ok')
  })

  test('überschritten: vierzehn Tage messen, danach nur noch Gezählte', () => {
    const now = new Date('2026-10-01T12:00:00Z')
    const since = new Date(now.getTime() - 3 * DAY).toISOString()
    const grace = limitStatus(11, 'coach_start', since, now)
    expect(grace.state).toBe('grace')
    expect(grace.daysLeft).toBe(GRACE_DAYS - 3)
    expect(grace.nextTier?.id).toBe('coach_team')
    expect(canMeasureAthlete(false, grace)).toBe(true)

    const late = limitStatus(11, 'coach_start', new Date(now.getTime() - 15 * DAY).toISOString(), now)
    expect(late.state).toBe('blocked')
    expect(late.daysLeft).toBe(0)
    expect(canMeasureAthlete(false, late)).toBe(false)
    // Wer im Abojahr schon gemessen wurde, bleibt messbar — immer.
    expect(canMeasureAthlete(true, late)).toBe(true)
  })

  test('ohne Zeitpunkt vom Server beginnt die Frist jetzt, nie früher', () => {
    const now = new Date('2026-10-01T12:00:00Z')
    const s = limitStatus(31, 'coach_team', null, now)
    expect(s.state).toBe('grace')
    expect(s.daysLeft).toBe(GRACE_DAYS)
  })

  test('mehr als die grösste Stufe: Anfrage, keine Sperre', () => {
    const s = limitStatus(151, 'coach_club', new Date(0).toISOString())
    expect(s.state).toBe('beyond')
    expect(s.nextTier).toBeNull()
    expect(canMeasureAthlete(false, s)).toBe(true)
  })

  test('vorgeschlagen wird die kleinste passende Stufe, nie eine kleinere als die jetzige', () => {
    expect(smallestTierFor(11)?.id).toBe('coach_team')
    expect(smallestTierFor(40)?.id).toBe('coach_pro')
    expect(smallestTierFor(76)?.id).toBe('coach_club')
    expect(smallestTierFor(5, 'coach_pro')?.id).toBe('coach_pro')
    expect(limitStatus(80, 'coach_start', null).nextTier?.id).toBe('coach_club')
  })
})

test.describe('Anteilig zahlen', () => {
  const start = new Date('2026-01-01T00:00:00Z')
  const end = new Date('2027-01-01T00:00:00Z')
  const half = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2)

  test('zur Hälfte des Jahres von Pro zu Club: die halbe Differenz', () => {
    // (999 − 649) / 2 = 175 € — das Beispiel aus der Entscheidung.
    expect(proratedUpgradeEur('coach_pro', 'coach_club', 'yearly', start, end, half)).toBe(175)
  })

  test('am ersten Tag die volle Differenz, am letzten nichts', () => {
    expect(proratedUpgradeEur('coach_start', 'coach_team', 'yearly', start, end, start)).toBe(200)
    expect(proratedUpgradeEur('coach_start', 'coach_team', 'yearly', start, end, end)).toBe(0)
  })

  test('monatlich zählt der Monat', () => {
    const m0 = new Date('2026-03-01T00:00:00Z')
    const m1 = new Date('2026-03-31T00:00:00Z')
    const mid = new Date('2026-03-16T00:00:00Z')
    // (65 − 35) / 2 = 15 €
    expect(proratedUpgradeEur('coach_team', 'coach_pro', 'monthly', m0, m1, mid)).toBe(15)
  })

  test('herabstufen kostet nichts und erstattet nichts', () => {
    expect(proratedUpgradeEur('coach_club', 'coach_start', 'yearly', start, end, half)).toBe(0)
    expect(changeDirection('coach_club', 'coach_start')).toBe('down')
    expect(changeDirection('coach_start', 'coach_club')).toBe('up')
    expect(changeDirection('coach_pro', 'coach_pro')).toBe('same')
  })
})

test.describe('Stripe-Felder des Wechsels', () => {
  test('hoch: sofort anteilig, und nur mit erfolgreicher Zahlung', () => {
    const f = upgradeFields('si_1', 'price_club', 'coach_club')
    expect(f.proration_behavior).toBe('always_invoice')
    expect(f.payment_behavior).toBe('error_if_incomplete')
    expect(f['items[0][id]']).toBe('si_1')
    expect(f['metadata[product]']).toBe('coach_club')
    const p = previewFields('cus_1', 'sub_1', 'si_1', 'price_club', 1_800_000_000)
    expect(p['subscription_details[proration_behavior]']).toBe('always_invoice')
  })

  test('runter: zweite Phase ab Periodenende, ohne Anteilsrechnung', () => {
    const f = downgradePhaseFields('price_pro', 100, 200, 'price_team', 'coach_team', 'u1')
    expect(f.proration_behavior).toBe('none')
    expect(f['phases[0][end_date]']).toBe('200')
    expect(f['phases[1][items][0][price]']).toBe('price_team')
    expect(f['phases[1][metadata][product]']).toBe('coach_team')
    expect(f.end_behavior).toBe('release')
  })

  test('Club ist ein kaufbares Produkt, die Rangfolge stimmt', () => {
    expect(productOf('coach_club', 'yearly')).toEqual({ product: 'coach_club', interval: 'yearly' })
    expect(coachRank('coach_club')).toBeGreaterThan(coachRank('coach_pro'))
    expect(coachRank('athlete_pro')).toBe(-1)
    expect(intervalOf('year')).toBe('yearly')
    expect(intervalOf('week')).toBeNull()
  })

  test('der Zeitraum wird am Abo oder am Abo-Posten gefunden', () => {
    expect(periodOf({ current_period_start: 1, current_period_end: 2 })).toEqual({ start: 1, end: 2 })
    expect(periodOf({ items: { data: [{ current_period_start: 3, current_period_end: 4 }] } })).toEqual({ start: 3, end: 4 })
  })
})

test.describe('Eine Zahl, zwei Orte', () => {
  const sql = readFileSync('supabase/migrations/20260925110000_teams.sql', 'utf-8')

  test('Grenzen und Plätze im Server stimmen mit pricing.ts überein', () => {
    for (const tier of COACH_TIERS) {
      if (tier.id === 'coach_free') continue
      expect(sql, `${tier.id} Grenze`).toMatch(new RegExp(`when '${tier.id}' then ${tier.athletesPerYear}\\b`))
      if (tier.coachSeats > 1) expect(sql, `${tier.id} Plätze`).toMatch(new RegExp(`when '${tier.id}' then ${tier.coachSeats}\\b`))
      expect(coachSeats(tier.product)).toBe(tier.coachSeats)
    }
    // Coach Free: 3 Athleten, 1 Platz — die Voreinstellung der beiden Funktionen.
    expect(sql).toMatch(/else 3\s+end/)
    expect(sql).toMatch(/else 1\s+end/)
  })

  test('der Bestand gehört dem Team, gelöscht wird nur vom Inhaber', () => {
    expect(sql).toMatch(/create policy documents_update_pool[\s\S]*?with check \(public\.can_use_pool\(owner_id\)\)/)
    expect(sql).toMatch(/create policy documents_delete_own[\s\S]*?\(select auth\.uid\(\)\) = owner_id/)
    expect(sql).toMatch(/create policy series_delete_own[\s\S]*?\(select auth\.uid\(\)\) = owner_id/)
  })

  test('Teamzugriff endet, sobald die Stufe keine weiteren Trainer mehr trägt', () => {
    const canUsePool = sql.slice(sql.indexOf('function public.can_use_pool'), sql.indexOf('revoke execute on function public.can_use_pool'))
    expect(canUsePool).toMatch(/coach_seats\(public\.coach_product_of\(t\.owner_id\)\) >= 2/)
  })

  test('Zählung und Einladungscode liegen nur beim Server', () => {
    expect(sql).toMatch(/revoke execute on function public\.pool_measured_count\(uuid, timestamptz\) from public, anon, authenticated/)
    expect(sql).toMatch(/token_hash/)
    expect(sql).not.toMatch(/insert into public\.team_invites \([^)]*\btoken\b[^_]/)
  })
})

test.describe('Team in der App', () => {
  test('ein Trainer im Team hat die Stufe des Inhabers', () => {
    const member = accessFor('coach', [], false, new Date(), 'coach_team')
    expect(member.coachTier).toBe('coach_team')
    expect(canUse('whiteLabel', member)).toBe(true)
    // Eine eigene höhere Stufe gewinnt.
    const own = accessFor('coach', [{ product: 'coach_club', status: 'active', currentPeriodEnd: null }], false, new Date(), 'coach_team')
    expect(own.coachTier).toBe('coach_club')
  })

  test('die Serverauskunft wird geprüft, nicht geglaubt', () => {
    expect(parseCoachStatus(null)).toBeNull()
    expect(parseCoachStatus({})).toBeNull()
    const s = parseCoachStatus({
      pool_owner: 'o1',
      is_owner: false,
      product: 'coach_gold',
      limit: 'viele',
      measured: 12,
      team: { id: 't1', name: 'Halle Nord', role: 'coach', members: [{ user_id: 'o1', role: 'owner', name: 'A' }, { nope: 1 }], open_invites: 1 },
    })!
    expect(s.tier).toBe('coach_free')
    expect(s.limit).toBe(3)
    expect(s.measured).toBe(12)
    expect(s.team?.members).toHaveLength(1)
    expect(s.team?.role).toBe('coach')
  })

  test('der Code steht im Fragment und wird aus Link oder Code gelesen', () => {
    const token = 'a'.repeat(64)
    const link = inviteLink('https://kydon.app', token)
    expect(link).toBe(`https://kydon.app/team/beitreten#${token}`)
    expect(tokenFromInput(link)).toBe(token)
    expect(tokenFromInput(`  ${token.toUpperCase()} `)).toBe(token)
    expect(tokenFromInput('https://kydon.app/team/beitreten#kurz')).toBe('')
  })
})
