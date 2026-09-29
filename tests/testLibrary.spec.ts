import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { TEST_CATALOG } from '../src/data/testCatalog'
import { LIBRARY_PROCEDURES, OBSERVATION_PROCEDURES } from '../src/data/testProcedureLibrary'
import { OBSERVATIONS } from '../src/data/observations'
import { FIGURE_IDS } from '../src/features/tests/figures/library'
import { EQUIPMENT_BY_ID } from '../src/data/equipment'

/**
 * Testbibliothek, Protokoll 1.0 — Welle 1 (Kampfsport) und Welle 2 (Laufen,
 * Rad, Schwimmen, Triathlon, Rudern).
 *
 * Was hier gesichert wird, ist genau das, was beim Übertragen aus einem
 * Dokument still verloren geht: ein Verweis, der ins Leere zeigt, eine
 * Vorschrift ohne Schritte, eine Skizze ohne Beschreibung, ein Beobachtungswert
 * ohne Text. Alle Fälle bis auf die letzten drei laufen ohne Browser.
 */

const procedures = { ...LIBRARY_PROCEDURES, ...OBSERVATION_PROCEDURES }

test.describe('Testbibliothek — Daten', () => {
  test('jede Vorschrift gehört zu einem Test oder Beobachtungswert der App', () => {
    const tests = new Set(TEST_CATALOG.map((t) => t.slug))
    const observations = new Set(OBSERVATIONS.map((o) => o.key))
    const orphans = Object.keys(LIBRARY_PROCEDURES).filter((k) => !tests.has(k))
    expect(orphans, `Vorschrift ohne Test: ${orphans.join(', ')}`).toEqual([])
    const orphanObs = Object.keys(OBSERVATION_PROCEDURES).filter((k) => !observations.has(k))
    expect(orphanObs, `Vorschrift ohne Beobachtungswert: ${orphanObs.join(', ')}`).toEqual([])
  })

  test('jede Vorschrift nennt Ziel, Schritte und Bewertung', () => {
    for (const [key, p] of Object.entries(procedures)) {
      expect(p.goal?.de, `${key}: Ziel`).toBeTruthy()
      expect(p.goal?.en, `${key}: goal`).toBeTruthy()
      expect(p.steps?.length ?? 0, `${key}: Schritte`).toBeGreaterThan(0)
      expect(p.scoring?.de, `${key}: Bewertung`).toBeTruthy()
    }
  })

  test('jede Skizze gibt es, und jede hat eine Bildbeschreibung', () => {
    for (const [key, p] of Object.entries(procedures)) {
      if (!p.figure) continue
      expect(FIGURE_IDS, `${key}: Skizze «${p.figure.id}» fehlt`).toContain(p.figure.id)
      expect(p.figure.alt.de.length, `${key}: Bildbeschreibung`).toBeGreaterThan(30)
      expect(p.figure.alt.en.length, `${key}: alt text`).toBeGreaterThan(30)
    }
  })

  test('jede Skizze wird von mindestens einer Vorschrift gebraucht', () => {
    const used = new Set(Object.values(procedures).map((p) => p.figure?.id))
    const unused = FIGURE_IDS.filter((id) => !used.has(id))
    expect(unused, `Skizzen ohne Test: ${unused.join(', ')}`).toEqual([])
  })

  test('eine Vorschrift ohne Zeit- oder Streckenangabe zeigt keinen Platzhalter', () => {
    // Das Dokument füllt leere Felder mit «Keine zusätzliche feste …». Das ist
    // keine Angabe, sondern das Fehlen einer — es gehört nicht in die App.
    for (const [key, p] of Object.entries(procedures)) {
      expect(p.timeSpec?.de ?? '', `${key}: Zeit`).not.toMatch(/Keine zusätzliche feste/)
      expect(p.distanceSpec?.de ?? '', `${key}: Strecke`).not.toMatch(/Keine feste Strecken/)
    }
  })

  test('Geräte- und Labortests halten sich an die Regeln des Katalogs', () => {
    const lab = TEST_CATALOG.filter((t) => t.setting === 'lab' && LIBRARY_PROCEDURES[t.slug])
    expect(lab.length).toBeGreaterThan(0)
    for (const t of lab) {
      // Ein Test, der ein Labor braucht, ist nie Voraussetzung für ein Profil —
      // und bei geräteabhängigen Werten wird das Gerät zur Pflichtangabe.
      expect(t.equipmentIds.flat().length, `${t.slug}: Ausrüstung`).toBeGreaterThan(0)
      for (const id of t.equipmentIds.flat()) expect(EQUIPMENT_BY_ID.has(id)).toBe(true)
    }
    const punch = TEST_CATALOG.find((t) => t.slug === 'peak_punch_force')!
    expect(punch.deviceBound).toBe('critical')
  })

  test('die Seitenstütz-Ausdauer wertet die schwächere Seite und nennt die Asymmetrie', () => {
    const t = TEST_CATALOG.find((x) => x.slug === 'side_plank_endurance')!
    const out: Record<string, number> = {}
    t.derive?.({ durationLeftS: 60, durationRightS: 45 }, { bodyWeightKg: null, ageYears: 28, sex: 'male' }, (k, v) => {
      if (v != null) out[k] = v
    }, t)
    expect(out.durationSeconds).toBe(45)
    expect(out.asymmetryPercent).toBe(25)
    const none: Record<string, number> = {}
    t.derive?.({ durationLeftS: 60 }, { bodyWeightKg: null, ageYears: 28, sex: 'male' }, (k, v) => {
      if (v != null) none[k] = v
    }, t)
    expect(none, 'ohne zweite Seite keine erfundene Kennzahl').toEqual({})
  })

  test('der Einbeinsprung wertet die schwächere Seite und den Seitenindex', () => {
    const t = TEST_CATALOG.find((x) => x.slug === 'single_leg_hop')!
    const ctx = { bodyWeightKg: null, ageYears: 28, sex: 'male' as const }
    const out: Record<string, number> = {}
    t.derive?.({ hopLeftCm: 180, hopRightCm: 200 }, ctx, (k, v) => {
      if (v != null) out[k] = v
    }, t)
    expect(out.hopDistanceCm).toBe(180)
    expect(out.limbSymmetryIndex).toBe(90)
    const none: Record<string, number> = {}
    t.derive?.({ hopLeftCm: 180 }, ctx, (k, v) => {
      if (v != null) none[k] = v
    }, t)
    expect(none, 'ohne zweite Seite keine erfundene Kennzahl').toEqual({})
  })

  test('die 30-s-Ergometerleistung nennt den Leistungsabfall nur mit Minimalwert', () => {
    const t = TEST_CATALOG.find((x) => x.slug === 'row_30s_power')!
    const ctx = { bodyWeightKg: null, ageYears: 28, sex: 'male' as const }
    const out: Record<string, number> = {}
    t.derive?.({ peakPowerW: 800, meanPowerW: 650, minPowerW: 400 }, ctx, (k, v) => {
      if (v != null) out[k] = v
    }, t)
    expect(out.fatigue_index_percent).toBe(50)
    const none: Record<string, number> = {}
    t.derive?.({ peakPowerW: 800, meanPowerW: 650 }, ctx, (k, v) => {
      if (v != null) none[k] = v
    }, t)
    expect(none).toEqual({})
  })

  test('Zugleinen-Schwimmen, Isometrik und F-v-Profil sind Laborwerte und nie Pflicht', () => {
    for (const slug of ['tethered_swim_30s', 'whole_body_isometric_force', 'fv_profile_ergometer']) {
      const t = TEST_CATALOG.find((x) => x.slug === slug)!
      expect(t.setting, slug).toBe('lab')
      expect(t.deviceBound, slug).toBe('critical')
    }
  })
})

test.describe('Testbibliothek — Anzeige', () => {
  test('die Detailseite zeigt Ziel, Aufbau, nummerierte Schritte, Skizze und Bewertung', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/judogi_chin_up_hold/details', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Durchführung', { exact: true })).toBeVisible()
    await expect(page.getByText('Material und Aufbau', { exact: true })).toBeVisible()
    await expect(page.getByText('Durchführung Schritt für Schritt', { exact: true })).toBeVisible()
    await expect(page.getByText('Bewertung und Auswertung', { exact: true })).toBeVisible()
    await expect(page.locator('ol > li').first()).toBeVisible()
    // Die Skizze wird nachgeladen und trägt ihre Bildbeschreibung.
    await expect(page.getByRole('img', { name: /Seitenansicht: Eine Person hält sich mit dem Kinn/ })).toBeVisible()
    // Die Vorschrift erklärt sich selbst: keine «allgemein»-Kennzeichnung.
    await expect(page.getByText('allgemein', { exact: true })).toHaveCount(0)
  })

  test('ein vorhandener Test bekommt die neuen Abschnitte, ohne die alten zu verlieren', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/sprint_10m/details', { waitUntil: 'domcontentloaded' })

    // Aus dem Dokument neu:
    await expect(page.getByText('Ziel', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Draufsicht der Sprintbahn/ })).toBeVisible()
    // Vorhanden geblieben:
    for (const label of ['Versuche und Pausen', 'Wann ein Versuch zählt', 'Was gleich bleiben muss']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test('Welle 2: ein neuer Triathlon-Test zeigt seine Ablaufskizze', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/triathlon_sprint_time/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Durchführung Schritt für Schritt', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Ablaufgrafik des Sprint-Triathlons/ })).toBeVisible()
  })

  test('ein Beobachtungswert zeigt seine Durchführung, ohne bewertet zu werden', async ({ page }) => {
    await openGuest(page)
    await page.goto('/beobachtung', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Beobachtungswerte', { exact: true }).selectOption('stork_balance_s')

    const procedure = page.getByTestId('observation-procedure')
    await expect(procedure).toBeVisible()
    await procedure.getByText('Durchführung', { exact: true }).click()
    await expect(procedure.getByText('Durchführung Schritt für Schritt')).toBeVisible()
    await expect(procedure.getByRole('img')).toBeVisible()
  })
})
