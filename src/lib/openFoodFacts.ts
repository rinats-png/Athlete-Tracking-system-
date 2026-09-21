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
 * LIZENZ (geklärt, docs/odbl.md): ODbL verlangt Namensnennung und — für
 * WEITERGEGEBENE abgeleitete Datenbanken — Share-alike. Die App fragt ab,
 * zeigt an (ein «Produced Work» mit Notiz) und verteilt keinen Auszug;
 * damit bleibt es bei der Namensnennung: unter jeder Trefferliste, an
 * jeder Position, im Impressum und im Export. Ein Offline-Auszug wird
 * nicht gebaut — er wäre eine weitergegebene abgeleitete Datenbank.
 *
 * FAIRER UMGANG MIT DER API: Open Food Facts bittet um eine Kennung der
 * App und um höchstens 10 Suchen und 100 Produktabfragen je Minute. Ein
 * Browser kann den User-Agent nicht setzen; die Kennung geht als
 * Parameter mit. Die Rate hält ein gleitendes Fenster je Abfrageart —
 * eine Abfrage darüber wartet, statt abgewiesen zu werden.
 */

import type { Per100 } from '@/data/foods'
import { OFF_NOTICE } from '@/lib/offNotice'

export const OFF_ORIGIN = 'https://world.openfoodfacts.org'
export const OFF_ATTRIBUTION = 'Open Food Facts · ODbL · openfoodfacts.org'
/** Die Notiz nach ODbL §4.3, wie sie im Export und im Impressum steht. */
export { OFF_NOTICE }

/** Kennung der App an der API — was Open Food Facts an Stelle eines User-Agent bekommt. */
const APP_ID = `app_name=kydon&app_version=${encodeURIComponent(typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev')}`

/** Die Grenzen aus der API-Dokumentation von Open Food Facts, je Minute. */
export const OFF_RATE = { search: 10, product: 100, windowMs: 60_000 } as const

/**
 * Gleitendes Fenster je Abfrageart. Gibt zurück, wie lange zu warten ist,
 * bis die nächste Abfrage im Rahmen liegt — 0, wenn sofort. Reine Rechnung
 * über Zeitstempel, damit sie ohne Netz prüfbar ist.
 */
export function rateDelay(recent: number[], limit: number, now: number, windowMs: number = OFF_RATE.windowMs): number {
  const inWindow = recent.filter((t) => now - t < windowMs)
  if (inWindow.length < limit) return 0
  const oldest = Math.min(...inWindow)
  return Math.max(0, oldest + windowMs - now)
}

const recent: Record<'search' | 'product', number[]> = { search: [], product: [] }

async function respectRate(kind: 'search' | 'product', signal?: AbortSignal): Promise<void> {
  const now = Date.now()
  recent[kind] = recent[kind].filter((t) => now - t < OFF_RATE.windowMs)
  const wait = rateDelay(recent[kind], OFF_RATE[kind], now)
  if (wait > 0) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, wait)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('aborted', 'AbortError'))
      })
    })
  }
  recent[kind].push(Date.now())
}

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
    await respectRate('search', signal)
    const url = `${OFF_ORIGIN}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=${FIELDS}&${APP_ID}`
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
    await respectRate('product', signal)
    const res = await fetch(`${OFF_ORIGIN}/api/v2/product/${c}?fields=${FIELDS}&${APP_ID}`, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return { ok: false, reason: 'error' }
    const body = (await res.json()) as { product?: OffProduct }
    const food = body.product ? fromOffProduct(body.product) : null
    return { ok: true, foods: food ? [food] : [] }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { ok: true, foods: [] }
    return { ok: false, reason: 'error' }
  }
}
