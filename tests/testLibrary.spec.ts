import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { TEST_CATALOG } from '../src/data/testCatalog'
import { LIBRARY_PROCEDURES, OBSERVATION_PROCEDURES } from '../src/data/testProcedureLibrary'
import { OBSERVATIONS } from '../src/data/observations'
import { existsSync } from 'node:fs'
import { SLUG_IMAGE_KEYS, TEST_IMAGE_NUMBER, testImageUrl } from '../src/data/testImages'
import { EQUIPMENT_BY_ID } from '../src/data/equipment'
import { procedureFor } from '../src/data/testProcedure'
import { disciplineById } from '../src/data/sportProfiles'

/**
 * Testbibliothek, Protokoll 1.0 — Welle 1 (Kampfsport) und Welle 2 (Laufen,
 * Rad, Schwimmen, Triathlon, Rudern) Welle 3 (Teamsport) und
 * Welle 4 (Kraftsport, Allgemein, HYROX, Tactical) und
 * Welle 5 (Recovery, Thermal, NIRS, Ü40+).
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

  test('jeder Test mit Bibliotheksvorschrift zeigt eine vollständige, keine allgemeine', () => {
    // Fehlt einem Test die eigene Vorschrift und liefert die Bibliothek nur Zusatzfelder,
    // fällt die Seite still auf den allgemeinen Text zurück.
    for (const slug of Object.keys(LIBRARY_PROCEDURES)) {
      const t = TEST_CATALOG.find((x) => x.slug === slug)!
      expect(procedureFor(t).source, slug).toBe('specific')
    }
  })

  test('jedes Bild gibt es als Datei und gehört zu einem Test oder Beobachtungswert', () => {
    const known = new Set([...TEST_CATALOG.map((t) => t.slug), ...OBSERVATIONS.map((o) => o.key)])
    for (const key of [...Object.keys(TEST_IMAGE_NUMBER), ...SLUG_IMAGE_KEYS]) {
      expect(known.has(key), `Bild für unbekannten Schlüssel ${key}`).toBe(true)
      const url = testImageUrl(key)!
      expect(existsSync(`public${url}`), `${key}: ${url} fehlt`).toBe(true)
    }
  })

  test('jede Vorschrift mit Bild-Schlüssel hat ein Bild, und keine Datei liegt ungenutzt', async () => {
    const { readdirSync } = await import('node:fs')
    const used = new Set([...Object.values(TEST_IMAGE_NUMBER).map((n) => `T${String(n).padStart(3, '0')}.webp`), ...[...SLUG_IMAGE_KEYS].map((k) => `S_${k}.webp`)])
    // Übungsbilder (U_<key>.jpg) gehören zu den Übungen, nicht zu den Tests; ihr Gleichlauf steht in exerciseImages.spec.ts.
    const unused = readdirSync('public/testbilder').filter((f) => !used.has(f) && !f.startsWith('U_'))
    expect(unused, `Bilder ohne Test: ${unused.join(', ')}`).toEqual([])
    for (const key of Object.keys(procedures)) expect(testImageUrl(key), `${key}: Bild`).toBeTruthy()
  })

  test('jeder aktive Test und Beobachtungswert hat jetzt ein Bild', () => {
    const missing = [...TEST_CATALOG.map((t) => t.slug), ...OBSERVATIONS.filter((o) => !o.retired).map((o) => o.key)].filter((k) => !testImageUrl(k))
    expect(missing).toEqual([])
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

  test('Repeated Sprint Ability: Mittel und Abfall nur bei allen sechs Sprints', () => {
    const t = TEST_CATALOG.find((x) => x.slug === 'repeated_sprint_ability')!
    const ctx = { bodyWeightKg: null, ageYears: 24, sex: 'male' as const }
    const run = (values: Record<string, number>) => {
      const out: Record<string, number> = {}
      t.derive?.(values, ctx, (k, v) => {
        if (v != null) out[k] = v
      }, t)
      return out
    }
    const all = run({ sprint1S: 4, sprint2S: 4, sprint3S: 4.2, sprint4S: 4.2, sprint5S: 4.4, sprint6S: 4.4 })
    expect(all.meanSprintTimeS).toBe(4.2)
    expect(all.rsaDecrementPercent).toBe(5)
    expect(run({ sprint1S: 4, sprint2S: 4.1 }), 'ohne alle sechs keine Kennzahl').toEqual({})
  })

  test('die Adduktorenkraft wertet die schwächere Seite und nennt die Asymmetrie', () => {
    for (const slug of ['eccentric_adductor_strength', 'isometric_adduction_single_leg']) {
      const t = TEST_CATALOG.find((x) => x.slug === slug)!
      const out: Record<string, number> = {}
      t.derive?.({ forceLeftN: 200, forceRightN: 250 }, { bodyWeightKg: null, ageYears: 24, sex: 'male' }, (k, v) => {
        if (v != null) out[k] = v
      }, t)
      expect(out.peakForceN, slug).toBe(200)
      expect(out.asymmetryPercent, slug).toBe(20)
      expect(t.setting, slug).toBe('lab')
      expect(t.deviceBound, slug).toBe('critical')
    }
  })

  test('Fußball ist eine Disziplin; seine Testbibliothek-Tests sind nur Ergänzungen', () => {
    const d = disciplineById('football')!
    expect(d).toBeTruthy()
    const added = d.tests.filter((t) => t.provenance === 'addition')
    expect(added.map((t) => t.slug)).toEqual(
      expect.arrayContaining(['yo_yo_ir1', 'repeated_sprint_ability', 'eccentric_adductor_strength', 'isometric_adduction_single_leg']),
    )
    for (const t of added) expect(t.role).toBe('optional')
  })

  test('Welle 5: Gesundheitsmarker mit Einwilligungspflicht bekommen keine Eingabe', () => {
    // CK bleibt ausgesetzt; Troponin gibt es gar nicht. Eine Vorschrift dafür würde
    // eine Erhebung anleiten, die die App nicht entgegennehmen darf.
    expect(Object.keys(OBSERVATION_PROCEDURES)).not.toContain('ck_u_l')
    const ck = OBSERVATIONS.find((o) => o.key === 'ck_u_l')
    expect(ck?.retired).toBe('art9')
    expect(OBSERVATIONS.some((o) => /tropon|ctn/i.test(o.key))).toBe(false)
  })

  test('Zugleinen-Schwimmen, Isometrik, IMTP und F-v-Profil sind Laborwerte und nie Pflicht', () => {
    for (const slug of ['tethered_swim_30s', 'whole_body_isometric_force', 'fv_profile_ergometer', 'isometric_mid_thigh_pull']) {
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
    // Das Bild trägt eine Beschreibung mit dem Namen des Tests.
    await expect(page.getByRole('img', { name: /Illustration zum Test: Judogi-Klimmzug/ })).toBeVisible()
    // Die Vorschrift erklärt sich selbst: keine «allgemein»-Kennzeichnung.
    await expect(page.getByText('allgemein', { exact: true })).toHaveCount(0)
  })

  test('ein vorhandener Test bekommt die neuen Abschnitte, ohne die alten zu verlieren', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/sprint_10m/details', { waitUntil: 'domcontentloaded' })

    // Aus dem Dokument neu:
    await expect(page.getByText('Ziel', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Illustration zum Test: / })).toBeVisible()
    // Vorhanden geblieben:
    for (const label of ['Versuche und Pausen', 'Wann ein Versuch zählt', 'Was gleich bleiben muss']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test('Welle 2: ein neuer Triathlon-Test zeigt sein Bild', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/triathlon_sprint_time/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Durchführung Schritt für Schritt', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Illustration zum Test: Sprint-Triathlon/ })).toBeVisible()
  })

  test('Welle 3: der Yo-Yo-Test zeigt sein Bild', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/yo_yo_ir1/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Durchführung Schritt für Schritt', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Illustration zum Test: Yo-Yo/ })).toBeVisible()
  })

  test('Welle 4: HYROX zeigt die acht Abschnitte, der 3RM-Test hat keine Referenz erfunden', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/hyrox_simulation/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('img', { name: /Illustration zum Test: HYROX/ })).toBeVisible()
    await page.goto('/tests/deadlift_3rm_aft/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Durchführung Schritt für Schritt', { exact: true })).toBeVisible()
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
