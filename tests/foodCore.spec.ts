import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
// @ts-expect-error — Bauskripte sind bewusst reines JavaScript: sie laufen
// auch dann, wenn der TypeScript-Bau gerade nicht durchläuft.
import { NUTRIENTS, buildNutrientIndex, emitTs, mapFood, parseCsv, proposeFor, scoreMatch } from '../scripts/buildFoodCore.mjs'
import { CORE_FOODS, V4_FOODS, usedFoodSources } from '../src/data/foods'
import { USDA_FOODS } from '../src/data/foodsUsda'
import { FOOD_SOURCES } from '../src/data/foodSources'

/**
 * Der kuratierte Kern aus USDA (docs/lebensmitteldaten.md).
 *
 * Die wichtigste Zusage hier ist eine Verweigerung: Das Werkzeug rechnet
 * nur um, was ein Mensch zugeordnet hat, und es bricht ab, statt zu raten.
 * Eine falsche Einheit im Bestand wäre schlimmer als ein leerer Bestand.
 */

// Ein winziger Auszug im Format der Bulk-Dateien von FoodData Central.
const NUTRIENT_CSV = `"id","name","unit_name","nutrient_nbr","rank"
1008,"Energy","KCAL","208",300
1003,"Protein","G","203",600
1004,"Total lipid (fat)","G","204",800
1005,"Carbohydrate, by difference","G","205",1110
1079,"Fiber, total dietary","G","291",1200
1092,"Potassium, K","MG","306",5300
1093,"Sodium, Na","MG","307",5800
2000,"Sugars, total including NLEA","G","269",1510
1258,"Fatty acids, total saturated","G","606",9700
1087,"Calcium, Ca","MG","301",5300
1090,"Magnesium, Mg","MG","304",5500
1089,"Iron, Fe","MG","303",5400
1095,"Zinc, Zn","MG","309",5900
1162,"Vitamin C, total ascorbic acid","MG","401",6300
1114,"Vitamin D (D2 + D3)","UG","328",8700
1178,"Vitamin B-12","UG","418",6583
1404,"PUFA 18:3 n-3 c,c,c (ALA)","G","851",18100
1278,"PUFA 20:5 n-3 (EPA)","G","629",18200
1272,"PUFA 22:6 n-3 (DHA)","G","621",18400
1280,"PUFA 22:5 n-3 (DPA)","G","631",18300
`

const index = buildNutrientIndex(parseCsv(NUTRIENT_CSV))

function amounts(pairs: [number, number][]): Map<number, number> {
  return new Map(pairs)
}

const MACROS: [number, number][] = [
  [1008, 372],
  [1003, 13.5],
  [1004, 7],
  [1005, 58.7],
  [1079, 10],
  [1092, 355],
  [1093, 7],
]
const MICROS: [number, number][] = [
  [2000, 1],
  [1258, 1.2],
  [1087, 54],
  [1090, 140],
  [1089, 4.6],
  [1095, 3.2],
  [1162, 0],
  [1114, 0],
  [1178, 0],
  [1404, 0.1],
]

test.describe('CSV', () => {
  test('Anführungszeichen, Kommas und Zeilenumbrüche im Feld', () => {
    const rows = parseCsv('"a","b"\n"x, mit Komma","y ""zitiert"""\n"mehr","zeilen"\n')
    expect(rows).toEqual([
      { a: 'x, mit Komma', b: 'y "zitiert"' },
      { a: 'mehr', b: 'zeilen' },
    ])
  })
})

test.describe('Nährstoffkennungen', () => {
  test('sie werden gegen Name UND Einheit geprüft', () => {
    expect(index.magnesiumMg.ids).toEqual([1090])
    expect(index.omega3.sum).toBe(true)
    expect(index.kcal.ids[0]).toBe(1008)
  })

  test('eine falsche Einheit bricht ab, statt Mikrogramm als Milligramm zu übernehmen', () => {
    const wrong = NUTRIENT_CSV.replace('1090,"Magnesium, Mg","MG"', '1090,"Magnesium, Mg","UG"')
    expect(() => buildNutrientIndex(parseCsv(wrong))).toThrow(/magnesiumMg.*Einheit UG/s)
  })

  test('eine Kennung, die einen anderen Nährstoff trägt, bricht ab', () => {
    const wrong = NUTRIENT_CSV.replace('1090,"Magnesium, Mg","MG"', '1090,"Manganese, Mn","MG"')
    expect(() => buildNutrientIndex(parseCsv(wrong))).toThrow(/Kennung 1090 heisst/)
  })

  test('jede Kennung im Programm hat eine Einheit und einen erwarteten Namen', () => {
    for (const spec of NUTRIENTS) {
      expect(spec.unit, spec.field).toBeTruthy()
      expect(spec.name, spec.field).toBeTruthy()
      expect(spec.group === 'per100' || spec.group === 'micro', spec.field).toBe(true)
    }
  })
})

test.describe('Umrechnung', () => {
  test('vollständige Makros und Mikronährstoffe werden übernommen', () => {
    const f = mapFood(amounts([...MACROS, ...MICROS]), index)!
    expect(f.per100).toEqual({ kcal: 372, protein: 13.5, fat: 7, carbs: 58.7, fiber: 10, potassiumMg: 355, sodiumMg: 7 })
    expect(f.micro!.magnesiumMg).toBe(140)
    expect(f.micro!.omega3).toBe(0.1)
  })

  test('Omega-3 ist die Summe der vorhandenen Fettsäuren', () => {
    const f = mapFood(amounts([...MACROS, ...MICROS.filter(([id]) => id !== 1404), [1404, 0.05], [1278, 0.6], [1272, 1.2]]), index)!
    expect(f.micro!.omega3).toBeCloseTo(1.85, 5)
  })

  test('fehlt ein einziger Mikronährstoff, gibt es gar keinen — eine halbe Angabe wäre eine unsichtbare Lücke', () => {
    const f = mapFood(amounts([...MACROS, ...MICROS.filter(([id]) => id !== 1090)]), index)!
    expect(f.per100.kcal).toBe(372)
    expect(f.micro).toBeNull()
  })

  test('ohne vollständige Makros entsteht kein Eintrag', () => {
    expect(mapFood(amounts(MACROS.filter(([id]) => id !== 1003)), index)).toBeNull()
    expect(mapFood(new Map(), index)).toBeNull()
  })
})

test.describe('Vorschläge', () => {
  const foods = [
    { fdc_id: '169705', description: 'Oats', data_type: 'sr_legacy_food' },
    { fdc_id: '999999', description: 'Cereals, oats, instant, fortified, plain, dry', data_type: 'sr_legacy_food' },
    { fdc_id: '123456', description: 'Garlic, raw', data_type: 'sr_legacy_food' },
  ]

  test('der kürzere Treffer gewinnt — «Oats» vor «Cereals, oats, instant, fortified»', () => {
    const c = proposeFor('oats', foods)
    expect(c[0].fdcId).toBe(169705)
    expect(c).toHaveLength(2)
  })

  test('ohne gemeinsames Wort gibt es keinen Vorschlag statt eines schlechten', () => {
    expect(proposeFor('quinoa', foods)).toEqual([])
    expect(scoreMatch('', 'Oats')).toBe(0)
  })
})

test.describe('Ausgabe', () => {
  test('erzeugt Einträge mit Quelle, Kennung und Datenstand', () => {
    const ts = emitTs([
      { key: 'knoblauch', name: 'Knoblauch', category: 'Gemüse', fdcId: 123456, publicationDate: '2019-04-01', per100: { kcal: 149, protein: 6.4, fat: 0.5, carbs: 33.1, fiber: 2.1, potassiumMg: 401, sodiumMg: 17 }, micro: null },
    ])
    expect(ts).toContain('source: "usda"')
    expect(ts).toContain('sourceRef: "FDC 123456"')
    expect(ts).toContain('sourceDate: "2019-04-01"')
    expect(ts).toContain('export const USDA_FOODS: CoreFood[]')
    // Ohne Mikronährstoffe steht kein micro-Block da — nicht ein leerer.
    expect(ts).not.toContain('micro:')
  })
})

test.describe('Der Bestand', () => {
  test('jeder Eintrag trägt eine Quelle, die das Register kennt', () => {
    for (const f of CORE_FOODS) {
      expect(f.source, f.key).toBeTruthy()
      expect(FOOD_SOURCES[f.source], `${f.key}: ${f.source}`).toBeTruthy()
    }
    expect(usedFoodSources()).toContain('v4')
  })

  test('kein Schlüssel kommt zweimal vor; USDA ersetzt v4 ganz, nie halb', () => {
    const keys = CORE_FOODS.map((f) => f.key)
    expect(new Set(keys).size).toBe(keys.length)
    // Die Zusammenführung: was in beiden steht, steht im Kern einmal — als USDA.
    const usdaKeys = new Set(USDA_FOODS.map((f) => f.key))
    for (const f of CORE_FOODS) if (usdaKeys.has(f.key)) expect(f.source).toBe('usda')
    expect(CORE_FOODS.length).toBe(new Set([...V4_FOODS.map((f) => f.key), ...usdaKeys]).size)
  })

  test('der BLS ist im Register, aber nicht im Bestand — er ist nicht lizenziert', () => {
    expect(FOOD_SOURCES.bls.licence).toContain('NICHT lizenziert')
    expect(usedFoodSources()).not.toContain('bls')
  })
})

test.describe('Kuratierung', () => {
  const queries = JSON.parse(readFileSync('scripts/foodCore.queries.json', 'utf-8'))
  const curation = JSON.parse(readFileSync('scripts/foodCore.curation.json', 'utf-8'))
  const byKey = new Map(V4_FOODS.map((f) => [f.key, f]))

  test('jeder Suchbegriff zeigt auf einen Eintrag, dem Mikronährstoffe fehlen', () => {
    for (const [key, entry] of Object.entries(queries.entries) as [string, { query: string }][]) {
      const food = byKey.get(key)
      expect(food, key).toBeTruthy()
      expect(food!.micro, `${key} hat bereits Mikronährstoffe`).toBeUndefined()
      expect(entry.query.trim().length, key).toBeGreaterThan(2)
    }
  })

  test('nur Rohware und einfache Zubereitungen — keine Wurst, Süßes, Getränke, Würzmittel, Supplemente', () => {
    const verboten = new Set(['Wurst', 'Süßes', 'Getränke', 'Würzmittel', 'Supplement'])
    for (const [key, entry] of Object.entries(queries.entries) as [string, { category: string }][]) {
      expect(verboten.has(entry.category), `${key}: ${entry.category} gehört nicht zu USDA`).toBe(false)
    }
  })

  test('die Kuratierungsliste nennt nur bekannte Schlüssel', () => {
    for (const [key, entry] of Object.entries(curation.entries) as [string, { fdcId: number; name: string }][]) {
      expect(byKey.has(key) || USDA_FOODS.some((f) => f.key === key), key).toBe(true)
      expect(Number.isInteger(entry.fdcId), key).toBe(true)
      expect(entry.name, key).toBeTruthy()
    }
  })
})
