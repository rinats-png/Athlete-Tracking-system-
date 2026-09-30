import { WHATS_NEW, type WhatsNewRelease } from '@/data/whatsNew'

/**
 * Wann «Neu bei KYDON» erscheint — die ganze Logik, ohne Oberfläche.
 *
 * PERSISTENZ: die zuletzt gesehene Stand-Kennung liegt im `localStorage` unter
 * `kydon.whatsnew.seen`, neben dem Bestand und nicht darin: es ist eine
 * Eigenschaft dieses Geräts, kein Datum über einen Menschen, und sie wird
 * nicht exportiert (wie die Einstellung der Intro-Sequenz).
 *
 * ERSTSTART: wer die App zum ersten Mal öffnet (weder Marke noch Bestand),
 * bekommt keinen Hinweis auf «Neuerungen» — es gibt für ihn nichts, was neu
 * WÄRE. `initWhatsNew` setzt dann still den aktuellen Stand als gesehen. Wer
 * schon einen Bestand hat, aber noch keine Marke (Update von einer Fassung
 * ohne diesen Hinweis), sieht ihn einmal.
 *
 * OHNE SPEICHER (privater Modus, blockiert) wird nichts gezeigt: lieber kein
 * Hinweis als einer bei jedem Start.
 */

export const SEEN_KEY = 'kydon.whatsnew.seen'
const DATA_KEY = 'kydon.data.v1'

export function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

/** Schreibt die Marke. Wahr, wenn sie gespeichert werden konnte. */
export function writeSeen(id: string): boolean {
  try {
    localStorage.setItem(SEEN_KEY, id)
    return readSeen() === id
  } catch {
    return false
  }
}

/** Die Kennung des neuesten Stands, oder null ohne Einträge. */
export function latestReleaseId(releases: readonly WhatsNewRelease[] = WHATS_NEW): string | null {
  return releases.reduce<string | null>((best, r) => (best == null || r.id > best ? r.id : best), null)
}

/**
 * Die Stände, die seit `seen` dazugekommen sind, neueste zuerst. Ohne Marke
 * (`null`) sind es alle. Eine Marke, die neuer ist als jeder bekannte Stand
 * (Rückschritt der App), ergibt nichts.
 */
export function unseenReleases(seen: string | null, releases: readonly WhatsNewRelease[] = WHATS_NEW): WhatsNewRelease[] {
  return releases.filter((r) => seen == null || r.id > seen).sort((a, b) => (a.id < b.id ? 1 : -1))
}

/** Beim Start, einmal: Erststart erkennen und still als gesehen markieren. */
export function initWhatsNew(releases: readonly WhatsNewRelease[] = WHATS_NEW): void {
  try {
    const latest = latestReleaseId(releases)
    if (latest == null || readSeen() != null) return
    const hasData = localStorage.getItem(DATA_KEY) != null
    if (!hasData) writeSeen(latest)
  } catch {
    /* Ohne Speicher gibt es nichts zu merken. */
  }
}

/** Was jetzt angezeigt werden soll; leer, wenn nichts. */
export function pendingReleases(releases: readonly WhatsNewRelease[] = WHATS_NEW): WhatsNewRelease[] {
  const list = unseenReleases(readSeen(), releases)
  if (list.length === 0) return []
  // Lässt sich die Marke nicht schreiben, würde der Hinweis bei jedem Start wiederkehren.
  try {
    localStorage.setItem('kydon.whatsnew.probe', '1')
    localStorage.removeItem('kydon.whatsnew.probe')
  } catch {
    return []
  }
  return list
}

/** «Gesehen»: der neueste bekannte Stand wird zur Marke. */
export function markWhatsNewSeen(releases: readonly WhatsNewRelease[] = WHATS_NEW): void {
  const latest = latestReleaseId(releases)
  if (latest != null) writeSeen(latest)
}
