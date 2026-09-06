import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { runPlan, splitIntoGroups, stationForGroup } from '../src/domain/testDay'
import type { StoredTestDay } from '../src/lib/store/localStore'

/**
 * Der Testtag.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: die App konnte eine Station für alle
 * (Gruppentest) oder alle Stationen für einen (Termin). Ein Trainer, der
 * fünfzehn Leute über fünf Stationen schickt, hat beides gleichzeitig.
 *
 * Der teuerste Fehler wäre ein Laufplan, der nicht aufgeht: stehen zwei
 * Gruppen gleichzeitig an derselben Station, ist der Testtag in der zweiten
 * Runde vorbei. Dafür steht der erste Fall.
 */

const day: StoredTestDay = {
  id: 'tag-1',
  title: 'Vereinstest',
  plannedOn: '2026-09-12',
  batterySlug: 'general_fitness',
  testSlugs: ['countermovement_jump', 'shuttle_5_10_5', 'pull_up_max_reps', 'cooper_12min'],
  athleteIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  stationMinutes: 20,
  conditions: { surface: '', temperatureC: null, equipment: '' },
  createdAt: '2026-09-01T09:00:00.000Z',
  completedAt: null,
}

test.describe('Laufplan', () => {
  test('in jeder Runde steht an jeder Station genau eine Gruppe', () => {
    const plan = runPlan(day)

    for (let round = 1; round <= plan.stations.length; round++) {
      const belegt = plan.slots.filter((s) => s.round === round).map((s) => s.stationSlug)
      // Kein Doppel: sonst wäre der Testtag in der zweiten Runde vorbei.
      expect(new Set(belegt).size, `Runde ${round}`).toBe(belegt.length)
      expect(belegt.length).toBe(plan.stations.length)
    }
  })

  test('nach so vielen Runden wie Stationen war jede Gruppe an jeder Station', () => {
    const plan = runPlan(day)

    for (let group = 1; group <= plan.groups.length; group++) {
      const besucht = new Set<string>()
      for (let round = 1; round <= plan.stations.length; round++) {
        besucht.add(stationForGroup(plan, group, round)?.slug ?? '')
      }
      expect(besucht.size, `Gruppe ${group}`).toBe(plan.stations.length)
    }
  })

  test('die Gruppen werden reihum geteilt, nicht blockweise', () => {
    // Blockweise stünden die zuletzt hinzugefügten Athleten alle in derselben
    // Gruppe — wer seine Liste alphabetisch pflegt, hätte das halbe Alphabet
    // an einer Station.
    const groups = splitIntoGroups(['a', 'b', 'c', 'd', 'e'], 2)
    expect(groups[0]).toEqual(['a', 'c', 'e'])
    expect(groups[1]).toEqual(['b', 'd'])
  })

  test('die veranschlagte Dauer folgt aus Stationen und Minuten je Station', () => {
    expect(runPlan(day).totalMinutes).toBe(4 * 20)
  })

  test('ohne Stationen entsteht kein Plan statt eines leeren Rasters', () => {
    const plan = runPlan({ ...day, testSlugs: [] })
    expect(plan.slots).toEqual([])
    expect(plan.totalMinutes).toBe(0)
  })
})

async function coachWithThree(page: import('@playwright/test').Page) {
  await openGuest(page)
  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Trainer' }).click()
  await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')
  for (const name of ['Athlet B', 'Athlet C']) {
    await page.getByRole('button', { name: 'Athlet hinzufügen' }).first().click()
    await page.getByRole('textbox', { name: /^Name von/ }).last().fill(name)
  }
}

test.describe('Testtag im Bildschirm', () => {
  test('anlegen, Laufplan sehen, an einer Station erfassen', async ({ page }) => {
    await coachWithThree(page)
    await page.goto('/trainer/testtag', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Testtag anlegen' }).click()
    await page.getByLabel('Bezeichnung').fill('Vereinstest')
    await page.getByLabel('Batterie').selectOption({ label: 'Allgemeine Fitness' })
    await page.getByRole('button', { name: 'Anlegen', exact: true }).click()

    await page.getByRole('link', { name: 'Öffnen' }).first().click()
    await expect(page.getByRole('heading', { name: 'Vereinstest' })).toBeVisible()
    await expect(page.getByText('Laufplan')).toBeVisible()

    // Aus dem Testtag heraus steht die Station schon fest — wer sie an der
    // Station erneut heraussuchen müsste, greift daneben.
    await page.getByRole('link', { name: /An dieser Station erfassen/ }).first().click()
    await page.waitForURL('**/gruppentest?**')
    await expect(page.getByRole('combobox').first()).not.toHaveValue('')
  })

  test('der Plan überlebt einen Wechsel des aktiven Athleten', async ({ page }) => {
    await coachWithThree(page)
    await page.goto('/trainer/testtag', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Testtag anlegen' }).click()
    await page.getByLabel('Batterie').selectOption({ label: 'Allgemeine Fitness' })
    await page.getByRole('button', { name: 'Anlegen', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Öffnen' })).toHaveCount(1)

    // Ein Testtag gehört keinem Einzelnen. Läge er im aktiven Athleten,
    // verschwände er beim Umschalten — und genau während des Testtags wird
    // ständig umgeschaltet.
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Athlet [A-C]/ }).first().click()
    await page.getByRole('option', { name: /Athlet C/ }).click()

    await page.goto('/trainer/testtag', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: 'Öffnen' })).toHaveCount(1)
  })

  test('das Löschen der Planung nimmt keine Messwerte mit', async ({ page }) => {
    await coachWithThree(page)
    await page.goto('/tests/pull_up_max_reps', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/Wiederholungen/).first().fill('12')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    await page.goto('/trainer/testtag', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Testtag anlegen' }).click()
    await page.getByLabel('Batterie').selectOption({ label: 'Allgemeine Fitness' })
    await page.getByRole('button', { name: 'Anlegen', exact: true }).click()
    await page.getByRole('link', { name: 'Öffnen' }).first().click()
    await page.getByRole('button', { name: 'Testtag löschen' }).click()

    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/12/).first()).toBeVisible()
  })
})
