import { useTranslation } from 'react-i18next'
import bodyAsset from '@/assets/body-figure.webp'
import { cn } from '@/lib/utils'
import type { PerformanceDimension } from '@/types/domain'

/**
 * Körperdarstellung als holografische Anzeige.
 *
 * Die Figur selbst ist ein gerenderter Asset — eine schematische Anatomiefigur
 * mit leuchtenden Konturen. Alles Datentragende liegt als Ebene darüber: je
 * Leistungsdimension ein weicher Lichtfleck auf der Muskelgruppe, dessen
 * Helligkeit vom Achsenwert abhängt.
 *
 * Warum getrennt und nicht alles im Bild:
 *   - Beschriftungen und Werte bleiben echter Text — übersetzbar, vorlesbar,
 *     scharf auf jedem Display — statt gerenderter Pixel.
 *   - Die Einfärbung folgt den Daten, das Bild bleibt konstant.
 *
 * Die Anzeige ist in beiden Themes dunkel. Das ist Absicht: sie ist ein
 * Display im Gerät, kein Blatt Papier — eine leuchtende Figur funktioniert nur
 * auf dunklem Grund. `--display` hält den Ton, in den die weiche Bildkante
 * ausläuft.
 */

/** Mittelpunkt und Radius je Muskelgruppe, in Prozent des Bildes. */
const REGIONS: Record<
  PerformanceDimension,
  { x: number; y: number; rx: number; ry: number; mirrored?: boolean }
> = {
  // Brustmuskulatur — Brustkorb, Herz und Lunge.
  endurance: { x: 41.7, y: 23.5, rx: 7.0, ry: 5, mirrored: true },
  // Schultergürtel und Trapez.
  max_strength: { x: 32.4, y: 24.5, rx: 6.1, ry: 4.5, mirrored: true },
  // Zugmuskulatur der Arme: Bizeps und Unterarm.
  relative_strength: { x: 25.4, y: 32, rx: 7.0, ry: 6, mirrored: true },
  // Rumpf.
  strength_endurance: { x: 50.0, y: 34, rx: 7.9, ry: 7 },
  // Oberschenkel.
  power: { x: 42.1, y: 56, rx: 5.7, ry: 9, mirrored: true },
  // Unterschenkel.
  agility: { x: 40.8, y: 75, rx: 4.8, ry: 7, mirrored: true },
}

const DIMENSIONS = Object.keys(REGIONS) as PerformanceDimension[]

export interface BodyFigureProps {
  /** Achsenwerte 0–100 je Dimension. Fehlende Achsen bleiben ungefärbt. */
  scores: Partial<Record<PerformanceDimension, number | null>>
  /** Hervorgehobene Gruppe; die übrigen treten zurück. */
  highlighted?: PerformanceDimension | null
  onSelect?: (dimension: PerformanceDimension) => void
  className?: string
  /** Beschriftung für Screenreader — die Figur ist sonst reine Grafik. */
  ariaLabel: string
  /** Ohne Leuchtflecken und Holo-Ring, für den Einsatz als Wasserzeichen. */
  plain?: boolean
}

export function BodyFigure({
  scores,
  highlighted,
  onSelect,
  className,
  ariaLabel,
  plain = false,
}: BodyFigureProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('relative aspect-[640/1120]', className)}>
      {/* Die Figur ist Darstellung, kein Bedienelement: ohne
          pointer-events-none deckt sie als grösste Fläche der Seite alles
          darunter ab und fängt Zeigereingaben ab, die ihr nicht gelten. */}
      <img
        src={bodyAsset}
        alt={ariaLabel}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
        draggable={false}
      />

      {!plain && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {DIMENSIONS.flatMap((dimension) => {
            const score = scores[dimension]
            if (score == null) return []
            const dimmed = highlighted != null && highlighted !== dimension
            const { x, y, rx, ry, mirrored } = REGIONS[dimension]
            const opacity = (0.14 + (score / 100) * 0.4) * (dimmed ? 0.15 : 1)

            return (mirrored ? [x, 100 - x] : [x]).map((cx) => (
              <span
                key={`${dimension}-${cx}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300"
                style={{
                  left: `${cx}%`,
                  top: `${y}%`,
                  width: `${rx * 2}%`,
                  height: `${ry * 2}%`,
                  opacity,
                  background:
                    'radial-gradient(closest-side, var(--accent-glow) 0%, var(--accent) 40%, transparent 76%)',
                  filter: 'blur(7px)',
                  mixBlendMode: 'screen',
                }}
              />
            ))
          })}
        </div>
      )}

      {onSelect && (
        // pointer-events-none am Container: die Ebene spannt sich über die
        // gesamte Figur und würde sonst als unsichtbare Fläche im Weg stehen.
        // Zeigereingaben nimmt ausschliesslich der einzelne Knopf an.
        <div className="pointer-events-none absolute inset-0">
          {DIMENSIONS.flatMap((dimension) => {
            const { x, y, rx, ry, mirrored } = REGIONS[dimension]
            return (mirrored ? [x, 100 - x] : [x]).map((cx) => (
              <button
                key={`hit-${dimension}-${cx}`}
                type="button"
                // Ohne Beschriftung wäre das eine unsichtbare, für
                // Screenreader namenlose Fläche. Der Name ist derselbe wie am
                // zugehörigen Knoten.
                aria-label={t(`dimensions.${dimension}`)}
                aria-pressed={highlighted === dimension}
                onClick={() => onSelect(dimension)}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${cx}%`,
                  top: `${y}%`,
                  // Trefferfläche grosszügiger als der Lichtfleck — und nie
                  // kleiner als 44 px, der kleinsten zuverlässig treffbaren
                  // Fläche für einen Daumen.
                  width: `${Math.max(rx, 7) * 2}%`,
                  height: `${Math.max(ry, 5) * 2}%`,
                  minWidth: 44,
                  minHeight: 44,
                }}
              />
            ))
          })}
        </div>
      )}
    </div>
  )
}
