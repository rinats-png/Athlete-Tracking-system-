/**
 * «Neu bei KYDON»: die Neuerungen je Stand.
 *
 * NEUE EINTRÄGE STEHEN OBEN. `id` ist ein Datum (`JJJJ-MM-TT`, bei mehreren
 * Ständen am selben Tag mit Zähler `JJJJ-MM-TT.2`) und wird als Text
 * verglichen — ein Stand ist «neu», wenn seine Kennung grösser ist als die
 * zuletzt gesehene. Die Kennung wird nie umbenannt, sonst zeigt sich der
 * Hinweis einem Menschen ein zweites Mal.
 *
 * `items` sind Schlüssel unter `whatsNew.items.*` im Zusatzwörterbuch, in
 * allen 8 Sprachen. Nur Sichtbares für Nutzerinnen und Nutzer gehört hierher,
 * keine Umbauten im Inneren.
 */
export interface WhatsNewRelease {
  id: string
  items: string[]
}

export const WHATS_NEW: WhatsNewRelease[] = [
  {
    id: '2026-09-30',
    items: ['design', 'tests', 'images', 'fuel', 'tournament', 'supplements', 'energy', 'protein', 'pro'],
  },
]
