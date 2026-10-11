import { cn } from '@/lib/utils'

/**
 * Fotokarte: das Bild füllt die Karte, der Text steht unten auf einem
 * dunklen Verlauf (Neugestaltung «Startkarte»). Die Schrift ist darum in
 * beiden Erscheinungsbildern hell; der Verlauf hält den Kontrast.
 *
 * Wie bei `ImageCard` ist das Bild Schmuck (`alt=""`) und wird erst beim
 * Sichtbarwerden geladen.
 */
export function PhotoCard({
  image,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { image: string | null }) {
  return (
    <div className={cn('photo-card', className)} {...rest}>
      {image && <img src={image} alt="" loading="lazy" decoding="async" className="photo-card__img" />}
      {children}
    </div>
  )
}

/** Fortschritt als Segmente (Wochen, Tests): erledigt, aktuell, offen. */
export function Segments({ total, done, current, className }: { total: number; done: number; current?: number; className?: string }) {
  return (
    <span className={cn('flex gap-[3px]', className)} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={cn('h-1 flex-1 rounded-pill', i < done ? 'bg-[#7FE5B5]' : i === current ? 'bg-[#3FBF93]' : 'bg-white/25')} />
      ))}
    </span>
  )
}

/** Vorschaubild in Listen (48 px); ohne Bild eine ruhige Fläche gleicher Größe. */
export function Thumb({ src, className }: { src: string | null | undefined; className?: string }) {
  return src ? <img src={src} alt="" loading="lazy" decoding="async" className={cn('thumb', className)} /> : <span className={cn('thumb', className)} aria-hidden />
}
