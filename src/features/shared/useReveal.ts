import { useEffect, useRef } from 'react'

/**
 * Einlaufende Elemente, einmalig.
 *
 * Der Beobachter hängt am Container; die Kinder mit `[data-reveal]` bekommen
 * ihre Verzögerung aus ihrer Reihenfolge — genau die Staffelung der Vorlage
 * (0,2 s Vorlauf, 0,1 s je Element).
 *
 * Warum ein Beobachter und kein Timer: was nie im Bild war, soll auch nicht
 * gelaufen sein. Wer direkt zum Fuss der Seite springt, sieht dort einen
 * Abschnitt, der einläuft — und nicht einen, der es vor zehn Sekunden tat.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = [...root.querySelectorAll<HTMLElement>('[data-reveal]')]
    if (items.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.classList.add('in')
          io.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    )

    items.forEach((item, i) => {
      if (!item.style.getPropertyValue('--reveal-delay')) {
        item.style.setProperty('--reveal-delay', `${200 + i * 100}ms`)
      }
      io.observe(item)
    })
    return () => io.disconnect()
  }, [])

  return ref
}
