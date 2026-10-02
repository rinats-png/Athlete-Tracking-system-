import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { classifySport, localParts, localToUtc, parseActivityExport, readDuration, readNumber, readWallTime } from '../src/domain/activityImport'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/** Läufe, Stufe 1: Import von Strava- und Garmin-Listen. Nichts wird geraten. */

const BERLIN = 'Europe/Berlin'

// Strava: «Distance», «Elapsed Time», «Max Heart Rate» stehen doppelt (erst km, dann m).
const STRAVA = [
  'Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Max Heart Rate,Activity Gear,Elapsed Time,Moving Time,Distance,Elevation Gain,Max Heart Rate,Average Heart Rate,Average Cadence,Calories',
  '1,"Sep 27, 2026, 6:02:11 AM",Morgenlauf,Run,3000,10.5,171,Pegasus,3000,2900,10500.0,85.0,171,148,86,720',
  '2,"Sep 28, 2026, 5:30:00 PM",Krafttraining,Weight Training,3600,,,,3600,3500,0.0,,,,,300',
  '3,"Oct 1, 2026, 11:59:00 PM",Berglauf,Trail Run,5400,12.0,160,,5400,5300,12000.0,640.0,160,152,80,900',
  '4,"Oct 2, 2026, 7:00:00 AM",Rolle,Virtual Ride,3000,25.0,150,,3000,2950,25000.0,100.0,150,130,,500',
].join('\n')

const GARMIN = [
  'Aktivitätstyp;Datum;Titel;Distanz;Kalorien;Zeit;Ø Herzfrequenz;Max. Herzfrequenz;Gesamtanstieg',
  'Laufen;2026-09-27 08:02:11;Dauerlauf;10,50;720;00:48:12;148;171;85',
  'Laufband;2026-09-29 18:00:00;Laufband locker;8,00;550;00:44:00;--;--;--',
  'Radfahren;2026-09-30 17:00:00;Rolle;"25,0";500;01:10:00;130;150;--',
].join('\n')

test.describe('Zahlen, Zeiten, Sportarten', () => {
  test('Zahlen in deutscher und englischer Schreibweise; Fehlendes bleibt null', () => {
    expect(readNumber('10,5')).toBe(10.5)
    expect(readNumber('1.234,5')).toBe(1234.5)
    expect(readNumber('1,234.5')).toBe(1234.5)
    expect(readNumber('1,234')).toBe(1234)
    expect(readNumber('--')).toBeNull()
    expect(readNumber('')).toBeNull()
    expect(readDuration('00:48:12')).toBe(2892)
    expect(readDuration('48:12')).toBe(2892)
    expect(readDuration('2900')).toBe(2900)
  })
  test('Datumsformate: Strava englisch (UTC), Garmin ISO, deutsch', () => {
    expect(readWallTime('Sep 27, 2026, 6:02:11 AM')).toEqual({ y: 2026, mo: 9, d: 27, h: 6, mi: 2, s: 11 })
    expect(readWallTime('Sep 27, 2026, 12:05:00 PM')?.h).toBe(12)
    expect(readWallTime('Sep 27, 2026, 12:05:00 AM')?.h).toBe(0)
    expect(readWallTime('27.09.2026 08:02')).toEqual({ y: 2026, mo: 9, d: 27, h: 8, mi: 2, s: 0 })
    expect(readWallTime('kein Datum')).toBeNull()
  })
  test('Zeitzone: Sommer- und Winterzeit, Tagesgrenze', () => {
    // 6:02 UTC im Sommer = 8:02 Berlin; im Winter = 7:02.
    expect(localParts(Date.UTC(2026, 8, 27, 6, 2), BERLIN)).toEqual({ day: '2026-09-27', hour: 8 })
    expect(localParts(Date.UTC(2026, 0, 15, 6, 2), BERLIN)).toEqual({ day: '2026-01-15', hour: 7 })
    expect(localParts(Date.UTC(2026, 9, 1, 23, 59), BERLIN)).toEqual({ day: '2026-10-02', hour: 1 })
    // Ortszeit → UTC und zurück
    const utc = localToUtc({ y: 2026, mo: 9, d: 27, h: 8, mi: 2, s: 11 }, BERLIN)
    expect(new Date(utc).toISOString()).toBe('2026-09-27T06:02:11.000Z')
  })
  test('Sportarten, auch auf Deutsch; Trail ist nicht Lauf', () => {
    for (const [t, s] of [['Run', 'run'], ['Laufen', 'run'], ['Laufband', 'run'], ['Trail Run', 'trail'], ['Berglauf', 'trail'], ['Virtual Ride', 'bike'], ['Rolle', 'bike'], ['Weight Training', 'strength'], ['Hike', 'hike'], ['Swim', 'swim'], ['Yoga', 'other']] as const) expect(classifySport(t), t).toBe(s)
  })
})

test.describe('Strava', () => {
  const r = parseActivityExport(STRAVA, BERLIN)!
  test('Quelle, Zeitraum, Einheiten je Sportart', () => {
    expect(r.source).toBe('strava')
    expect(r.activities).toHaveLength(4)
    expect(r.countsBySport).toMatchObject({ run: 1, trail: 1, bike: 1, strength: 1 })
    expect(r.firstDay).toBe('2026-09-27')
    expect(r.lastDay).toBe('2026-10-02')
  })
  test('Strecke in Metern aus der zweiten Spalte, Bewegungszeit, Puls, Höhe', () => {
    const run = r.activities[0]
    expect(run.distanceM).toBe(10500)
    expect(run.movingS).toBe(2900)
    expect(run.elapsedS).toBe(3000)
    expect(run.avgHr).toBe(148)
    expect(run.maxHr).toBe(171)
    expect(run.elevM).toBe(85)
    expect(run.gear).toBe('Pegasus')
  })
  test('UTC wird in Ortszeit gerechnet, auch über die Tagesgrenze', () => {
    expect(r.activities[0]).toMatchObject({ day: '2026-09-27', hour: 8 })
    const trail = r.activities.find((a) => a.sport === 'trail')!
    expect(trail).toMatchObject({ day: '2026-10-02', hour: 1 })
  })
  test('Kadenz unter 120 bei Läufen wird verdoppelt, bei Rad nicht', () => {
    expect(r.activities[0].cadence).toBe(172)
    expect(r.activities.find((a) => a.sport === 'bike')!.cadence).toBeNull()
  })
  test('Fehlend heisst null, nicht 0', () => {
    const kraft = r.activities.find((a) => a.sport === 'strength')!
    expect(kraft.avgHr).toBeNull()
    expect(kraft.distanceM).toBeNull()
    expect(r.withoutHr).toBe(1)
  })
})

test.describe('Garmin deutsch', () => {
  const r = parseActivityExport(GARMIN, BERLIN)!
  test('Komma, Semikolon, hh:mm:ss, Ortszeit', () => {
    expect(r.source).toBe('garmin')
    expect(r.activities).toHaveLength(3)
    const run = r.activities[0]
    expect(run).toMatchObject({ sport: 'run', distanceM: 10500, elapsedS: 2892, avgHr: 148, maxHr: 171, elevM: 85, day: '2026-09-27', hour: 8 })
    expect(run.movingS).toBeNull() // Garmin nennt keine Bewegungszeit — nicht aus der Gesamtzeit erfunden
  })
  test('«--» ist fehlend', () => {
    const band = r.activities.find((a) => a.name === 'Laufband locker')!
    expect(band.avgHr).toBeNull()
    expect(band.elevM).toBeNull()
    expect(band.sport).toBe('run')
  })
})

test.describe('Grenzfälle', () => {
  test('doppelte Zeilen ergeben eine Einheit; unlesbare Daten werden gezählt', () => {
    const twice = STRAVA + '\n' + STRAVA.split('\n')[1] + '\n5,kein Datum,Test,Run,1,1,1,,1,1,1,1,1,1,1,1'
    const r = parseActivityExport(twice, BERLIN)!
    expect(r.activities).toHaveLength(4)
    expect(r.skipped).toBe(1)
  })
  test('Datei ohne Datumsspalte oder ohne Zeilen wird abgelehnt, nicht geraten', () => {
    expect(parseActivityExport('a,b\n1,2', BERLIN)).toBeNull()
    expect(parseActivityExport('', BERLIN)).toBeNull()
  })
  test('unmöglicher Puls wird ignoriert', () => {
    const r = parseActivityExport('Aktivitätstyp;Datum;Zeit;Ø Herzfrequenz;Max. Herzfrequenz\nLaufen;2026-09-27 08:00:00;00:30:00;300;260', BERLIN)!
    expect(r.activities[0].avgHr).toBeNull()
    expect(r.activities[0].maxHr).toBeNull()
  })
})

test('Schema 29: ein Bestand der Version 28 bekommt leere Aktivitäten', () => {
  const old = { ...emptyData(), version: 28 } as any
  delete old.athletes[0].activities
  const { data, report } = parseStoredData(old)
  expect(report.migratedFrom).toBe(28)
  expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
  expect(data?.athletes[0].activities).toEqual([])
})

test('Bildschirm: Datei wählen, Vorschau, Übernehmen, nichts doppelt, Löschen', async ({ page }) => {
  await openDemo(page)
  await page.goto('/analyse/laeufe', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Läufe')
  await page.getByTestId('runs-file').setInputFiles({ name: 'activities.csv', mimeType: 'text/csv', buffer: Buffer.from(STRAVA, 'utf-8') })
  await expect(page.getByTestId('runs-source')).toContainText('Strava')
  await expect(page.getByTestId('runs-period')).toContainText('4 Einheiten')
  await expect(page.getByTestId('runs-sports')).toContainText('1 Lauf')
  await expect(page.getByTestId('runs-columns')).toContainText('Strecke')
  await expect(page.getByTestId('runs-stored-sports')).toHaveCount(0)
  await page.getByTestId('runs-apply').click()
  await expect(page.getByTestId('runs-added')).toContainText('4 neue Einheiten')
  await expect(page.getByTestId('runs-stored-sports')).toContainText('1 Trail')
  // dieselbe Datei noch einmal: nichts Neues
  await page.getByTestId('runs-file').setInputFiles({ name: 'activities.csv', mimeType: 'text/csv', buffer: Buffer.from(STRAVA, 'utf-8') })
  await page.getByTestId('runs-apply').click()
  await expect(page.getByTestId('runs-added')).toContainText('Nichts Neues')
  await page.getByTestId('runs-clear').click()
  await page.getByTestId('runs-clear-confirm').click()
  await expect(page.getByTestId('runs-stored-sports')).toHaveCount(0)
})

test('Bildschirm: unlesbare Datei wird benannt', async ({ page }) => {
  await openDemo(page)
  await page.goto('/analyse/laeufe', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('runs-file').setInputFiles({ name: 'x.csv', mimeType: 'text/csv', buffer: Buffer.from('foo,bar\n1,2', 'utf-8') })
  await expect(page.getByTestId('runs-error')).toBeVisible()
})

test('Reiter in der Analyse führen hin und zurück', async ({ page }) => {
  await openDemo(page)
  await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Läufe' }).click()
  await expect(page).toHaveURL(/\/analyse\/laeufe$/)
  await page.getByRole('radio', { name: 'Profil' }).click()
  await expect(page).toHaveURL(/\/analyse$/)
})
