import { useEffect, useId, useRef, useState } from 'react'

/**
 * Die Bausteine des Grafiksystems.
 *
 * DIE ENTSCHEIDUNG DAHINTER
 *
 * Alle Diagramme der App sind aus zwei Dingen gebaut: aus STREIFEN und aus
 * SCHRAFFUR.
 *
 *   Streifen  tragen, was gemessen wurde. Ihre Länge oder Dichte ist der
 *             Wert. Sie sind abzählbar — eine Messung ist ein Ereignis, keine
 *             glatte Kurve, und eine Fläche behauptet eine Stetigkeit, die
 *             zwischen zwei Terminen nicht existiert.
 *   Schraffur trägt, was FEHLT: die Lücke zur Referenz, der ungemessene
 *             Zeitraum, die Achse ohne Test. Damit bekommt das Fehlende eine
 *             eigene Gestalt, statt einfach leer zu bleiben — die Haltung der
 *             App als Bild.
 *
 * Beides arbeitet ausschliesslich mit Rollenfarben und dünnen Linien: es
 * stimmt in Mondstein wie in Mondlicht, druckt in Graustufen und kostet keine
 * Diagrammbibliothek.
 */

/** Abstand der Streifen in Pixeln. Enger wirkt als Fläche, weiter als Zaun. */
export const STRIPE_GAP = 2.6

/**
 * Schraffurmuster für Fehlstellen.
 *
 * Eigene Kennung je Einbindung: zwei Diagramme auf einer Seite teilen sich
 * sonst ein `<pattern>`, und das zweite erbt die Farben des ersten.
 */
export function useHatchId(): string {
  return `hatch-${useId().replace(/:/g, '')}`
}

export function HatchPattern({ id }: { id: string }) {
  return (
    <defs>
      <pattern
        id={id}
        width="5"
        height="5"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="5" stroke="var(--line-strong)" strokeWidth="1" opacity="0.5" />
      </pattern>
    </defs>
  )
}

/**
 * Ein Fächer aus Streifen entlang einer Richtung.
 *
 * Die mittlere Linie ist die längste; nach aussen werden die Linien kürzer
 * und blasser. Das ergibt eine Form, die auf einen Blick eine Grösse zeigt,
 * ohne eine geschlossene Fläche zu behaupten.
 */
export function stripeFan(
  cx: number,
  cy: number,
  angle: number,
  length: number,
  count = 7,
): { x1: number; y1: number; x2: number; y2: number; opacity: number }[] {
  const nx = -Math.sin(angle)
  const ny = Math.cos(angle)
  const lines = []
  for (let k = -count; k <= count; k++) {
    const off = k * STRIPE_GAP
    // Die Länge fällt zum Rand hin ab — sonst entstünde ein Balken.
    const taper = 1 - Math.abs(k) / (count + 2)
    lines.push({
      x1: cx + nx * off,
      y1: cy + ny * off,
      x2: cx + Math.cos(angle) * length * taper + nx * off,
      y2: cy + Math.sin(angle) * length * taper + ny * off,
      opacity: 0.9 - Math.abs(k) * (0.55 / count),
    })
  }
  return lines
}

/**
 * Die tatsächliche Breite der Fläche messen.
 *
 * DER GRUND: ein `viewBox` mit fester Breite wird in einen breiten Rahmen
 * hineinskaliert und bleibt dabei mittig stehen — das Diagramm sass als
 * schmaler Streifen in der Mitte einer breiten Karte. Nicht-gleichförmiges
 * Skalieren wäre die einfache Antwort und die falsche: es zieht die
 * Strichstärke mit in die Breite, und ein Seismogramm aus lauter senkrechten
 * Linien wird davon unleserlich.
 *
 * Also wird gemessen und in echten Pixeln gezeichnet.
 */
export function useMeasuredWidth(fallback = 320): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      const w = node.clientWidth
      if (w > 0) setWidth(w)
    })
    observer.observe(node)
    setWidth(node.clientWidth || fallback)
    return () => observer.disconnect()
  }, [fallback])
  return [ref, width]
}
