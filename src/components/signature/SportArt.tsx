import { sportArt } from '@/data/sportArt'
import { cn } from '@/lib/utils'

/**
 * Das Bild einer Sportart, passend zum Thema.
 *
 * Beide Fassungen stehen im Markup; welche zu sehen ist, entscheidet das
 * CSS anhand desselben Selektors, der auch die Farbrollen umschaltet
 * (`.only-light` / `.only-dark`). Damit wechselt das Bild im selben Moment
 * wie die Fläche dahinter — ein Bild, das eine halbe Sekunde nachhinkt,
 * fällt mehr auf als eines, das gar nicht wechselt.
 *
 * Das Bild ist Schmuck, keine Information: `alt=""`. Der Name der Sportart
 * steht daneben als Text.
 */
export function SportArt({
  disciplineId,
  categoryId,
  className,
  imgClassName,
  position = '50% 18%',
}: {
  disciplineId: string | null
  categoryId: string | null
  className?: string
  imgClassName?: string
  /** Bildausschnitt: die Motive haben oben ihr Gesicht, unten das Wasserzeichen. */
  position?: string
}) {
  const art = sportArt(disciplineId, categoryId)
  if (!art) return null
  const img = cn('absolute inset-0 h-full w-full object-cover', imgClassName)
  return (
    <span aria-hidden className={cn('relative block overflow-hidden', className)}>
      <img src={art.light} alt="" loading="lazy" className={cn(img, 'only-light')} style={{ objectPosition: position }} />
      <img src={art.dark} alt="" loading="lazy" className={cn(img, 'only-dark')} style={{ objectPosition: position }} />
    </span>
  )
}
