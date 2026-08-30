import { useEffect, useState } from 'react'

/**
 * Abstand zwischen der Unterkante des Layout-Viewports und der tatsächlich
 * sichtbaren Unterkante.
 *
 * Warum das gebraucht wird: `position: fixed; bottom: 0` verankert am
 * *Layout*-Viewport. Der ist nicht immer der sichtbare. Er fällt auseinander
 *
 *   - wenn die Bildschirmtastatur aufgeht (der sichtbare Bereich schrumpft,
 *     der Layout-Viewport bleibt),
 *   - beim Zoomen mit zwei Fingern,
 *   - in mobilen Emulationsmodi, in denen der Layout-Viewport höher gesetzt
 *     ist als der Bildschirm.
 *
 * In genau diesen Fällen rutscht eine `fixed` verankerte Leiste unter den
 * sichtbaren Rand — sie ist im DOM da, korrekt positioniert und trotzdem
 * nicht zu sehen. Gemessen auf einem emulierten Pixel 7: Layout-Viewport
 * 1178 px, sichtbar 839 px, Leiste bei y=1117 und damit 278 px ausserhalb.
 *
 * Die VisualViewport-API liefert den sichtbaren Ausschnitt. Fehlt sie, bleibt
 * es beim reinen `fixed` — das ist das Verhalten, das ohnehin überall greift.
 */
export function useVisualViewportInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      // Bezugsgrösse ist `window.innerHeight`: `position: fixed` verankert am
      // initialen Containing Block, und dessen Höhe ist genau das — nicht
      // `documentElement.clientHeight`, das dem sichtbaren Bereich folgen
      // kann. Gemessen auf einem emulierten Pixel 7 gehen beide um 339 px
      // auseinander.
      const anchorHeight = window.innerHeight
      const visibleBottom = viewport.height + viewport.offsetTop
      // Auf Subpixel gerundet, damit ein Dauerflackern durch 0,5-px-Sprünge
      // ausbleibt.
      const gap = Math.round(Math.max(0, anchorHeight - visibleBottom))
      setInset((current) => (Math.abs(current - gap) > 1 ? gap : current))
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    window.addEventListener('orientationchange', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return inset
}
