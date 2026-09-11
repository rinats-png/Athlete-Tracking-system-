import { openGuest, readDict } from './helpers'
import { expect, test } from '@playwright/test'
import { dueTests, overdueTests, suggestedIntervalDays, SUGGESTED_INTERVAL_BOUNDS } from '../src/domain/reminders'
import { monthCalendar } from '../src/domain/calendar'
import { DEFAULT_RETEST_DAYS } from '../src/domain/nextTest'
import type { StoredResult } from '../src/lib/store/localStore'

const asOf = new Date('2026-06-15T12:00:00.000Z')
const daysAgo = (days: number) => new Date(asOf.getTime() - days * 86_400_000).toISOString()

const result = (testSlug: string, performedAt: string): StoredResult =>
  ({
    id: `${testSlug}-${performedAt}`,
    testSlug,
    performedAt,
    values: { x: 1 },
    metrics: {},
    score: 1,
    bodyWeightKg: null,
    ageYears: null,
    sex: null,
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    photo: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: performedAt,
  }) as StoredResult

test.describe('Erinnerungen', () => {
  test('ein Test wird nach dem Abstand fällig, überfällige stehen zuerst', () => {
    const due = dueTests(
      [result('cooper_12min', daysAgo(50)), result('grip_strength', daysAgo(10))],
      { remindersEnabled: true, reminderIntervalDays: {} },
      asOf,
    )
    expect(due[0].slug).toBe('cooper_12min')
    expect(due[0].overdueDays).toBe(50 - DEFAULT_RETEST_DAYS)
    expect(due[1].overdueDays).toBeLessThan(0)
  })

  test('ausgeschaltet heisst: keine Erinnerung, auch wenn etwas fällig wäre', () => {
    const results = [result('cooper_12min', daysAgo(90))]
    expect(overdueTests(results, { remindersEnabled: false, reminderIntervalDays: {} }, asOf)).toEqual([])
    expect(overdueTests(results, { remindersEnabled: true, reminderIntervalDays: {} }, asOf)).toHaveLength(1)
  })

  test('der vorgeschlagene Abstand ist der Median der eigenen Abstände', () => {
    const results = [
      result('cooper_12min', daysAgo(100)),
      result('cooper_12min', daysAgo(70)),
      result('cooper_12min', daysAgo(40)),
      result('cooper_12min', daysAgo(0)),
    ]
    expect(suggestedIntervalDays(results, 'cooper_12min')).toBe(30)
  })

  test('unter drei Messungen gibt es keinen Vorschlag', () => {
    expect(suggestedIntervalDays([result('cooper_12min', daysAgo(30)), result('cooper_12min', daysAgo(0))], 'cooper_12min')).toBeNull()
  })

  test('der Vorschlag bleibt zwischen zwei Wochen und einem halben Jahr', () => {
    const tight = [result('cooper_12min', daysAgo(6)), result('cooper_12min', daysAgo(3)), result('cooper_12min', daysAgo(0))]
    const wide = [result('cooper_12min', daysAgo(800)), result('cooper_12min', daysAgo(400)), result('cooper_12min', daysAgo(0))]
    expect(suggestedIntervalDays(tight, 'cooper_12min')).toBe(SUGGESTED_INTERVAL_BOUNDS[0])
    expect(suggestedIntervalDays(wide, 'cooper_12min')).toBe(SUGGESTED_INTERVAL_BOUNDS[1])
  })
})

test.describe('Kalender', () => {
  test('der Monat beginnt mit einem Montag und enthält jeden Tag genau einmal', () => {
    const month = monthCalendar(2026, 3, [], [], { remindersEnabled: false, reminderIntervalDays: {} }, asOf)
    expect(new Date(month.weeks[0][0].date + 'T12:00:00').getDay()).toBe(1)
    const days = month.weeks.flat().filter((d) => d.inMonth).map((d) => d.date)
    expect(days).toHaveLength(31)
    expect(new Set(days).size).toBe(31)
  })

  test('Ergebnisse und Fälligkeiten liegen auf ihrem Tag', () => {
    const results = [result('cooper_12min', '2026-03-10T10:00:00.000Z')]
    const month = monthCalendar(2026, 3, results, [], { remindersEnabled: true, reminderIntervalDays: { cooper_12min: 10 } }, asOf)
    const tenth = month.weeks.flat().find((d) => d.date === '2026-03-10')!
    const twentieth = month.weeks.flat().find((d) => d.date === '2026-03-20')!
    expect(tenth.results).toHaveLength(1)
    expect(twentieth.due).toEqual(['cooper_12min'])
  })
})

/**
 * Eine Erinnerung, die nicht kommt, ist ein gebrochenes Versprechen. KYDON
 * hat keinen Server, der Mitteilungen schicken könnte — also muss der Text
 * das sagen, bevor jemand sich darauf verlässt.
 */
test.describe('Was die Erinnerung leisten kann', () => {
  test('der Bildschirm sagt, dass bei geschlossener App nichts kommt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/verlauf/erinnerungen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Während KYDON geschlossen ist, kommt nichts/i)).toBeVisible()
  })

  test('kein Text verspricht eine Meldung, die bei geschlossener App käme', () => {
    const de = readDict('de')

    // Seit die App eine Systemmeldung zeigen KANN, solange sie offen ist, ist
    // «benachrichtigen» kein verbotenes Wort mehr — es wäre sonst die
    // Fähigkeit verschwiegen. Verboten bleibt die Zusage, die sie ohne
    // Push-Server nicht halten kann.
    const notify = Object.entries(de.reminders)
      .filter(([key]) => key.startsWith('notify'))
      .map(([, value]) => String(value))
      .join(' ')
    expect(notify.length, 'die Texte müssen es überhaupt geben').toBeGreaterThan(50)
    // «im Hintergrund» steht in der Verneinung («sie hat keinen Server, der
    // im Hintergrund etwas verschickt») und darf deshalb NICHT verboten sein:
    // sonst zwänge die Prüfung dazu, die Grenze unschärfer zu formulieren.
    // Verboten sind die Zusagen selbst.
    expect(
      notify.match(/zuverlässig|auch wenn (die App |sie )?geschlossen|selbst wenn/i),
      'sonst erwartet jemand eine Mitteilung, die nie kommt',
    ).toBeNull()

    // Und die Grenze muss ausdrücklich dastehen, nicht bloss nicht bestritten.
    expect(de.reminders.notifyLimit).toMatch(/geöffnet/)
    expect(de.reminders.noPush).toMatch(/geschlossen/)
  })
})
