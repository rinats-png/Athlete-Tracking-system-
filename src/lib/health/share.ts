import { HEALTH_CATEGORIES, type HealthCategory } from '@/lib/store/schema'
import type { StoredHealth } from '@/lib/store/localStore'

/**
 * Was eine Freigabe enthält — die reine Logik, ohne Netz und ohne Schlüssel.
 *
 * EINE KATEGORIE, EIN TRAINER, EIN ZEITPUNKT. Mehr steckt nicht in einer
 * Freigabe. Sie trägt die Einträge dieser einen Kategorie, so wie sie im
 * Moment der Freigabe dastanden, und das Datum dieses Moments.
 *
 * WARUM EINE ABSCHRIFT UND KEIN FENSTER: Ein Dauerzugriff müsste den
 * Schlüssel des Athleten weiterreichen oder jeden neuen Eintrag automatisch
 * mitverschlüsseln — beides heisst, dass der Athlet nach dem einen Haken
 * nicht mehr entscheidet, was der andere sieht. Eine Abschrift mit Datum
 * sagt beiden Seiten genau, worüber sie reden.
 */

export interface SharePayload {
  category: HealthCategory
  /** Wann diese Abschrift gemacht wurde. */
  takenAt: string
  /** Die Einträge der Kategorie, unverändert. */
  entries: unknown[]
}

const LIST_OF: Record<HealthCategory, keyof StoredHealth> = {
  lab: 'labs',
  symptoms: 'symptoms',
  cycle: 'cycle',
  selfImage: 'selfImage',
  meds: 'meds',
  photos: 'photos',
}

/** Die Abschrift einer Kategorie. */
export function sharePayload(health: StoredHealth, category: HealthCategory, takenAt: string): SharePayload {
  const list = health[LIST_OF[category]]
  return { category, takenAt, entries: Array.isArray(list) ? [...list] : [] }
}

/**
 * Eine gelesene Abschrift prüfen, bevor sie angezeigt wird.
 *
 * Sie kommt aus einem Chiffrat, das der eigene Schlüssel geöffnet hat — aber
 * «entschlüsselbar» heisst nicht «wohlgeformt». Was die Form nicht erfüllt,
 * wird nicht halb angezeigt, sondern gar nicht.
 */
export function readSharePayload(value: unknown): SharePayload | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<SharePayload>
  if (typeof v.category !== 'string' || !HEALTH_CATEGORIES.includes(v.category as HealthCategory)) return null
  if (typeof v.takenAt !== 'string' || !Array.isArray(v.entries)) return null
  return { category: v.category as HealthCategory, takenAt: v.takenAt, entries: v.entries }
}

export interface ShareRow {
  owner_id: string
  coach_id: string
  athlete_id: string
  category: string
  /** Der Freigabeschlüssel, verschlossen für den Trainer. */
  envelope: string
  /** Die Abschrift, verschlüsselt mit dem Freigabeschlüssel. */
  payload: string
  updated_at?: string
}

/**
 * Welche Freigaben aufgefrischt werden sollten.
 *
 * Nicht automatisch — die App frischt nichts von selbst auf, sonst wäre die
 * Abschrift doch wieder ein Fenster. Sie sagt nur, wo der Athlet seit der
 * Freigabe etwas geändert hat, und überlässt ihm die Entscheidung.
 */
export function staleShares(health: StoredHealth, shares: { category: string; takenAt: string }[]): string[] {
  const out: string[] = []
  for (const share of shares) {
    const key = LIST_OF[share.category as HealthCategory]
    if (!key) continue
    const list = health[key] as { updatedAt?: string }[]
    if (!Array.isArray(list)) continue
    let newest = ''
    for (const entry of list) if (entry.updatedAt && entry.updatedAt > newest) newest = entry.updatedAt
    if (newest && newest > share.takenAt) out.push(share.category)
  }
  return out
}
