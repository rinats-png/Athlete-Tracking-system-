/**
 * Den Lebensmittelkern aus USDA FoodData Central erweitern.
 *
 * WARUM ES DIESES WERKZEUG GIBT (docs/lebensmitteldaten.md): 113 der 245
 * Kern-Eintraege tragen keine Mikronaehrstoffe. Der BLS waere fachlich die
 * bessere Quelle, ist aber kostenpflichtig und nicht weitergabefaehig;
 * USDA FoodData Central ist gemeinfrei und darf im Paket mitgeliefert
 * werden. Fuer Rohware sind die Werte gut, fuer verarbeitete Lebensmittel
 * nicht — deshalb kuratiert ein MENSCH, und dieses Werkzeug rechnet nur um.
 *
 * DIE DREI BETRIEBSARTEN:
 *
 *   --search "oats"     Eintraege suchen, um eine Zuordnung zu finden.
 *   --propose           Fuer jede Zeile in foodCore.queries.json die
 *                       aehnlichsten USDA-Eintraege vorschlagen.
 *   --build             Aus foodCore.curation.json src/data/foodsUsda.ts
 *                       erzeugen.
 *
 * DIE EINE REGEL, DIE DIESES SKRIPT SICHER MACHT: Es prueft jede
 * Naehrstoffkennung gegen Namen UND Einheit aus nutrient.csv und BRICHT AB,
 * wenn etwas nicht passt. Eine Kennung, die sich beim Herausgeber aendert,
 * darf nicht dazu fuehren, dass Magnesium in Mikrogramm im Bestand landet —
 * lieber kein Kern als ein falscher (§89).
 *
 * Daten: https://fdc.nal.usda.gov/download-datasets.html (CSV, Foundation
 * Foods oder SR Legacy). Erwartet werden food.csv, food_nutrient.csv und
 * nutrient.csv in einem Verzeichnis.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// --- CSV ---------------------------------------------------------------------
//
// Ein eigener Parser statt einer Abhaengigkeit: die Dateien sind gewoehnliches
// RFC-4180-CSV, und ein Bauwerkzeug soll ohne Installation laufen.

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let i = 0
  // Byte Order Mark, falls vorhanden.
  if (text.charCodeAt(0) === 0xfeff) i = 1
  for (; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
      continue
    }
    if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  if (rows.length === 0) return []
  const head = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, j) => [h, r[j] ?? ''])))
}

// --- Naehrstoffe -------------------------------------------------------------
//
// Jede Kennung steht mit dem Namen, den sie tragen MUSS, und der Einheit.
// `alt` sind gleichwertige Kennungen, aus denen die erste vorhandene gilt.
// `sum` addiert mehrere Kennungen (Omega-3 aus ALA, EPA, DHA, DPA).

export const NUTRIENTS = [
  { field: 'kcal', ids: [1008, 2048, 2047], unit: 'KCAL', name: 'energy', group: 'per100' },
  { field: 'protein', ids: [1003], unit: 'G', name: 'protein', group: 'per100' },
  { field: 'fat', ids: [1004], unit: 'G', name: 'total lipid', group: 'per100' },
  { field: 'carbs', ids: [1005], unit: 'G', name: 'carbohydrate', group: 'per100' },
  { field: 'fiber', ids: [1079], unit: 'G', name: 'fiber', group: 'per100' },
  { field: 'potassiumMg', ids: [1092], unit: 'MG', name: 'potassium', group: 'per100' },
  { field: 'sodiumMg', ids: [1093], unit: 'MG', name: 'sodium', group: 'per100' },
  { field: 'sugar', ids: [2000, 1063], unit: 'G', name: 'sugars', group: 'micro' },
  { field: 'saturatedFat', ids: [1258], unit: 'G', name: 'saturated', group: 'micro' },
  { field: 'calciumMg', ids: [1087], unit: 'MG', name: 'calcium', group: 'micro' },
  { field: 'magnesiumMg', ids: [1090], unit: 'MG', name: 'magnesium', group: 'micro' },
  { field: 'ironMg', ids: [1089], unit: 'MG', name: 'iron', group: 'micro' },
  { field: 'zincMg', ids: [1095], unit: 'MG', name: 'zinc', group: 'micro' },
  { field: 'vitaminCMg', ids: [1162], unit: 'MG', name: 'vitamin c', group: 'micro' },
  { field: 'vitaminDUg', ids: [1114], unit: 'UG', name: 'vitamin d', group: 'micro' },
  { field: 'vitaminB12Ug', ids: [1178], unit: 'UG', name: 'vitamin b-12', group: 'micro' },
  { field: 'omega3', sum: [1404, 1278, 1272, 1280], unit: 'G', name: 'n-3', group: 'micro' },
]

/**
 * Die Kennungen gegen nutrient.csv pruefen. Gibt die Zuordnung zurueck —
 * oder wirft, wenn ein Name oder eine Einheit nicht passt.
 */
export function buildNutrientIndex(nutrientRows) {
  const byId = new Map(nutrientRows.map((r) => [Number(r.id), { name: String(r.name).toLowerCase(), unit: String(r.unit_name).toUpperCase() }]))
  const index = {}
  const problems = []
  for (const spec of NUTRIENTS) {
    const ids = spec.sum ?? spec.ids
    const usable = []
    for (const id of ids) {
      const n = byId.get(id)
      if (!n) continue
      if (!n.name.includes(spec.name)) {
        problems.push(`Kennung ${id} heisst «${n.name}», erwartet wurde etwas mit «${spec.name}» (${spec.field})`)
        continue
      }
      if (n.unit !== spec.unit) {
        problems.push(`Kennung ${id} (${spec.field}) hat die Einheit ${n.unit}, erwartet ${spec.unit}`)
        continue
      }
      usable.push(id)
    }
    if (usable.length === 0) problems.push(`Fuer ${spec.field} ist keine brauchbare Kennung uebrig (geprueft: ${ids.join(', ')})`)
    index[spec.field] = { ids: usable, sum: Boolean(spec.sum), group: spec.group }
  }
  if (problems.length > 0) {
    throw new Error(`Naehrstoffkennungen passen nicht zu nutrient.csv:\n  ${problems.join('\n  ')}`)
  }
  return index
}

const round = (v, d) => Number(v.toFixed(d))

/**
 * Ein Lebensmittel aus den Mengen bauen. `amounts` ist Kennung → Menge je
 * 100 g. Gibt `null`, wenn schon die Makros fehlen; `micro` nur, wenn ALLE
 * zehn Mikronaehrstoffe belegt sind — eine halbe Angabe waere eine
 * unsichtbare Luecke (§89).
 */
export function mapFood(amounts, index) {
  const value = (field) => {
    const spec = index[field]
    if (!spec) return null
    if (spec.sum) {
      const present = spec.ids.filter((id) => amounts.has(id))
      if (present.length === 0) return null
      return present.reduce((s, id) => s + amounts.get(id), 0)
    }
    for (const id of spec.ids) if (amounts.has(id)) return amounts.get(id)
    return null
  }

  const per100 = {}
  for (const spec of NUTRIENTS.filter((s) => s.group === 'per100')) {
    const v = value(spec.field)
    if (v == null) return null
    per100[spec.field] = round(v, spec.unit === 'G' ? 1 : 0)
  }

  const micro = {}
  for (const spec of NUTRIENTS.filter((s) => s.group === 'micro')) {
    const v = value(spec.field)
    if (v == null) return { per100, micro: null }
    // Gramm mit ZWEI Stellen: Omega-3 liegt bei pflanzlichen Lebensmitteln
    // im Hundertstelbereich, und 0,05 auf 0,1 zu runden verdoppelt den Wert.
    micro[spec.field] = round(v, spec.unit === 'MG' ? 0 : spec.unit === 'UG' ? 1 : 2)
  }
  return { per100, micro }
}

// --- Suchen und Vorschlagen ---------------------------------------------------

export function fold(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Wie gut eine Beschreibung zu einem Suchbegriff passt. Grob, aber nachvollziehbar. */
export function scoreMatch(term, description) {
  const t = fold(term).split(' ').filter(Boolean)
  const d = fold(description)
  if (t.length === 0) return 0
  const words = new Set(d.split(' '))
  let hits = 0
  for (const w of t) if (words.has(w)) hits += 1
  if (hits === 0) return 0
  // Treffer zaehlen, kurze Beschreibungen bevorzugen: «Oats» schlaegt
  // «Cereals, oats, instant, fortified, with raisins».
  return hits / t.length - Math.min(0.4, d.split(' ').length / 100)
}

export function proposeFor(term, foods, limit = 5) {
  return foods
    .map((f) => ({ fdcId: Number(f.fdc_id), description: f.description, dataType: f.data_type, score: scoreMatch(term, f.description) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// --- Ausgabe ------------------------------------------------------------------

export function emitTs(entries) {
  const body = entries
    .map((e) => {
      const per = Object.entries(e.per100)
        .map(([k, v]) => `      ${k}: ${v},`)
        .join('\n')
      const micro = e.micro
        ? `\n    micro: {\n${Object.entries(e.micro)
            .map(([k, v]) => `      ${k}: ${v},`)
            .join('\n')}\n    },`
        : ''
      return `  {
    key: ${JSON.stringify(e.key)},
    name: ${JSON.stringify(e.name)},
    category: ${JSON.stringify(e.category)},
    source: "usda",
    sourceRef: ${JSON.stringify(`FDC ${e.fdcId}`)},
    sourceDate: ${JSON.stringify(e.publicationDate ?? '')},
    per100: {
${per}
    },${micro}
  },`
    })
    .join('\n')
  return `import type { CoreFood } from "@/data/foods";

/**
 * Lebensmittel aus USDA FoodData Central — gemeinfrei, mit Namensnennung.
 *
 * ERZEUGT von scripts/buildFoodCore.mjs aus scripts/foodCore.curation.json.
 * NICHT VON HAND PFLEGEN: die Kuratierungsliste aendern und neu erzeugen.
 * Jeder Eintrag ist von einem Menschen zugeordnet worden; das Werkzeug hat
 * nur umgerechnet (docs/lebensmitteldaten.md).
 *
 * Eintraege: ${entries.length}, davon mit Mikronaehrstoffen: ${entries.filter((e) => e.micro).length}.
 */
export const USDA_FOODS: CoreFood[] = [
${body}
];
`
}

// --- Befehlszeile --------------------------------------------------------------

function load(dir) {
  for (const f of ['food.csv', 'food_nutrient.csv', 'nutrient.csv']) {
    if (!existsSync(join(dir, f))) throw new Error(`${f} fehlt in ${dir}. Bulk-Download von fdc.nal.usda.gov entpacken.`)
  }
  const foods = parseCsv(readFileSync(join(dir, 'food.csv'), 'utf-8'))
  const nutrients = parseCsv(readFileSync(join(dir, 'nutrient.csv'), 'utf-8'))
  const index = buildNutrientIndex(nutrients)
  return { dir, foods, index }
}

/** Mengen je Lebensmittel, aber nur fuer die gewuenschten Kennungen. */
function amountsFor(dir, wantedFdcIds, index) {
  const wanted = new Set(wantedFdcIds)
  const keep = new Set(Object.values(index).flatMap((s) => s.ids))
  const out = new Map()
  const text = readFileSync(join(dir, 'food_nutrient.csv'), 'utf-8')
  for (const row of parseCsv(text)) {
    const fdcId = Number(row.fdc_id)
    if (!wanted.has(fdcId)) continue
    const nid = Number(row.nutrient_id)
    if (!keep.has(nid)) continue
    const amount = Number(row.amount)
    if (!Number.isFinite(amount)) continue
    if (!out.has(fdcId)) out.set(fdcId, new Map())
    out.get(fdcId).set(nid, amount)
  }
  return out
}

function main(argv) {
  const arg = (name, fallback = null) => {
    const i = argv.indexOf(name)
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
  }
  const dir = arg('--data', '/tmp/fdc')

  if (argv.includes('--search')) {
    const term = arg('--search')
    if (!term) throw new Error('--search braucht einen Begriff')
    const { foods } = load(dir)
    for (const c of proposeFor(term, foods, 15)) console.log(`${c.fdcId}\t${c.dataType}\t${c.description}`)
    return
  }

  if (argv.includes('--propose')) {
    const { foods } = load(dir)
    const queries = JSON.parse(readFileSync('scripts/foodCore.queries.json', 'utf-8'))
    const out = {}
    for (const [key, entry] of Object.entries(queries.entries)) {
      out[key] = { name: entry.name, query: entry.query, candidates: proposeFor(entry.query, foods) }
    }
    const path = arg('--out', 'scripts/foodCore.proposals.json')
    writeFileSync(path, JSON.stringify(out, null, 2) + '\n')
    const withHit = Object.values(out).filter((o) => o.candidates.length > 0).length
    console.log(`${withHit} von ${Object.keys(out).length} Begriffen haben Kandidaten. Geschrieben: ${path}`)
    console.log('Jetzt durchsehen und bestaetigte Zuordnungen nach scripts/foodCore.curation.json uebernehmen.')
    return
  }

  if (argv.includes('--build')) {
    const { foods, index } = load(dir)
    const curation = JSON.parse(readFileSync('scripts/foodCore.curation.json', 'utf-8'))
    const rows = Object.entries(curation.entries)
    if (rows.length === 0) {
      console.log('Die Kuratierungsliste ist leer — nichts zu bauen. Erst --propose, dann von Hand bestaetigen.')
      return
    }
    const byId = new Map(foods.map((f) => [Number(f.fdc_id), f]))
    const amounts = amountsFor(dir, rows.map(([, v]) => v.fdcId), index)
    const entries = []
    const skipped = []
    for (const [key, v] of rows) {
      const food = byId.get(v.fdcId)
      if (!food) {
        skipped.push(`${key}: FDC ${v.fdcId} steht nicht in food.csv`)
        continue
      }
      const mapped = mapFood(amounts.get(v.fdcId) ?? new Map(), index)
      if (!mapped) {
        skipped.push(`${key}: FDC ${v.fdcId} hat keine vollstaendigen Makros`)
        continue
      }
      entries.push({ key, name: v.name, category: v.category, fdcId: v.fdcId, publicationDate: food.publication_date, per100: mapped.per100, micro: mapped.micro })
    }
    writeFileSync('src/data/foodsUsda.ts', emitTs(entries))
    console.log(`${entries.length} Eintraege geschrieben, davon ${entries.filter((e) => e.micro).length} mit Mikronaehrstoffen.`)
    if (skipped.length > 0) console.log(`Uebersprungen:\n  ${skipped.join('\n  ')}`)
    return
  }

  console.log('Gebrauch: --search "term" | --propose | --build  [--data <verzeichnis>]')
}

if (process.argv[1] && process.argv[1].endsWith('buildFoodCore.mjs')) {
  try {
    main(process.argv.slice(2))
  } catch (e) {
    console.error(String(e.message ?? e))
    process.exit(1)
  }
}
