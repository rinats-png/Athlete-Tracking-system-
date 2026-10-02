import { parseCsv, type CsvTable } from '@/lib/csvImport'

/**
 * Aktivitäten aus Strava-, Garmin- oder anderen Exporten einlesen
 * (docs/laeufe.md, Stufe 1). Rein: kein Speicher, keine Oberfläche, kein Netz.
 *
 * NICHTS WIRD GERATEN. Fehlt ein Wert (Kraft ohne Puls, Rolle ohne Strecke),
 * bleibt er `null` — nie null im Sinn von «0». Die Spalten werden über ihre
 * Namen in Deutsch und Englisch erkannt, bei doppelten Namen (Strava führt
 * «Distance», «Elapsed Time» und «Max Heart Rate» zweimal) entscheidet die
 * Grössenordnung der Werte.
 *
 * ZEIT: Strava schreibt UTC, Garmin die Ortszeit des Geräts. Beides wird mit
 * der gewählten Zeitzone in einen echten Zeitpunkt (UTC) und in Tag und Stunde
 * der Ortszeit gerechnet, damit Tagesgrenzen und Startuhrzeiten stimmen.
 */

export const ACTIVITY_IMPORT_VERSION = '1.0.0'

export type ActivitySport = 'run' | 'trail' | 'bike' | 'strength' | 'hike' | 'swim' | 'other'
export type ActivitySource = 'strava' | 'garmin' | 'other'

export interface ParsedActivity {
  id: string
  source: ActivitySource
  /** Zeitpunkt des Starts, UTC, ISO. */
  startedAt: string
  /** Tag der Ortszeit, JJJJ-MM-TT. */
  day: string
  /** Startstunde der Ortszeit, 0–23. */
  hour: number
  sport: ActivitySport
  name: string
  distanceM: number | null
  /** Bewegungszeit in Sekunden. Fehlt sie, bleibt das Feld leer — die Gesamtzeit steht daneben. */
  movingS: number | null
  elapsedS: number | null
  avgHr: number | null
  maxHr: number | null
  elevM: number | null
  gear: string | null
  calories: number | null
  /** Schritte je Minute (beide Füsse). Strava zählt bei Läufen einen Fuss: Werte unter 120 werden verdoppelt. */
  cadence: number | null
}

export type ColumnRoleKey = 'date' | 'type' | 'name' | 'distance' | 'moving' | 'elapsed' | 'avgHr' | 'maxHr' | 'elev' | 'gear' | 'calories' | 'cadence'

export interface ImportReport {
  source: ActivitySource
  timeZone: string
  activities: ParsedActivity[]
  /** Zeilen ohne lesbares Datum. */
  skipped: number
  /** Welche Spalte (Name, Stelle) wofür genommen wurde. */
  columns: { role: ColumnRoleKey; header: string; index: number; note?: string }[]
  firstDay: string | null
  lastDay: string | null
  countsBySport: Record<ActivitySport, number>
  /** Einheiten ohne Puls — dafür muss die Belastung später geschätzt werden. */
  withoutHr: number
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-zäöüß0-9]/g, '')

const ROLE_NAMES: Record<ColumnRoleKey, string[]> = {
  date: ['activitydate', 'datum', 'date', 'starttime', 'startzeit', 'startdatum', 'begin'],
  type: ['activitytype', 'aktivitätstyp', 'aktivitaetstyp', 'type', 'typ', 'sporttype', 'sport'],
  name: ['activityname', 'titel', 'title', 'name', 'bezeichnung'],
  distance: ['distance', 'distanz', 'strecke', 'distancekm'],
  moving: ['movingtime', 'bewegungszeit', 'movingduration'],
  elapsed: ['elapsedtime', 'zeit', 'time', 'dauer', 'duration', 'gesamtzeit', 'verstricheneszeit'],
  avgHr: ['averageheartrate', 'avgheartrate', 'avghr', 'durchschnittlichepuls', 'durchschnittlicheherzfrequenz', 'durchschnittspuls', 'ø herzfrequenz', 'herzfrequenzdurchschnitt', 'avgpuls', 'averagehr'],
  maxHr: ['maxheartrate', 'maximumheartrate', 'maxhr', 'maximaleherzfrequenz', 'maxherzfrequenz', 'maxpuls', 'maximalpuls'],
  elev: ['elevationgain', 'gesamtanstieg', 'anstieg', 'höhenmeter', 'hoehenmeter', 'elevation', 'totalascent', 'aufstieg'],
  gear: ['activitygear', 'gear', 'ausrüstung', 'ausruestung', 'equipment', 'schuhe', 'shoes'],
  calories: ['calories', 'kalorien', 'kcal', 'caloriesburned'],
  cadence: ['averagecadence', 'avgcadence', 'durchschnittlichekadenz', 'ø kadenz', 'avgrunningcadence', 'durchschnittlichelaufkadenz'],
}

/** Zahl in deutscher oder englischer Schreibweise. Das letzte Trennzeichen ist das Dezimalzeichen. */
export function readNumber(raw: string | undefined): number | null {
  if (raw == null) return null
  const text = raw.trim().replace(/\s/g, '').replace(/[^\d.,\-−]/g, '').replace('−', '-')
  if (text === '' || text === '-' || text === '--') return null
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  let s: string
  if (lastComma >= 0 && lastDot >= 0) s = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  else if (lastComma >= 0) s = /^-?\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.')
  else s = text
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Dauer als Sekunden: «00:48:12», «48:12» oder eine Zahl in Sekunden. */
export function readDuration(raw: string | undefined): number | null {
  if (raw == null) return null
  const t = raw.trim()
  if (t === '' || t === '--') return null
  if (t.includes(':')) {
    const parts = t.split(':').map((p) => readNumber(p))
    if (parts.some((p) => p == null)) return null
    const nums = parts as number[]
    return nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums.length === 2 ? nums[0] * 60 + nums[1] : null
  }
  return readNumber(t)
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, mär: 3, mrz: 3, mai: 5, okt: 10, dez: 12 }

interface Wall {
  y: number
  mo: number
  d: number
  h: number
  mi: number
  s: number
}

/** Datum und Uhrzeit aus Text: «2026-09-27 06:02:11», «27.09.2026 06:02», «Sep 27, 2026, 6:02:11 AM». */
export function readWallTime(raw: string | undefined): Wall | null {
  if (!raw) return null
  const t = raw.trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2})?:?(\d{2})?:?(\d{2})?/.exec(t)
  if (m) return { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] ?? 0), mi: +(m[5] ?? 0), s: +(m[6] ?? 0) }
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})[ ,]*(\d{1,2})?:?(\d{2})?:?(\d{2})?/.exec(t)
  if (m) return { y: +m[3], mo: +m[2], d: +m[1], h: +(m[4] ?? 0), mi: +(m[5] ?? 0), s: +(m[6] ?? 0) }
  m = /^([A-Za-zäöü]{3})[a-z.]*\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?/.exec(t)
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()]
    if (!mo) return null
    let h = +m[4]
    if (m[7]) {
      const pm = m[7].toLowerCase() === 'pm'
      if (pm && h < 12) h += 12
      if (!pm && h === 12) h = 0
    }
    return { y: +m[3], mo, d: +m[2], h, mi: +m[5], s: +(m[6] ?? 0) }
  }
  return null
}

function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs))
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'))
  return Math.round((asUtc - utcMs) / 60000)
}

/** Ortszeit in der Zone → UTC-Millisekunden (zwei Durchläufe fangen die Zeitumstellung ab). */
export function localToUtc(w: Wall, timeZone: string): number {
  const naive = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s)
  let guess = naive - offsetMinutes(naive, timeZone) * 60000
  guess = naive - offsetMinutes(guess, timeZone) * 60000
  return guess
}

/** Tag und Stunde der Ortszeit zu einem UTC-Zeitpunkt. */
export function localParts(utcMs: number, timeZone: string): { day: string; hour: number } {
  const o = offsetMinutes(utcMs, timeZone)
  const d = new Date(utcMs + o * 60000)
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() }
}

export function classifySport(typeRaw: string): ActivitySport {
  const t = typeRaw.toLowerCase()
  if (/trail|berglauf|mountain ?run|bergab/.test(t)) return 'trail'
  if (/run|lauf|jog|treadmill|laufband/.test(t)) return 'run'
  if (/ride|bike|cycl|rad|rolle|spinning|velomobile|ebike|e-bike/.test(t)) return 'bike'
  if (/weight|strength|kraft|workout|crossfit|gym|hiit|functional/.test(t)) return 'strength'
  if (/hik|wander|bergwander/.test(t)) return 'hike'
  if (/swim|schwimm/.test(t)) return 'swim'
  return 'other'
}

function detectSource(headers: string[]): ActivitySource {
  const h = headers.map(norm)
  if (h.includes('activitydate') && h.includes('activityid')) return 'strava'
  if (h.includes('aktivitätstyp') || h.includes('aktivitaetstyp') || (h.includes('activitytype') && h.includes('title'))) return 'garmin'
  if (h.includes('activitydate')) return 'strava'
  return 'other'
}

function findColumns(headers: string[]): Record<ColumnRoleKey, number[]> {
  const out = {} as Record<ColumnRoleKey, number[]>
  const keys = headers.map(norm)
  for (const role of Object.keys(ROLE_NAMES) as ColumnRoleKey[]) {
    const names = ROLE_NAMES[role].map(norm)
    out[role] = keys.map((k, i) => (names.includes(k) ? i : -1)).filter((i) => i >= 0)
  }
  return out
}

const median = (a: number[]): number | null => {
  if (a.length === 0) return null
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function makeId(source: string, startedAt: string, sport: string, distanceM: number | null): string {
  return `${source}:${startedAt}:${sport}:${Math.round(distanceM ?? 0)}`
}

/**
 * Eine Aktivitätenliste einlesen.
 * `timeZone` ist die Zone, in der Tage und Startstunden gezählt werden.
 */
export function parseActivityExport(text: string, timeZone: string): ImportReport | null {
  const table: CsvTable | null = parseCsv(text)
  if (!table) return null
  const source = detectSource(table.headers)
  const cols = findColumns(table.headers)
  if (cols.date.length === 0) return null

  const cell = (row: string[], i: number | undefined) => (i == null ? undefined : row[i])
  const firstOf = (role: ColumnRoleKey) => cols[role][0]

  // Strecke: bei zwei Spalten die mit den grösseren Werten (Strava: zuerst km, dann m).
  const distIdx = (() => {
    const list = cols.distance
    if (list.length === 0) return { idx: undefined as number | undefined, factor: 1000 }
    const meds = list.map((i) => median(table.rows.map((r) => readNumber(r[i])).filter((v): v is number => v != null && v > 0)) ?? 0)
    const best = meds.indexOf(Math.max(...meds))
    const idx = list[best]
    // Grössenordnung: ein Median über 500 sind Meter (eine Aktivität von einem halben Kilometer ist kein Median).
    const header = norm(table.headers[idx])
    const factor = list.length > 1 ? (meds[best] > 500 ? 1 : 1000) : header.endsWith('km') || meds[best] <= 500 ? 1000 : 1
    return { idx, factor }
  })()

  const colSeq = (role: ColumnRoleKey) => cols[role]
  const used: ImportReport['columns'] = []
  const note = (role: ColumnRoleKey, index: number | undefined, extra?: string) => {
    if (index != null) used.push({ role, header: table.headers[index], index, note: extra })
  }
  note('date', firstOf('date'), source === 'strava' ? 'UTC' : 'Ortszeit')
  note('type', firstOf('type'))
  note('name', firstOf('name'))
  note('distance', distIdx.idx, distIdx.factor === 1 ? 'm' : 'km')
  note('moving', firstOf('moving'))
  note('elapsed', firstOf('elapsed'))
  note('avgHr', firstOf('avgHr'))
  note('maxHr', firstOf('maxHr'))
  note('elev', firstOf('elev'))
  note('gear', firstOf('gear'))
  note('calories', firstOf('calories'))
  note('cadence', firstOf('cadence'))

  const firstValue = (row: string[], role: ColumnRoleKey, read: (r: string | undefined) => number | null): number | null => {
    for (const i of colSeq(role)) {
      const v = read(row[i])
      if (v != null) return v
    }
    return null
  }

  const out = new Map<string, ParsedActivity>()
  let skipped = 0
  for (const row of table.rows) {
    const wall = readWallTime(cell(row, firstOf('date')))
    if (!wall) {
      skipped++
      continue
    }
    const utc = source === 'strava' ? Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s) : localToUtc(wall, timeZone)
    const { day, hour } = localParts(utc, timeZone)
    const sport = classifySport(cell(row, firstOf('type')) ?? '')
    const dist = distIdx.idx == null ? null : readNumber(row[distIdx.idx])
    const distanceM = dist != null && dist > 0 ? Math.round(dist * distIdx.factor) : null
    let hr = firstValue(row, 'avgHr', readNumber)
    if (hr != null && (hr < 30 || hr > 230)) hr = null
    let maxHr = firstValue(row, 'maxHr', readNumber)
    if (maxHr != null && (maxHr < 60 || maxHr > 230)) maxHr = null
    let cadence = firstValue(row, 'cadence', readNumber)
    if (cadence != null && cadence > 0 && (sport === 'run' || sport === 'trail') && cadence < 120) cadence *= 2
    const startedAt = new Date(utc).toISOString()
    const elapsed = firstValue(row, 'elapsed', readDuration)
    const moving = firstValue(row, 'moving', readDuration)
    const a: ParsedActivity = {
      id: makeId(source, startedAt, sport, distanceM),
      source,
      startedAt,
      day,
      hour,
      sport,
      name: (cell(row, firstOf('name')) ?? '').slice(0, 120),
      distanceM,
      movingS: moving != null && moving > 0 ? Math.round(moving) : null,
      elapsedS: elapsed != null && elapsed > 0 ? Math.round(elapsed) : null,
      avgHr: hr != null ? Math.round(hr) : null,
      maxHr: maxHr != null ? Math.round(maxHr) : null,
      elevM: firstValue(row, 'elev', readNumber),
      gear: (cell(row, firstOf('gear')) ?? '').trim().slice(0, 80) || null,
      calories: firstValue(row, 'calories', readNumber),
      cadence: cadence != null && cadence > 0 ? Math.round(cadence) : null,
    }
    out.set(a.id, a)
  }
  const activities = [...out.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const countsBySport: Record<ActivitySport, number> = { run: 0, trail: 0, bike: 0, strength: 0, hike: 0, swim: 0, other: 0 }
  for (const a of activities) countsBySport[a.sport]++
  return {
    source,
    timeZone,
    activities,
    skipped,
    columns: used,
    firstDay: activities[0]?.day ?? null,
    lastDay: activities[activities.length - 1]?.day ?? null,
    countsBySport,
    withoutHr: activities.filter((a) => a.avgHr == null).length,
  }
}

/** Die Zeitzone dieses Geräts, sonst Berlin. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'
  } catch {
    return 'Europe/Berlin'
  }
}
