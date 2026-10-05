import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openDemo } from './helpers'
import { assignedSessionId, exportPlan, importPlan } from '../src/domain/planFile'
import { createOwnBlock, addOwnSession } from '../src/domain/trainingBlock'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/** Trainingsbereich Etappe 10: Pläne vom Trainer zuweisen. */

const SQL = readFileSync('supabase/migrations/20261005100000_plan_assignments.sql', 'utf8')
const AID = '11111111-2222-4333-8444-555555555555'
const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'pruef@baseline.test' }

test.describe('Zuweisung: Migration (statische Prüfung)', () => {
  test('RLS an, keine Schreibrichtlinie auf den Tabellen, Freigaben standardmäßig aus', () => {
    expect(SQL).toMatch(/alter table public\.plan_assignments enable row level security/)
    expect(SQL).toMatch(/alter table public\.plan_assignment_results enable row level security/)
    expect(SQL).not.toMatch(/for (insert|update|delete|all)\b/i)
    for (const col of ['share_done', 'share_results', 'share_hr']) expect(SQL).toMatch(new RegExp(`${col}\\s+boolean not null default false`))
  })
  test('jede Funktion ist security definer mit festem search_path und nur für Angemeldete freigegeben', () => {
    const fns = [...SQL.matchAll(/create or replace function public\.(\w+)\(/g)].map((m) => m[1])
    expect(fns).toEqual(expect.arrayContaining(['offer_plan_assignment', 'withdraw_plan_assignment', 'respond_plan_assignment', 'set_plan_assignment_share', 'report_plan_completion', 'coach_plan_progress', 'plan_assignments_purge', 'delete_account_data']))
    for (const f of fns) {
      const body = SQL.slice(SQL.indexOf(`function public.${f}(`))
      const head = body.slice(0, 600)
      expect(head, f).toMatch(/security definer/)
      expect(head, f).toMatch(/set search_path/)
      expect(SQL, f).toMatch(new RegExp(`revoke all on function public\\.${f}\\(`))
    }
    expect(SQL).toMatch(/grant execute on function public\.coach_plan_progress\(uuid\) to authenticated/)
    expect(SQL).not.toMatch(/grant execute[^;]*to (anon|public)/i)
  })
  test('Trainer liest den Fortschritt nur bei aktiver Verknüpfung und maskiert nach aktuellem Stand der Freigaben; Kontolöschung nimmt die Zuweisungen mit', () => {
    const fn = SQL.slice(SQL.indexOf('function public.coach_plan_progress'), SQL.indexOf('-- --- Aufbewahrung'))
    expect(fn).toMatch(/l\.status = 'active'/)
    expect(fn).toMatch(/case when p\.share_results then r\.rpe end/)
    expect(fn).toMatch(/case when p\.share_hr then r\.avg_hr end/)
    expect(SQL).toMatch(/delete from public\.plan_assignments where coach_id = p_user_id/)
    expect(SQL).toMatch(/'plan_assignments', v_plans/)
  })
})

test.describe('Zuweisung: Fachlogik', () => {
  test('zugewiesene Einheiten haben feste Kennungen, der Block merkt die Zuweisung, Evidenz kommt aus dem Register', () => {
    let b = createOwnBlock({ id: 'b', name: 'Plan', family: null, disciplineId: null, phase: 'BUILD', weeks: 4, startDay: '2026-10-05', now: '2026-10-05T00:00:00.000Z' })
    const a = addOwnSession(b, { id: 'a', day: 1, intent: 'MAX_STRENGTH', title: 'x', note: '', minutes: null, weekFrom: 1, weekTo: null, highIntensity: false }, '')
    if (!a.ok) throw new Error('x')
    b = a.block
    const r = importPlan(exportPlan(b), { newId: () => 'zufall', now: '2026-10-05T00:00:00.000Z', startDay: '2026-10-05', disciplineId: null, family: null, trainingAgeYears: null, mode: 'preview', assignmentId: AID })
    if (!r.ok) throw new Error('x')
    expect(r.block.assignmentId).toBe(AID)
    expect(r.block.sessions[0].id).toBe(assignedSessionId(AID, 0))
    expect(assignedSessionId(AID, 3)).toBe('11111111-3')
  })
  test('Schema 38: ältere Blöcke bekommen assignmentId leer', () => {
    const old = emptyData() as any
    old.version = 37
    old.athletes[0].trainingBlocks = [{ id: 'b', name: '', family: null, disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 2, retestMetrics: [], templateId: null, eventDay: null, sessions: [], completions: [], status: 'active', createdAt: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-05T00:00:00.000Z' }]
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(37)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(38)
    expect(data!.athletes[0].trainingBlocks[0].assignmentId).toBeNull()
  })
})

const PAYLOAD = { format: 'kydon-plan', version: 1, name: 'Vom Trainer', weeks: 4, phase: 'BUILD', sessions: [{ day: 2, intent: 'MAX_STRENGTH', title: 'Beine', note: '', minutes: 60, ruleId: null, exercises: [] }] }

/** Angemeldeter Zustand mit abgefangenem Server: Anfragen werden aufgezeichnet. */
async function signedIn(page: Page, handlers: { offers?: unknown[]; links?: unknown[]; coachRows?: unknown[]; progress?: unknown[] }) {
  const calls: { url: string; body: string | null }[] = []
  await page.addInitScript((u) => {
    localStorage.setItem('sb-bsbionvnsvqghaqijmpl-auth-token', JSON.stringify({ access_token: 'stub', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'stub', user: u }))
  }, USER)
  await page.route('**/*.supabase.co/**', async (route) => {
    const url = route.request().url()
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    calls.push({ url, body: route.request().postData() })
    if (url.includes('/auth/v1/user')) return json(USER)
    if (url.includes('/rpc/respond_plan_assignment') || url.includes('/rpc/set_plan_assignment_share') || url.includes('/rpc/report_plan_completion') || url.includes('/rpc/withdraw_plan_assignment')) return json(true)
    if (url.includes('/rpc/offer_plan_assignment')) return json(AID)
    if (url.includes('/rpc/coach_plan_progress')) return json(handlers.progress ?? [])
    if (url.includes('/rest/v1/coach_athlete_links')) return json(handlers.links ?? [])
    if (url.includes('/rest/v1/plan_assignments')) return json(url.includes('status=in.') ? handlers.offers ?? [] : handlers.coachRows ?? [])
    return json([])
  })
  return calls
}

const offerRow = (over = {}) => ({ id: AID, athlete_id: 'ath-1', name: 'Vom Trainer', status: 'offered', share_done: false, share_results: false, share_hr: false, created_at: '2026-10-05T08:00:00Z', payload: PAYLOAD, ...over })

test.describe('Zuweisung: Athlet', () => {
  const noBlock = (page: Page) =>
    page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = []
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })

  test('Angebot: alle Freigaben aus, Puls und Dauer nur mit «erledigt»; Annehmen legt den Block mit Zuweisung an und meldet die Wahl', async ({ page }) => {
    const calls = await signedIn(page, { offers: [offerRow()] })
    await openDemo(page)
    await noBlock(page)
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId(`offer-${AID}`)).toContainText('Vom Trainer')
    await page.getByTestId(`offer-open-${AID}`).click()
    for (const k of ['done', 'results', 'hr']) await expect(page.getByTestId(`offer-share-${k}`)).not.toBeChecked()
    await expect(page.getByTestId('offer-share-results')).toBeDisabled()
    await expect(page.getByTestId('offer-share-hr')).toBeDisabled()
    await page.getByTestId('offer-share-done').check()
    await expect(page.getByTestId('offer-share-results')).toBeEnabled()
    await page.getByTestId('offer-share-results').check()
    await page.getByTestId(`offer-accept-${AID}`).click()
    await expect(page.getByTestId(`offer-${AID}`)).toHaveCount(0)
    const rpc = calls.find((c) => c.url.includes('/rpc/respond_plan_assignment'))!
    expect(JSON.parse(rpc.body!)).toMatchObject({ p_id: AID, p_accept: true, p_share_done: true, p_share_results: true, p_share_hr: false })
    const block = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].trainingBlocks[0])
    expect(block).toMatchObject({ assignmentId: AID, name: 'Vom Trainer' })
    expect(block.sessions[0]).toMatchObject({ id: '11111111-0', kind: 'own', title: 'Beine' })
  })

  test('Ablehnen schickt alles aus; mit aktivem Block ist Annehmen gesperrt; unlesbarer Plan wird nicht angenommen', async ({ page }) => {
    const calls = await signedIn(page, { offers: [offerRow(), offerRow({ id: '22222222-2222-4333-8444-555555555555', payload: { kaputt: true } })] })
    await openDemo(page)
    await noBlock(page)
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('offer-open-22222222-2222-4333-8444-555555555555').click()
    await page.getByTestId('offer-accept-22222222-2222-4333-8444-555555555555').click()
    await expect(page.getByTestId('offers-message')).toContainText('nicht lesen')
    expect(calls.some((c) => c.url.includes('/rpc/respond_plan_assignment'))).toBe(false)
    await page.getByTestId(`offer-open-${AID}`).click()
    await page.getByTestId(`offer-decline-${AID}`).click()
    const rpc = calls.find((c) => c.url.includes('/rpc/respond_plan_assignment'))!
    expect(JSON.parse(rpc.body!)).toMatchObject({ p_accept: false, p_share_done: false, p_share_results: false, p_share_hr: false })
  })

  test('mit aktivem Block ist Annehmen gesperrt', async ({ page }) => {
    await signedIn(page, { offers: [offerRow()] })
    await openDemo(page)
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      d.athletes[0].trainingBlocks = [{ id: 'x', name: '', family: null, disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, sessions: [], completions: [], status: 'active', createdAt: now, updatedAt: now }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await page.getByTestId(`offer-open-${AID}`).click()
    await expect(page.getByTestId('offer-blocked')).toBeVisible()
    await expect(page.getByTestId(`offer-accept-${AID}`)).toBeDisabled()
  })

  test('zugewiesener Block: Freigaben im Block änderbar, Ausschalten von «erledigt» schaltet die anderen mit aus', async ({ page }) => {
    const calls = await signedIn(page, { offers: [offerRow({ status: 'accepted', share_done: true, share_results: true, share_hr: true })] })
    await openDemo(page)
    await page.evaluate((id) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      d.athletes[0].trainingBlocks = [{ id: 'x', name: 'Vom Trainer', family: null, disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: id, eventDay: null, sessions: [], completions: [], status: 'active', createdAt: now, updatedAt: now }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, AID)
    await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('share-hr')).toBeChecked()
    await page.getByTestId('share-done').uncheck()
    await expect(page.getByTestId('share-results')).not.toBeChecked()
    await expect(page.getByTestId('share-hr')).not.toBeChecked()
    const rpc = calls.filter((c) => c.url.includes('/rpc/set_plan_assignment_share')).pop()!
    expect(JSON.parse(rpc.body!)).toEqual({ p_id: AID, p_done: false, p_results: false, p_hr: false })
  })
})

test.describe('Zuweisung: Trainer', () => {
  test('Plan an verbundenen Athleten mit Konto senden; die Nutzlast ist die Struktur, ohne Evidenz', async ({ page }) => {
    const calls = await signedIn(page, { links: [{ athlete_id: 'ath-1', athletes: { first_name: 'Liam', last_name: 'K', user_id: 'u1' } }, { athlete_id: 'ath-2', athletes: { first_name: 'Ohne', last_name: 'Konto', user_id: null } }] })
    await openDemo(page)
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      d.athletes[0].trainingBlocks = [{ id: 'x', name: 'Mein Plan', family: null, disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, completions: [], status: 'active', createdAt: now, updatedAt: now,
        sessions: [{ id: 's', day: 1, weekFrom: 1, weekTo: null, kind: 'own', title: 'Beine', note: '', ruleId: null, ruleVersion: null, primaryIntent: 'MAX_STRENGTH', evidenceStrength: 'HIGH', evidenceSpecificity: null, plannedDurationMin: 60, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false }] }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })
    await page.goto('/plan/zuweisen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('assign-athlete-ath-1')).toBeVisible()
    await expect(page.getByTestId('assign-athlete-ath-2')).toHaveCount(0)
    await expect(page.getByTestId('assign-send')).toBeDisabled()
    await page.getByTestId('assign-athlete-ath-1').click()
    await page.getByTestId('assign-send').click()
    await expect(page.getByTestId('assign-sent')).toBeVisible()
    const rpc = calls.find((c) => c.url.includes('/rpc/offer_plan_assignment'))!
    const body = JSON.parse(rpc.body!)
    expect(body).toMatchObject({ p_athlete_id: 'ath-1', p_name: 'Mein Plan' })
    expect(body.p_payload).toMatchObject({ format: 'kydon-plan', version: 1 })
    expect(JSON.stringify(body.p_payload)).not.toContain('evidenceStrength')
  })

  test('Zuweisungen mit Status und offenen Freigaben; Fortschritt nur, wenn «erledigt» freigegeben ist', async ({ page }) => {
    await signedIn(page, {
      links: [{ athlete_id: 'ath-1', athletes: { first_name: 'Liam', last_name: 'K', user_id: 'u1' } }],
      coachRows: [offerRow({ status: 'accepted', share_done: true, share_results: true, share_hr: false, payload: undefined }), offerRow({ id: '33333333-2222-4333-8444-555555555555', status: 'accepted', payload: undefined })],
      progress: [{ session_key: '11111111-0', day: '2026-10-06', duration_min: 55, rpe: 7, avg_hr: null, max_hr: null }],
    })
    await openDemo(page)
    await page.goto('/plan/zuweisen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId(`assignment-shares-${AID}`)).toContainText('Puls nein')
    await expect(page.getByTestId('assignment-progress-33333333-2222-4333-8444-555555555555')).toHaveCount(0)
    await page.getByTestId(`assignment-progress-${AID}`).click()
    await expect(page.getByTestId(`progress-${AID}`)).toContainText('RPE 7')
    await expect(page.getByTestId(`progress-${AID}`)).not.toContainText('Ø')
  })
})
