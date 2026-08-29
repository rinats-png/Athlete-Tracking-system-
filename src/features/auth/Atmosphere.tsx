import { BodyFigure } from '@/components/body/BodyFigure'
import { cn } from '@/lib/utils'

/**
 * Hintergrund des Willkommensbildschirms.
 *
 * Bewusst kein Stockfoto: die Stimmung entsteht aus weichgezeichneten
 * Farbfeldern, einem Filmkorn und der Markenfigur als Wasserzeichen. Das lädt
 * sofort, skaliert auf jedes Format, funktioniert in beiden Themes und lässt
 * sich mit dem Farbsystem umfärben — ein Foto könnte davon nichts.
 */
export function Atmosphere({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {/* Farbfelder. Grosszügig weichgezeichnet, damit keine Kanten entstehen. */}
      <div
        className="absolute -top-[18%] -left-[22%] h-[75vh] w-[85vw] rounded-full opacity-60 blur-[110px]"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 68%)' }}
      />
      <div
        className="absolute top-[22%] -right-[28%] h-[70vh] w-[80vw] rounded-full opacity-45 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #2E6E7E 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-[25%] left-[8%] h-[65vh] w-[75vw] rounded-full opacity-38 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #B4761F 0%, transparent 72%)' }}
      />

      {/* Markenfigur als Wasserzeichen — verbindet den Einstieg mit dem
          Dashboard, ohne sich in den Vordergrund zu drängen. */}
      <div className="absolute inset-x-0 top-[9%] bottom-[4%] flex justify-center opacity-[0.16]">
        <BodyFigure
          scores={{
            endurance: 82,
            max_strength: 79,
            relative_strength: 81,
            strength_endurance: 78,
            power: 79,
            agility: 65,
          }}
          className="h-full w-auto"
          ariaLabel=""
        />
      </div>

      {/* Filmkorn. Ohne das wirken grosse Verläufe auf OLED-Displays gebändert. */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.22] mix-blend-overlay">
        <filter id="atmosphere-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#atmosphere-grain)" />
      </svg>

      {/* Abdunkeln nach unten, damit die Glasfläche darauf lesbar bleibt. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in oklab, var(--plane) 55%, transparent) 0%, color-mix(in oklab, var(--plane) 20%, transparent) 38%, color-mix(in oklab, var(--plane) 82%, transparent) 100%)',
        }}
      />
    </div>
  )
}
