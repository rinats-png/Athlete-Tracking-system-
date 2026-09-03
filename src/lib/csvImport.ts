import { TEST_CATALOG, getTest } from '@/data/testCatalog'

/**
 * Werte aus einer Tabelle übernehmen.
 *
 * WARUM DAS WICHTIGER IST, ALS ES AUSSIEHT: jeder Trainer, den diese App
 * gewinnen will, hat schon eine Tabelle mit Jahren an Messwerten. Solange er
 * die nicht mitbringen kann, ist der Wechsel «alles neu anfangen» — und dann
 * wechselt er nicht. Der Import senkt diese Hürde auf «einmal hochladen».
 *
 * WAS HIER NICHT PASSIERT: nichts wird geraten. Die Datei wird gelesen, die
 * Spalten werden VORGESCHLAGEN, und übernommen wird erst, was der Mensch
 * bestätigt hat. Eine falsch zugeordnete Spalte erzeugt sonst eine Historie,
 * die aussieht wie Daten und keine ist — und das fällt erst Monate später
 * auf, wenn niemand mehr weiss, woher die Zahlen kamen.
 *
 * Der Parser ist bewusst klein und ohne Bibliothek: Trennzeichen erkennen,
 * Anführungszeichen beachten, Zahlen in deutscher wie englischer Schreibweise
 * lesen. Mehr braucht eine Exporttabelle aus Excel nicht.
 */

export interface CsvTable {
  headers: string[]
  rows: string[][]
  /** Das erkannte Trennzeichen — wird angezeigt, damit ein Fehler auffällt. */
  delimiter: string
}

/** Erkennt das Trennzeichen an der Kopfzeile: Semikolon, Komma oder Tabulator. */
function detectDelimiter(firstLine: string): string {
  const counts = [';', ',', '\t'].map((d) => ({ d, n: firstLine.split(d).length - 1 }))
  const best = counts.sort((a, b) => b.n - a.n)[0]
  return best.n > 0 ? best.d : ';'
}

/** Eine Zeile in Felder zerlegen, mit Beachtung von "…" und doppelten "". */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      out.push(field.trim())
      field = ''
    } else field += c
  }
  out.push(field.trim())
  return out
}

export function parseCsv(text: string): CsvTable | null {
  // Byte-Order-Mark: Excel schreibt ihn, und ohne dieses Entfernen hiesse die
  // erste Spalte «﻿Datum» und würde nie zugeordnet.
  const clean = text.replace(/^﻿/, '')
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return null
  const delimiter = detectDelimiter(lines[0])
  const headers = splitLine(lines[0], delimiter)
  if (headers.length < 2) return null
  const rows = lines.slice(1).map((l) => splitLine(l, delimiter))
  return { headers, rows, delimiter }
}

/**
 * Eine Zahl aus einer Tabellenzelle.
 *
 * «12,5» und «12.5» sind beide gültig — deutsche und englische Schreibweise
 * kommen in denselben Exporten vor. Ein Tausenderpunkt in «1.234,5» wird
 * daran erkannt, dass ein Komma folgt.
 */
export function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '')
  if (text === '') return null
  const normalised = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text
  const value = Number(normalised)
  return Number.isFinite(value) ? value : null
}

/**
 * Ein Datum aus einer Tabellenzelle. Akzeptiert ISO und die im DACH-Raum
 * übliche Schreibweise mit Punkten; alles andere wird abgelehnt statt geraten.
 */
export function parseDay(raw: string): string | null {
  const text = raw.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text)
  if (dotted) {
    const [, d, m, y] = dotted
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export type ColumnRole = { kind: 'ignore' } | { kind: 'date' } | { kind: 'test'; slug: string }

/**
 * Vorschlag, welche Spalte was ist.
 *
 * Nur ein Vorschlag: der Mensch bestätigt. Erkannt wird über den Namen des
 * Tests und seine Kurzform in beiden Sprachen, sonst über den Slug.
 */
export function suggestRoles(headers: string[]): ColumnRole[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-zäöüß0-9]/g, '')
  const byName = new Map<string, string>()
  for (const test of TEST_CATALOG) {
    for (const label of [test.slug, test.name.de, test.name.en, test.shortName.de, test.shortName.en]) {
      const key = norm(label)
      if (key && !byName.has(key)) byName.set(key, test.slug)
    }
  }

  let dateTaken = false
  return headers.map((header) => {
    const key = norm(header)
    if (!dateTaken && /^(datum|date|tag|day|messdatum|performedon)$/.test(key)) {
      dateTaken = true
      return { kind: 'date' as const }
    }
    const slug = byName.get(key)
    return slug ? { kind: 'test' as const, slug } : { kind: 'ignore' as const }
  })
}

export interface ImportRow {
  /** Zeilennummer in der Datei, 1-basiert ohne Kopfzeile — für die Meldung. */
  line: number
  day: string
  testSlug: string
  value: number
}

export interface CsvPreview {
  rows: ImportRow[]
  /** Zeilen, die nicht übernommen werden, mit Grund. */
  skipped: { line: number; reason: 'no_date' | 'no_value' | 'unknown_test' }[]
}

/**
 * Was aus der Tabelle würde, wenn man sie übernimmt.
 *
 * Die Vorschau ist der eigentliche Schutz: sie zeigt vor dem Schreiben, wie
 * viele Werte ankommen und was liegen bleibt. Ohne sie ist ein Import ein
 * Sprung ins Dunkle mit den eigenen Daten als Einsatz.
 */
export function previewImport(table: CsvTable, roles: ColumnRole[]): CsvPreview {
  const dateIndex = roles.findIndex((r) => r.kind === 'date')
  const rows: ImportRow[] = []
  const skipped: CsvPreview['skipped'] = []

  table.rows.forEach((cells, i) => {
    const line = i + 1
    const day = dateIndex >= 0 ? parseDay(cells[dateIndex] ?? '') : null
    if (!day) {
      skipped.push({ line, reason: 'no_date' })
      return
    }
    let taken = 0
    roles.forEach((role, column) => {
      if (role.kind !== 'test') return
      if (!getTest(role.slug)) {
        skipped.push({ line, reason: 'unknown_test' })
        return
      }
      const value = parseNumber(cells[column] ?? '')
      if (value == null) return
      rows.push({ line, day, testSlug: role.slug, value })
      taken++
    })
    if (taken === 0 && !skipped.some((s) => s.line === line)) {
      skipped.push({ line, reason: 'no_value' })
    }
  })

  return { rows, skipped }
}
