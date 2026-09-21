/**
 * Open Food Facts — die zweite Quelle hinter dem Lebensmittelkern.
 *
 * WAS DAS IST: eine offene Datenbank mit über drei Millionen Produkten,
 * von Freiwilligen erfasst, unter der Open Database License (ODbL). Wir
 * lesen sie, wir schreiben nichts zurück, und wir nennen sie als Quelle —
 * an jedem Eintrag, der von hier kommt, und im Impressum.
 *
 * WAS DAS NICHT IST: verlässlich. Nährwerte sind teils unvollständig, teils
 * falsch, Mikronährstoffe die Ausnahme. Deshalb trägt jeder Treffer die
 * Herkunft «Open Food Facts, Nutzerangabe» und keine Mikronährstoffe —
 * lieber eine sichtbare Lücke als eine erfundene Zahl (§89). Der Kern aus
 * foods.ts steht in der Suche immer oben; Open Food Facts kommt erst auf
 * ausdrücklichen Tipp und nur mit Netz.
 *
 * LOKAL ZUERST: Ohne Verbindung liefert die Suche nichts und sagt das. Die
 * App bleibt benutzbar; der Kern kennt 245 Lebensmittel ohne Netz.
 *
 * LIZENZ, offen benannt: ODbL verlangt Namensnennung und — für WEITER-
 * GEGEBENE abgeleitete Datenbanken — Share-alike. Die App zeigt Werte an
 * und verteilt keinen Auszug. Ob das reicht, gehört einmal rechtlich
 * geklärt (docs/ausbau.md, Abschnitt 7); bis dahin bleibt es beim Anzeigen.
 */

import type { Per100 } from '@/data/foods'

export const OFF_ORIGIN = 'https://world.openfoodfacts.org'
export const OFF_ATTRIBUTION = 'Open Food Facts · ODbL · openfoodfacts.org'

export interface OffFood {
  /** Barcode (EAN), die stabile Kennung eines Produkts. */
  code: string
  name: string
  brand: string
  per100: Per100
  /** Welche Felder das Produkt tatsächlich hatte — fehlende stehen als 0 im per100, hier als false. */
  has: { kcal: boolean; protein: boolean; fat: boolean; carbs: boolean; fiber: boolean }
}

interface OffProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  brands?: string
  nutriments?: Record<string, number | string | undefined>
}

const FIELDS = 'code,product_name,product_name_de,brands,nutriments'

function num(v: number | string | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Ein Produkt der API in unsere Form — ohne zu raten, was fehlt. */
export function fromOffProduct(p: OffProduct): OffFood | null {
  const name = (p.product_name_de || p.product_name || '').trim()
  if (!name || !p.code) return null
  const n = p.nutriments ?? {}
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? Math.round((num(n['energy_100g']) as number) / 4.184) : null)
  const protein = num(n['proteins_100g'])
  const fat = num(n['fat_100g'])
  const carbs = num(n['carbohydrates_100g'])
  const fiber = num(n['fiber_100g'])
  // Ohne Energie und ohne alle drei Makros ist der Eintrag nutzlos.
  if (kcal == null && (protein == null || fat == null || carbs == null)) return null
  return {
    code: String(p.code),
    name: name.slice(0, 120),
    brand: (p.brands || '').split(',')[0].trim().slice(0, 60),
    per100: {
      kcal: kcal ?? Math.round((protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9),
      protein: protein ?? 0,
      fat: fat ?? 0,
      carbs: carbs ?? 0,
      fiber: fiber ?? 0,
      potassiumMg: num(n['potassium_100g']) != null ? (num(n['potassium_100g']) as number) * 1000 : 0,
      sodiumMg: num(n['sodium_100g']) != null ? (num(n['sodium_100g']) as number) * 1000 : 0,
    },
    has: { kcal: kcal != null, protein: protein != null, fat: fat != null, carbs: carbs != null, fiber: fiber != null },
  }
}

export type OffOutcome = { ok: true; foods: OffFood[] } | { ok: false; reason: 'offline' | 'error' }

/** Textsuche. Höchstens zehn Treffer; mehr wären auf dem Telefon nicht zu überblicken. */
export async function searchOpenFoodFacts(query: string, signal?: AbortSignal): Promise<OffOutcome> {
  const q = query.trim()
  if (!q) return { ok: true, foods: [] }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' }
  try {
    const url = `${OFF_ORIGIN}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=${FIELDS}`
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return { ok: false, reason: 'error' }
    const body = (await res.json()) as { products?: OffProduct[] }
    return { ok: true, foods: (body.products ?? []).map(fromOffProduct).filter((f): f is OffFood => f != null) }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { ok: true, foods: [] }
    return { ok: false, reason: 'error' }
  }
}

/** Ein Produkt über den Barcode. */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<OffOutcome> {
  const c = code.replace(/\D/g, '')
  if (c.length < 8) return { ok: true, foods: [] }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' }
  try {
    const res = await fetch(`${OFF_ORIGIN}/api/v2/product/${c}?fields=${FIELDS}`, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return { ok: false, reason: 'error' }
    const body = (await res.json()) as { product?: OffProduct }
    const food = body.product ? fromOffProduct(body.product) : null
    return { ok: true, foods: food ? [food] : [] }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { ok: true, foods: [] }
    return { ok: false, reason: 'error' }
  }
}
