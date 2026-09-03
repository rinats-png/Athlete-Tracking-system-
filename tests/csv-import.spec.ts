import { expect, test } from '@playwright/test'
import {
  parseCsv,
  parseDay,
  parseNumber,
  previewImport,
  suggestRoles,
  type ColumnRole,
} from '../src/lib/csvImport'
import { openGuest } from './helpers'

/**
 * Werte aus einer Tabelle übernehmen.
 *
 * Der gefährliche Fehler ist hier nicht ein abgelehnter Import, sondern ein
 * stillschweigend falscher: eine verschobene Spalte erzeugt eine Historie,
 * die aussieht wie Daten und keine ist — und das fällt erst Monate später
 * auf. Deshalb prüfen diese Fälle vor allem, was NICHT übernommen wird.
 */

test.describe('Tabelle lesen', () => {
  test('Semikolon, Komma und Tabulator werden erkannt', () => {
    for (const d of [';', ',', '\t']) {
      const table = parseCsv(`Datum${d}Griffkraft\n2026-01-05${d}48`)
      expect(table, `Trennzeichen ${JSON.stringify(d)}`).not.toBeNull()
      expect(table!.headers).toEqual(['Datum', 'Griffkraft'])
      expect(table!.delimiter).toBe(d)
    }
  })

  test('Anführungszeichen halten ein Trennzeichen im Feld zusammen', () => {
    const table = parseCsv('Datum;Notiz\n2026-01-05;"Halle, kalt"')!
    expect(table.rows[0]).toEqual(['2026-01-05', 'Halle, kalt'])
  })

  test('der Byte-Order-Mark aus Excel verstellt nicht die erste Spalte', () => {
    const table = parseCsv('﻿Datum;Griffkraft\n2026-01-05;48')!
    expect(table.headers[0], 'sonst hiesse die Spalte «﻿Datum» und würde nie zugeordnet').toBe(
      'Datum',
    )
  })

  test('eine Datei ohne Datenzeile ist keine Tabelle', () => {
    expect(parseCsv('Datum;Griffkraft')).toBeNull()
    expect(parseCsv('')).toBeNull()
  })

  test('Zahlen in deutscher und englischer Schreibweise', () => {
    expect(parseNumber('12,5')).toBe(12.5)
    expect(parseNumber('12.5')).toBe(12.5)
    expect(parseNumber('1.234,5')).toBe(1234.5)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('k. A.')).toBeNull()
  })

  test('Datumsangaben werden gelesen oder abgelehnt, nicht geraten', () => {
    expect(parseDay('2026-01-05')).toBe('2026-01-05')
    expect(parseDay('5.1.2026')).toBe('2026-01-05')
    expect(parseDay('05.01.2026')).toBe('2026-01-05')
    expect(parseDay('Januar 2026'), 'lieber nichts als ein erfundener Tag').toBeNull()
    expect(parseDay('01/05/2026'), 'Monat oder Tag zuerst? unentscheidbar').toBeNull()
  })
})

test.describe('Zuordnung und Vorschau', () => {
  test('Spalten werden vorgeschlagen, nicht festgelegt', () => {
    const roles = suggestRoles(['Datum', 'Griffkraft', 'Irgendwas'])
    expect(roles[0]).toEqual({ kind: 'date' })
    expect(roles[1]).toEqual({ kind: 'test', slug: 'grip_strength' })
    expect(roles[2], 'was nicht erkannt wird, wird nicht geraten').toEqual({ kind: 'ignore' })
  })

  test('ohne Datumsspalte wird nichts übernommen', () => {
    const table = parseCsv('Athlet;Griffkraft\nMara;48')!
    const preview = previewImport(table, [
      { kind: 'ignore' },
      { kind: 'test', slug: 'grip_strength' },
    ])
    expect(preview.rows, 'ein Messwert ohne Zeitpunkt hat keinen Verlauf').toHaveLength(0)
    expect(preview.skipped[0].reason).toBe('no_date')
  })

  test('eine einspaltige Datei ist keine Tabelle', () => {
    expect(parseCsv('Griffkraft\n48')).toBeNull()
  })

  test('eine Zeile ohne lesbare Zahl bleibt liegen und wird benannt', () => {
    const table = parseCsv('Datum;Griffkraft\n2026-01-05;48\n2026-02-05;k. A.')!
    const roles: ColumnRole[] = [{ kind: 'date' }, { kind: 'test', slug: 'grip_strength' }]
    const preview = previewImport(table, roles)
    expect(preview.rows).toHaveLength(1)
    expect(preview.skipped).toEqual([{ line: 2, reason: 'no_value' }])
  })

  test('eine ignorierte Spalte kommt nicht in den Bestand', () => {
    const table = parseCsv('Datum;Griffkraft;Gewicht\n2026-01-05;48;82')!
    const preview = previewImport(table, [
      { kind: 'date' },
      { kind: 'test', slug: 'grip_strength' },
      { kind: 'ignore' },
    ])
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0].value).toBe(48)
  })
})

test.describe('Import im Bildschirm', () => {
  test('Datei, Zuordnung, Vorschau — und erst dann geschrieben', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil/import', { waitUntil: 'domcontentloaded' })

    await page.setInputFiles('input[type="file"]', {
      name: 'werte.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Datum;Griffkraft\n05.01.2026;48\n05.02.2026;51\n', 'utf-8'),
    })

    await expect(page.getByText('2 Werte werden übernommen.')).toBeVisible()
    // Vor dem Klick darf nichts im Bestand stehen.
    expect(
      await page.evaluate(() => {
        const raw = localStorage.getItem('baseline.data.v1')
        return raw ? JSON.parse(raw).athletes[0].results.length : 0
      }),
      'die Vorschau darf nichts schreiben',
    ).toBe(0)

    await page.getByRole('button', { name: 'Werte übernehmen' }).click()
    await expect(page.getByText('2 Werte übernommen.')).toBeVisible()
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('baseline.data.v1')!).athletes[0].results.length,
      ),
    ).toBe(2)
  })
})
