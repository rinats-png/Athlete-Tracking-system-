/**
 * Bilder je Sportart, hell und dunkel.
 *
 * Die Bilder liegen als `<motiv>-hell.webp` und `<motiv>-dunkel.webp` in
 * `src/assets/sport/`. Diese Datei sagt nur, welches Motiv zu welcher
 * Disziplin gehört — nicht jede Disziplin hat ein eigenes Bild, deshalb
 * gibt es je Sportkategorie ein Auffangmotiv. Marathon und Trail-Lauf
 * teilen sich den Läufer; das ist richtig so, denn das Bild zeigt die
 * Bewegung, nicht die Strecke.
 *
 * Fehlt eine der beiden Fassungen, tritt die andere ein: lieber ein helles
 * Bild im Dunkeln als ein leeres Feld.
 *
 * `import.meta.glob` löst das beim Bauen auf. Liegt ein Bild nicht, entsteht
 * kein Fehler, sondern `null` — und das Bauteil zeichnet nichts.
 */

const FILES = import.meta.glob<{ default: string }>('@/assets/sport/*.webp', { eager: true })

function file(motif: string, mode: 'hell' | 'dunkel'): string | null {
  const key = Object.keys(FILES).find((path) => path.endsWith(`/${motif}-${mode}.webp`))
  return key ? FILES[key].default : null
}

/** Motiv je Disziplin. Was hier nicht steht, fällt auf die Kategorie zurück. */
const DISCIPLINE_MOTIF: Record<string, string> = {
  judo: 'judo',
  karate: 'karate',
  boxing: 'boxen',
  kickboxing: 'kickboxen',
  bjj: 'bjj',
  ju_jutsu: 'bjj',
  mma: 'mma',
  wrestling: 'ringen',
  taekwondo: 'taekwondo',
  fencing: 'fechten',
  pencak_silat: 'karate',
  triathlon: 'triathlon',
  triathlon_sprint: 'triathlon',
  triathlon_olympic: 'triathlon',
  triathlon_70_3: 'triathlon',
  triathlon_ironman: 'triathlon',
  hyrox: 'schlitten',
  functional_fitness: 'schlitten',
  ocr: 'laeufer',
}

/** Auffangmotiv je Kategorie. */
const CATEGORY_MOTIF: Record<string, string> = {
  combat: 'judo',
  running: 'laeufer',
  cycling: 'rad',
  swimming: 'schwimmen',
  triathlon: 'triathlon',
  tactical: 'taktisch',
  hybrid: 'rudern',
}

export interface SportArtSet {
  light: string
  dark: string
}

/**
 * Das Bildpaar für eine Disziplin. `null`, wenn es zu Disziplin UND
 * Kategorie kein Bild gibt — dann zeichnet das Bauteil nichts, und die
 * Liste sieht aus wie vorher.
 */
export function sportArt(disciplineId: string | null, categoryId: string | null): SportArtSet | null {
  const motif =
    (disciplineId && DISCIPLINE_MOTIF[disciplineId]) || (categoryId && CATEGORY_MOTIF[categoryId]) || null
  if (!motif) return null
  const light = file(motif, 'hell')
  const dark = file(motif, 'dunkel')
  if (!light && !dark) return null
  return { light: light ?? (dark as string), dark: dark ?? (light as string) }
}
