import { Fragment, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Text, der zeichenweise scharf zieht.
 *
 * Die Gotcha der Vorlage, wörtlich übernommen, weil sie im Deutschen sofort
 * zuschlägt: die Zeichen müssen in WORTHÜLLEN liegen (`inline-block`,
 * `nowrap`), sonst bricht der Umbruch mitten in «LEISTUNGSDIAGNOSTIK».
 *
 * Barrierefreiheit: der zerlegte Text bleibt für Bildschirmleser ein Wort.
 * Ein Screenreader, der 21 Einzelbuchstaben vorliest, ist kein Effekt,
 * sondern ein Defekt — deshalb steht der ganze Satz einmal in `sr-only` und
 * die Zerlegung ist `aria-hidden`.
 */
export function SplitText({
  children,
  by = 'char',
  delay = 0,
  className,
}: {
  children: string
  by?: 'char' | 'word'
  /** Verzögerung in Sekunden, wie in der Vorlage. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '-50px 0px -50px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const stagger = by === 'char' ? 0.03 : 0.05
  const words = children.split(' ')
  let index = 0

  return (
    <>
      <span className="sr-only">{children}</span>
      <span ref={ref} aria-hidden className={cn(shown && 'in', className)}>
        {words.map((word, w) => (
          /*
           * Das Leerzeichen steht als eigener Textknoten NEBEN der Worthülle,
           * nicht darin: am Rand eines `inline-block` fällt ein Leerzeichen
           * weg, und dann klebt «FINDE» an «HERAUS».
           */
          <Fragment key={`${word}-${w}`}>
            <span className="inline-block whitespace-nowrap">
              {(by === 'char' ? [...word] : [word]).map((unit, u) => {
                const seg = (
                  <span
                    key={`${unit}-${u}`}
                    className="te-seg"
                    style={{ ['--te-delay' as string]: `${(delay + index * stagger) * 1000}ms` }}
                  >
                    {unit}
                  </span>
                )
                index++
                return seg
              })}
            </span>
            {w < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </>
  )
}
