import { mkdirSync, readFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import type { LibraryExercise, PlanWeek, ProgramIndex } from '../src/domain/libraryTypes'
import { openDemo } from '../tests/helpers'

/**
 * App-Bilder für die Landingpage (keine Prüfung): Telefonausschnitt, hell
 * und dunkel, Deutsch und Englisch. Für Startkarte, Plan und Player bekommt
 * der Demo-Athlet einen laufenden Block (Kraftbasis, eine Einheit heute);
 * für die Karte «Veränderung» eine ruhige Messreihe im Countermovement Jump.
 *
 * Aufruf: LANDING_SHOTS=<ordner> npx playwright test -c playwright.mockups.config.ts mockups/landing-shots.spec.ts --project=phone
 * Danach: python3 landing/scripts/shots.py <ordner> landing/public/app
 */
const OUT = process.env.LANDING_SHOTS ?? 'mockups/out/landing'
const LOCALES = ['de', 'en'] as const

const dir = new URL('../src/data/library/', import.meta.url)
const exercises = JSON.parse(readFileSync(new URL('exerciseRegistry.json', dir), 'utf8')) as LibraryExercise[]
const index = JSON.parse(readFileSync(new URL('programIndex.json', dir), 'utf8')) as ProgramIndex
const weeksOf = (id: string) => JSON.parse(readFileSync(new URL(`plans/${id}.json`, dir), 'utf8')) as PlanWeek[]
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const mondayOfToday = () => addDays(today(), -((new Date().getUTCDay() + 6) % 7))

async function seed(page: Page) {
  const { materializePlan } = await import('../src/domain/library')
  const { moveOccurrence, occurrences } = await import('../src/domain/trainingBlock')
  const p = index.plans.find((x) => x.plan_id === 'PLN_STR_BASE_8W')!
  // Woche 2 läuft: ein Teil der Vorwoche ist erledigt, heute steht eine Einheit an.
  let block = materializePlan(p, weeksOf(p.plan_id), index, exercises, { id: 'b-landing', startDay: addDays(mondayOfToday(), -7), now: new Date().toISOString(), disciplineId: null })
  const o = occurrences(block).find((x) => x.week === 2 && x.date >= today() && x.session.blocks[0]?.type === 'library_exercise')
  if (o && o.date !== today()) {
    const r = moveOccurrence(block, o.session.id, o.planned, today(), today(), new Date().toISOString())
    if (r.ok) block = r.block
  }
  const done = occurrences(block).filter((x) => x.week === 1).slice(0, 2)
  block = { ...block, completions: done.map((x) => ({ sessionId: x.session.id, day: x.date, durationMin: 55, rpe: 7, diarySessionId: null, avgHr: null, maxHr: null, feedback: 3, pain: false, planDay: null, sets: [], swaps: [] })) }
  await page.evaluate((b) => {
    const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    const a = d.athletes[0]
    a.trainingBlocks = [b]
    // Ruhige Reihe im Countermovement Jump: die Karte «Veränderung» zeigt «belegt».
    const template = a.results.find((r: { testSlug: string }) => r.testSlug === 'countermovement_jump')
    const day = 86_400_000
    const vals = [41.0, 41.2, 40.9, 41.1, 41.0, 41.0, 42.3]
    const own = vals.map((v, i) => ({ ...template, id: `land-${i}`, performedAt: new Date(Date.now() - day - (vals.length - 1 - i) * 14 * day).toISOString(), values: { jumpHeightCm: v }, metrics: {}, score: v, attempts: [], attemptSelection: null, assessmentId: null }))
    a.results = [...a.results.filter((r: { testSlug: string }) => r.testSlug !== 'countermovement_jump'), ...own]
    localStorage.setItem('kydon.data.v1', JSON.stringify(d))
  }, block)
}

async function go(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(2500)
}

async function role(page: Page, name: RegExp) {
  await go(page, '/profil')
  await page.getByRole('radio', { name }).click()
}

test('landing shots', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone')
  test.setTimeout(600_000)
  await openDemo(page)
  await seed(page)
  for (const locale of LOCALES) {
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate(([t, l]) => {
        localStorage.setItem('kydon.theme', t)
        localStorage.setItem('kydon.locale', l)
      }, [theme, locale])
      const out = `${OUT}/${locale}/${theme}`
      mkdirSync(out, { recursive: true })
      await role(page, /^(Nur ich|Just me)$/)
      for (const [name, path] of [['heute', '/'], ['testen', '/diagnostik'], ['profil', '/performance'], ['plan', '/plan'], ['player', '/plan/heute']] as const) {
        await go(page, path)
        await page.screenshot({ path: `${out}/${name}.png` })
      }
      // Veränderung: die echte Karte der Ergebnisseite, in den Ausschnitt gescrollt.
      await go(page, '/ergebnis/land-6')
      await page.locator('div.border-t', { has: page.getByText(/^(Veränderung|Change)$/) }).first().evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${out}/veraenderung.png` })
      await role(page, /^(Trainer|Coach)$/)
      await go(page, '/')
      await page.screenshot({ path: `${out}/trainer.png` })
    }
  }
})
