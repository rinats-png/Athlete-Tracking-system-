import { Panel } from '@/components/ui/Panel'
import { cn } from '@/lib/utils'

/**
 * Karte mit Bild aus der vorhandenen KYDON-Bildwelt (Testbilder).
 *
 * Das Bild ist Schmuck und trägt keine Information: es hat kein Alt
 * (`alt=""`), wird erst beim Sichtbarwerden geladen und steht rechts, wo der
 * Text endet. Ohne Bild bleibt es eine gewöhnliche Fläche.
 */
export function ImageCard({
  image,
  float = false,
  lift = false,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { image: string | null; float?: boolean; lift?: boolean }) {
  return (
    <Panel float={float} lift={lift} className={cn(image && 'image-card', className)} {...rest}>
      {image && <img src={image} alt="" loading="lazy" decoding="async" className="image-card__img" />}
      {children}
    </Panel>
  )
}
