import { expect, test } from '@playwright/test'
import {
  ageAllows,
  allConsents,
  consentFor,
  energyAvailability,
  entryCount,
  grantConsent,
  hasConsent,
  labMarkers,
  labSeries,
  peakSummary,
  symptomSeries,
  withdrawConsent,
} from '../src/domain/health'
import { CURRENT_SCHEMA_VERSION, HEALTH_CATEGORIES, HEALTH_CONSENT_VERSION, HEALTH_MIN_AGE, emptyData, emptyAthlete, parseStoredData } from '../src/lib/store/schema'
import { stripHealth, stripSeries } from '../src/lib/supabase/series'
import { LAB_MARKERS } from '../src/data/labMarkers'
import { athletePlan } from '../src/data/pricing'
import { accessFor, canUse } from '../src/domain/entitlement'
import type { StoredHealth, StoredLabEntry, StoredPeakWeek, StoredSymptomEntry } from '../src/lib/store/localStore'
import { openGuest } from './helpers'

/**
 * Die Gesundheitsschicht (S5, Art. 9 DSGVO).
 *
 * Diese Fälle halten die drei Zusagen fest, auf denen der ganze Bereich
 * steht (docs/rechtspruefung-art9-mdr.md):
 *
 *   1. Ohne Einwilligung je Kategorie passiert nichts; der Widerruf löscht.
 *   2. Diese Daten verlassen das Gerät nicht.
 *   3. Die App bewertet nichts — kein Grenzwert, keine Einstufung, keine
 *      Vorhersage. Der letzte Fall durchsucht den ganzen Bildschirm danach.
 */

const emptyHealth = (): StoredHealth => ({ consents: [], labs: [], symptoms: [], cycle: [], selfImage: [], meds: [], photos: [], trainingKcalPerDay: null, updatedAt: null })

const lab = (day: string, marker: string, value: number, ref: [number | null, number | null] = [null, null]): StoredLabEntry => ({
  id: `l-${marker}-${day}`,
  day,
  marker,
  value,
  unit: 'µg/l',
  refLow: ref[0],
  refHigh: ref[1],
  lab: 'Labor Nord',
  time: '07:40',
  fasting: true,
  trainingDayBefore: false,
  cyclePhase: null,
  infection: false,
  note: '',
  createdAt: `${day}T08:00:00.000Z`,
  updatedAt: `${day}T08:00:00.000Z`,
})

test.describe('Einwilligung je Kategorie', () => {
  test('ohne Haken ist keine Kategorie erlaubt', () => {
    const h = emptyHealth()
    for (const c of HEALTH_CATEGORIES) expect(hasConsent(h, c), c).toBe(false)
    expect(allConsents(h).every((c) => c.state === 'missing')).toBe(true)
  })

  test('erteilen schaltet genau eine Kategorie frei, nicht alle', () => {
    const h = grantConsent(emptyHealth(), 'lab', '2026-09-22T10:00:00.000Z')
    expect(hasConsent(h, 'lab')).toBe(true)
    expect(hasConsent(h, 'symptoms')).toBe(false)
    expect(consentFor(h, 'lab').version).toBe(HEALTH_CONSENT_VERSION)
  })

  test('eine ältere Fassung gilt nicht weiter — die App fragt erneut', () => {
    const h: StoredHealth = { ...emptyHealth(), consents: [{ category: 'lab', grantedAt: '2026-01-01T00:00:00.000Z', withdrawnAt: null, version: '2025-01-01' }] }
    expect(consentFor(h, 'lab').state).toBe('outdated')
    expect(hasConsent(h, 'lab')).toBe(false)
  })

  test('der Widerruf löscht die Einträge der Kategorie — und nur dieser', () => {
    let h = grantConsent(grantConsent(emptyHealth(), 'lab', '2026-09-22T10:00:00.000Z'), 'meds', '2026-09-22T10:00:00.000Z')
    h = { ...h, labs: [lab('2026-09-01', 'ferritin', 48)], meds: [{ id: 'm1', kind: 'supplement', name: 'Kreatin', dose: '5 g', from: '2026-09-01', to: null, note: '', createdAt: 'x', updatedAt: 'x' }] as never }
    expect(entryCount(h, 'lab')).toBe(1)

    const after = withdrawConsent(h, 'lab', '2026-09-22T11:00:00.000Z')
    expect(after.labs).toEqual([])
    expect(after.meds).toHaveLength(1)
    expect(consentFor(after, 'lab').state).toBe('withdrawn')
    // Der Vermerk bleibt, die Daten nicht.
    expect(consentFor(after, 'lab').grantedAt).not.toBeNull()
    expect(hasConsent(after, 'meds')).toBe(true)
  })

  test('jede Kategorie ist im Widerruf abgedeckt — keine bleibt liegen', () => {
    for (const c of HEALTH_CATEGORIES) {
      const granted = grantConsent(emptyHealth(), c, '2026-09-22T10:00:00.000Z')
      const after = withdrawConsent(granted, c, '2026-09-22T11:00:00.000Z')
      expect(entryCount(after, c), c).toBe(0)
      expect(hasConsent(after, c), c).toBe(false)
    }
  })
})

test.describe('Altersgrenze', () => {
  test('ohne Geburtsdatum bleibt der Bereich zu', () => {
    expect(ageAllows(null)).toBe(false)
  })

  test('unter achtzehn nein, ab achtzehn ja', () => {
    const now = new Date('2026-09-22T12:00:00Z')
    expect(HEALTH_MIN_AGE).toBe(18)
    expect(ageAllows('2009-09-23', now)).toBe(false)
    expect(ageAllows('2008-09-22', now)).toBe(true)
  })
})

test.describe('Diese Daten verlassen das Gerät nicht', () => {
  test('das Dokument für den Server trägt weder Gesundheitsschicht noch Peak Week', () => {
    const athlete = {
      ...emptyAthlete(),
      health: { ...emptyHealth(), labs: [lab('2026-09-01', 'ferritin', 48)], trainingKcalPerDay: 600 },
      peakWeeks: [{ id: 'w1', name: 'Test', eventDate: '2026-10-01', days: [], note: '', createdAt: 'x', updatedAt: 'x' }] as StoredPeakWeek[],
    }
    for (const stripped of [stripHealth(athlete), stripSeries(athlete)]) {
      expect(stripped.health.labs).toEqual([])
      expect(stripped.health.trainingKcalPerDay).toBeNull()
      expect(stripped.peakWeeks).toEqual([])
    }
    // Der lokale Bestand bleibt unberührt — gestrippt wird nur die Kopie.
    expect(athlete.health.labs).toHaveLength(1)
    expect(athlete.peakWeeks).toHaveLength(1)
    // Und die Zeitreihen sind weiterhin draussen.
    expect(stripSeries(athlete).diary).toEqual([])
  })
})

test.describe('Schema', () => {
  test('ein Bestand der Version 23 bekommt eine leere Schicht und KEINE Einwilligung', () => {
    const old = { ...emptyData(), version: 23 } as any
    delete old.athletes[0].health
    delete old.athletes[0].peakWeeks
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(23)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(data?.athletes[0].health.consents).toEqual([])
    expect(data?.athletes[0].health.labs).toEqual([])
    expect(data?.athletes[0].peakWeeks).toEqual([])
  })
})

test.describe('Laborwerte', () => {
  test('der Katalog bringt KEINEN Referenzbereich mit — er gehört dem Labor', () => {
    expect(LAB_MARKERS.length).toBeGreaterThan(20)
    for (const m of LAB_MARKERS) {
      expect(Object.keys(m).sort(), m.key).toEqual(['group', 'key', 'unit'])
      expect(m.unit, m.key).toBeTruthy()
    }
    // Kein einziger Zahlenwert im ganzen Katalog: ein Referenzbereich, eine
    // Grenze oder ein «üblicher» Wert wäre eine Zahl — und es gibt keine.
    for (const m of LAB_MARKERS) {
      for (const [field, value] of Object.entries(m)) {
        expect(typeof value, `${m.key}.${field}`).toBe('string')
      }
    }
  })

  test('der Verlauf steht chronologisch, die Übersicht mit der neuesten Messung', () => {
    const labs = [lab('2026-06-01', 'ferritin', 40, [30, 400]), lab('2026-09-01', 'ferritin', 48, [30, 400]), lab('2026-08-01', 'tsh', 1.4)]
    const series = labSeries(labs, 'ferritin')
    expect(series.map((p) => p.day)).toEqual(['2026-06-01', '2026-09-01'])
    expect(series[0].refLow).toBe(30)
    const markers = labMarkers(labs)
    expect(markers.map((m) => m.marker)).toEqual(['ferritin', 'tsh'])
    expect(markers[0].count).toBe(2)
    expect(markers[0].latest.value).toBe(48)
  })
})

test.describe('Symptome', () => {
  test('ein Tag ohne Eintrag ist leer, nicht null — nicht erfasst ist nicht beschwerdefrei', () => {
    const entries: StoredSymptomEntry[] = [
      { id: 'a', day: '2026-09-20', items: [{ key: 'nausea', severity: 2 }], note: '', createdAt: 'x', updatedAt: 'x' },
      { id: 'b', day: '2026-09-22', items: [{ key: 'reflux', severity: 1 }], note: '', createdAt: 'x', updatedAt: 'x' },
    ]
    expect(symptomSeries(entries, 'nausea', ['2026-09-20', '2026-09-21', '2026-09-22'])).toEqual([2, null, null])
  })
})

test.describe('Energieverfügbarkeit', () => {
  test('die Formel rechnet, sobald alle drei Zahlen da sind', () => {
    expect(energyAvailability({ intakeKcal: 3000, trainingKcal: 600, fatFreeMassKg: 60 })).toBe(40)
  })

  test('fehlt eine Zahl, gibt es keine — besonders der Trainingsumsatz wird nicht geschätzt', () => {
    expect(energyAvailability({ intakeKcal: 3000, trainingKcal: null, fatFreeMassKg: 60 })).toBeNull()
    expect(energyAvailability({ intakeKcal: null, trainingKcal: 600, fatFreeMassKg: 60 })).toBeNull()
    expect(energyAvailability({ intakeKcal: 3000, trainingKcal: 600, fatFreeMassKg: null })).toBeNull()
    expect(energyAvailability({ intakeKcal: 3000, trainingKcal: 600, fatFreeMassKg: 0 })).toBeNull()
  })
})

test.describe('Peak Week', () => {
  test('die Differenz braucht zwei gewogene Tage', () => {
    const week: StoredPeakWeek = {
      id: 'w',
      name: 'Test',
      eventDate: '2026-10-01',
      days: [
        { id: 'd1', day: '2026-09-24', stage: 'peak', weightKg: 82, lookIndex: 7, giComfort: 2, posingMin: 20, note: '', createdAt: 'x', updatedAt: 'x' },
        { id: 'd2', day: '2026-09-25', stage: 'peak', weightKg: null, lookIndex: null, giComfort: null, posingMin: null, note: '', createdAt: 'x', updatedAt: 'x' },
      ],
      note: '',
      createdAt: 'x',
      updatedAt: 'x',
    }
    const one = peakSummary(week, '2026-09-24')
    expect(one.days).toBe(2)
    expect(one.weighed).toBe(1)
    expect(one.weightDelta).toBeNull()
    expect(one.daysToEvent).toBe(7)

    const two = peakSummary({ ...week, days: [week.days[0], { ...week.days[1], weightKg: 81.2 }] }, '2026-09-24')
    expect(two.weightDelta).toBeCloseTo(-0.8, 5)
  })
})

test.describe('Stufe', () => {
  test('Elite trägt die Gesundheitsschicht, Pro nicht — und ein Trainerabo kauft sie nicht mit', () => {
    expect(athletePlan('elite').yearlyEur).toBe(199)
    expect(athletePlan('elite').features).toContain('health')
    expect(athletePlan('elite').features).toContain('peakWeek')
    expect(athletePlan('pro').features).not.toContain('health')
    for (const f of athletePlan('pro').features) expect(athletePlan('elite').features).toContain(f)

    const elite = accessFor('athlete', [{ product: 'athlete_elite', status: 'active', currentPeriodEnd: null }])
    expect(canUse('health', elite)).toBe(true)
    // Ein zahlender Trainer bekommt die volle Datentiefe, aber nicht Art. 9.
    const coach = accessFor('coach', [{ product: 'coach_pro', status: 'active', currentPeriodEnd: null }])
    expect(canUse('nutrition', coach)).toBe(true)
    expect(canUse('health', coach)).toBe(false)
    expect(canUse('peakWeek', coach)).toBe(false)
    // Der Trainer-Zuschuss für Athleten reicht nur bis Plus.
    expect(canUse('health', accessFor('athlete', [], true))).toBe(false)
  })
})

test.describe('Im Bildschirm', () => {
  async function asElite(page: import('@playwright/test').Page, birthDate: string | null = '1996-01-15') {
    await openGuest(page)
    await page.evaluate(
      ({ birth }) => {
        localStorage.setItem('kydon.billing.mode', 'on')
        localStorage.setItem('kydon.billing.v1', JSON.stringify({ entitlements: [{ product: 'athlete_elite', status: 'active', currentPeriodEnd: null }], coachGrant: false, checkedAt: null }))
        const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
        store.athletes[0].profile.birthDate = birth
        localStorage.setItem('kydon.data.v1', JSON.stringify(store))
      },
      { birth: birthDate },
    )
  }

  test('ohne Elite steht die Schranke, nicht der Bildschirm', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => localStorage.setItem('kydon.billing.mode', 'on'))
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-health')).toBeVisible()
    await expect(page.getByTestId('health-consent')).toHaveCount(0)
  })

  test('ohne Geburtsdatum bleibt der Bereich zu, mit Geburtsdatum steht die Einwilligung', async ({ page }) => {
    await asElite(page, null)
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('health-age-gate')).toBeVisible()
    await expect(page.getByTestId('health-consent')).toHaveCount(0)

    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.athletes[0].profile.birthDate = '1996-01-15'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('health-consent')).toBeVisible()
    await expect(page.getByTestId('lab-panel')).toHaveCount(0)
  })

  test('erst die Einwilligung, dann der Abschnitt — und der Widerruf nimmt den Eintrag mit', async ({ page }) => {
    await asElite(page)
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('consent-lab').getByRole('button', { name: 'Einwilligen' }).click()
    await expect(page.getByTestId('lab-panel')).toBeVisible()

    await page.getByRole('button', { name: 'Befund eintragen' }).click()
    await page.getByLabel('Wert', { exact: true }).fill('48')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('lab-panel')).toContainText('48')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('lab-panel')).toContainText('48')

    await page.getByTestId('consent-lab').getByRole('button', { name: 'Widerrufen' }).click()
    await expect(page.getByRole('alert')).toContainText('1')
    await page.getByRole('button', { name: 'Widerrufen und löschen' }).click()
    await expect(page.getByTestId('lab-panel')).toHaveCount(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('lab-panel')).toHaveCount(0)
  })

  test('der Sicherheitshinweis steht immer da und hängt nicht an den Einträgen', async ({ page }) => {
    await asElite(page)
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('consent-symptoms').getByRole('button', { name: 'Einwilligen' }).click()
    const notice = page.getByTestId('symptom-safety')
    await expect(notice).toBeVisible()
    const before = await notice.innerText()

    await page.getByRole('button', { name: 'Tag eintragen' }).click()
    await page.getByRole('group', { name: 'Herzklopfen' }).getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('symptom-palpitations')).toBeVisible()
    // Derselbe Text, obwohl ein Symptom mit der höchsten Stärke erfasst ist:
    // die App liest die Einträge nicht, um zu entscheiden, was sie sagt.
    expect(await notice.innerText()).toBe(before)
  })

  test('die App bewertet nichts — kein Wort auf dem Bildschirm stuft ein', async ({ page }) => {
    await asElite(page)
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    // Alle Kategorien, nicht eine Auswahl: Eine neue Kategorie muss durch
    // denselben Filter, sonst wächst die Schicht an der Prüfung vorbei.
    for (const category of HEALTH_CATEGORIES) {
      await page.getByTestId(`consent-${category}`).getByRole('button', { name: 'Einwilligen' }).click()
    }
    const text = await page.locator('main').innerText()
    for (const wort of ['auffällig', 'Verdacht', 'Mangel', 'zu niedrig', 'zu hoch', 'erhöht', 'erniedrigt', 'Therapie', 'behandeln', 'Screening']) {
      expect(text, `«${wort}» wäre eine Einstufung`).not.toContain(wort)
    }
    await expect(page.getByTestId('health-scope')).toContainText('keine Diagnose')
  })

  test('Fotos erscheinen erst mit eigener Einwilligung', async ({ page }) => {
    await asElite(page)
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })

    // Laborwerte freigeben heisst nicht, Körperfotos freizugeben.
    await page.getByTestId('consent-lab').getByRole('button', { name: 'Einwilligen' }).click()
    await expect(page.getByTestId('lab-panel')).toBeVisible()
    await expect(page.getByTestId('photo-panel')).toHaveCount(0)

    await page.getByTestId('consent-photos').getByRole('button', { name: 'Einwilligen' }).click()
    const panel = page.getByTestId('photo-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId('photo-safety')).toContainText('vermisst nichts')

    // Und der Widerruf nimmt den Abschnitt wieder mit.
    await page.getByTestId('consent-photos').getByRole('button', { name: 'Widerrufen' }).click()
    await page.getByRole('button', { name: 'Widerrufen und löschen' }).click()
    await expect(page.getByTestId('photo-panel')).toHaveCount(0)
  })

  test('Peak Week protokolliert, ohne etwas vorzugeben', async ({ page }) => {
    await asElite(page)
    await page.goto('/peakweek', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Neuer Wettkampf' }).click()
    await page.getByLabel('Name').fill('Herbstpokal')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('peak-summary')).toContainText('Herbstpokal')

    await page.getByRole('button', { name: 'Tag eintragen' }).click()
    await page.getByLabel('Gewicht morgens (kg)').fill('82.4')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByTestId('peak-summary')).toContainText('82,4')

    const text = await page.locator('main').innerText()
    for (const wort of ['Wasser:', 'Natrium:', 'Kohlenhydrate:', 'trinke', 'empfohlen', 'solltest']) {
      expect(text, `«${wort}» wäre eine Vorgabe`).not.toContain(wort)
    }
  })
})
