import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { PerformanceDimension } from '@/types/domain'

/**
 * Schematische Anatomiefigur als datentragende Fläche.
 *
 * Die Figur ist kein Dekor: jede Muskelgruppe gehört zu einer
 * Leistungsdimension und leuchtet in der Stärke ihres Achsenwerts. Wer auf das
 * Profil schaut, sieht damit, *wo am Körper* die Reserve liegt — nicht nur,
 * welcher Balken kürzer ist.
 *
 * Aufbau:
 *   1. SILHOUETTE (Kopf, Torso, zwei Arme, zwei Beine) bildet Kontur und
 *      ClipPath. Arme und Beine werden gespiegelt, also nur einmal gepflegt.
 *   2. MUSCLE_GROUPS liegen darin, auf den Clip beschnitten — dadurch dürfen
 *      die Formen grosszügig sein, ohne über die Kontur hinauszulaufen.
 *   3. Kontur und Muskelränder doppelt gezeichnet, einmal weichgezeichnet
 *      darunter: das ergibt den leuchtenden Rand.
 *
 * Bewusst Vektor statt 3D-Render: die Figur läuft mit dem Farbsystem mit, ist
 * in jeder Grösse scharf, wiegt wenige Kilobyte — und vor allem lässt sich
 * jede Muskelgruppe einzeln ansteuern, was ein gerendertes Bild nicht kann.
 */

const MIRROR = 'translate(240,0) scale(-1,1)'

/** Formen je Muskelgruppe. `mirrored` zeichnet die Form zusätzlich gespiegelt. */
interface MuscleShape {
  d: string
  mirrored?: boolean
}

/**
 * Zuordnung Muskelgruppe → Leistungsdimension. Anatomisch begründet:
 * Ausdauer sitzt im Brustkorb, Maxkraft im Schultergürtel, Relativkraft in der
 * Zugmuskulatur der Arme, Kraftausdauer im Rumpf, Schnellkraft in den
 * Oberschenkeln, Agilität in den Unterschenkeln.
 */
const MUSCLE_GROUPS: Record<PerformanceDimension, MuscleShape[]> = {
  endurance: [
    // Brustmuskulatur
    { d: 'M93 128 C101 123 114 123 118 128 L118 158 C108 164 95 160 90 149 Z', mirrored: true },
  ],
  max_strength: [
    // Trapez, in zwei Hälften statt als durchgehendes Band — sonst liest es
    // sich wie ein Kragen.
    { d: 'M104 88 C111 95 118 98 118 100 L118 114 C106 114 98 116 94 119 L88 108 C91 99 96 92 104 88 Z', mirrored: true },
    // Deltoiden
    { d: 'M83 99 C72 106 65 118 62 132 C70 126 79 121 88 122 C89 112 87 103 83 99 Z', mirrored: true },
  ],
  relative_strength: [
    // Bizeps / Trizeps
    { d: 'M60 136 C55 154 52 174 51 192 C58 190 64 186 68 181 C70 162 73 148 76 136 Z', mirrored: true },
    // Unterarme
    { d: 'M50 206 C47 230 45 252 43 276 C49 274 55 270 58 265 C60 242 63 224 66 206 Z', mirrored: true },
  ],
  strength_endurance: [
    // Gerade Bauchmuskulatur
    { d: 'M104 166 h14 a4 4 0 0 1 4 4 v11 a4 4 0 0 1 -4 4 h-14 a4 4 0 0 1 -4 -4 v-11 a4 4 0 0 1 4 -4 Z', mirrored: true },
    { d: 'M105 189 h13 a4 4 0 0 1 4 4 v11 a4 4 0 0 1 -4 4 h-13 a4 4 0 0 1 -4 -4 v-11 a4 4 0 0 1 4 -4 Z', mirrored: true },
    { d: 'M106 212 h12 a4 4 0 0 1 4 4 v11 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-11 a4 4 0 0 1 4 -4 Z', mirrored: true },
    // Unterbauch
    { d: 'M107 236 C112 246 128 246 133 236 L131 256 C126 262 114 262 109 256 Z' },
    // Schräge Bauchmuskulatur
    { d: 'M97 166 C94 186 95 206 100 222 L106 220 C102 202 101 184 103 166 Z', mirrored: true },
  ],
  power: [
    // Quadrizeps
    { d: 'M92 280 C85 302 81 328 80 352 C88 355 97 352 103 347 C105 320 108 298 111 280 Z', mirrored: true },
  ],
  agility: [
    // Knie
    { d: 'M84 366 C88 363 97 363 101 366 C102 372 101 378 99 381 C94 383 90 383 86 381 C84 378 83 372 84 366 Z', mirrored: true },
    // Waden
    { d: 'M79 398 C75 416 73 432 73 448 C80 451 88 449 94 445 C96 427 98 412 100 398 Z', mirrored: true },
  ],
}

const DIMENSION_ORDER = Object.keys(MUSCLE_GROUPS) as PerformanceDimension[]

export interface BodyFigureProps {
  /** Achsenwerte 0–100 je Dimension. Fehlende Achsen bleiben ungefärbt. */
  scores: Partial<Record<PerformanceDimension, number | null>>
  /** Hervorgehobene Gruppe; die übrigen treten zurück. */
  highlighted?: PerformanceDimension | null
  onSelect?: (dimension: PerformanceDimension) => void
  className?: string
  /** Beschriftung für Screenreader — die Figur ist sonst reine Grafik. */
  ariaLabel: string
  /** Ohne Holo-Ring und Kern, für den Einsatz als Wasserzeichen. */
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
  const uid = useId().replace(/:/g, '')
  const clipId = `bf-clip-${uid}`
  const bodyId = `bf-body-${uid}`
  const coreId = `bf-core-${uid}`
  const glowId = `bf-glow-${uid}`
  const ringId = `bf-ring-${uid}`

  return (
    <svg
      viewBox="0 0 240 580"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {/* Direkt die Formen, kein <g>: ein clipPath wertet ausschliesslich
            Formelemente aus, gruppierte Kinder werden ignoriert — der Clip
            wäre sonst leer und würde den ganzen Körper wegschneiden. */}
        <clipPath id={clipId}>
          <SilhouetteShapes />
        </clipPath>

        {/* Körperfläche in der Schriftfarbe: die Figur ist neutral, der Akzent
            bleibt den Messwerten vorbehalten. Funktioniert dadurch in beiden
            Themes — helle Figur auf dunklem Grund, dunkle auf hellem. */}
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="0.08" />
        </linearGradient>

        <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent-glow)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--accent-glow)" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={ringId} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.22" />
        </radialGradient>

        <filter id={glowId} x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Halo: dieselbe Kontur, weichgezeichnet und darunter gelegt. */}
      <g filter={`url(#${glowId})`} opacity="0.55" fill="none" stroke="var(--accent)" strokeWidth="2.4">
        <SilhouetteShapes />
      </g>

      <g clipPath={`url(#${clipId})`}>
        <g fill={`url(#${bodyId})`}>
          <SilhouetteShapes />
        </g>

        {DIMENSION_ORDER.map((dimension) => {
          const score = scores[dimension]
          if (score == null) return null
          const dimmed = highlighted != null && highlighted !== dimension
          // 0–100 auf einen sichtbaren, aber nie deckenden Bereich abbilden.
          const fill = (0.1 + (score / 100) * 0.3) * (dimmed ? 0.25 : 1)
          const line = (0.3 + (score / 100) * 0.5) * (dimmed ? 0.3 : 1)

          return (
            <g
              key={dimension}
              className="transition-opacity duration-300"
              fill="var(--accent)"
              fillOpacity={fill}
              stroke="var(--accent)"
              strokeOpacity={line}
              strokeWidth="1.1"
            >
              {MUSCLE_GROUPS[dimension].map((shape, index) => (
                <g key={index}>
                  <path d={shape.d} />
                  {shape.mirrored && <path d={shape.d} transform={MIRROR} />}
                </g>
              ))}
            </g>
          )
        })}

        {!plain && (
          <ellipse cx="120" cy="190" rx="58" ry="70" fill={`url(#${coreId})`} />
        )}
      </g>

      {/* Kontur zuletzt, damit die Figur klar begrenzt bleibt. */}
      <g fill="none" stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="1.3">
        <SilhouetteShapes />
      </g>

      {!plain && (
        // Holografisches Feld unter den Füssen.
        <g>
          <ellipse cx="120" cy="540" rx="86" ry="24" fill={`url(#${ringId})`} />
          <ellipse
            cx="120"
            cy="540"
            rx="86"
            ry="24"
            fill="none"
            stroke="var(--accent)"
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
          <ellipse
            cx="120"
            cy="540"
            rx="54"
            ry="15"
            fill="none"
            stroke="var(--accent)"
            strokeOpacity="0.22"
            strokeWidth="1"
          />
          <ellipse cx="120" cy="540" rx="26" ry="7" fill="var(--accent)" opacity="0.12" />
        </g>
      )}

      {/* Trefferflächen: die Muskelgruppen selbst, unsichtbar und ohne Clip,
          damit auch der Rand einer Gruppe noch trifft. */}
      {onSelect &&
        DIMENSION_ORDER.map((dimension) => (
          <g
            key={`hit-${dimension}`}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onSelect(dimension)}
          >
            {MUSCLE_GROUPS[dimension].map((shape, index) => (
              <g key={index}>
                <path d={shape.d} />
                {shape.mirrored && <path d={shape.d} transform={MIRROR} />}
              </g>
            ))}
          </g>
        ))}
    </svg>
  )
}

/**
 * Die Silhouette — einmal definiert, dreifach benutzt (Clip, Halo, Kontur).
 * Der Hals gehört zum Torso, damit an der Schulter keine Kante entsteht.
 *
 * Gibt bewusst ein Fragment und keine Gruppe zurück: nur so lässt sie sich
 * auch als Inhalt eines clipPath verwenden.
 */
function SilhouetteShapes() {
  const torso =
    'M106 54 C105 68 104 78 100 84 C90 88 80 96 74 110 C71 124 72 140 76 158 ' +
    'C82 176 88 186 90 198 C91 212 88 226 86 240 C84 252 86 264 90 272 L150 272 ' +
    'C154 264 156 252 154 240 C152 226 149 212 150 198 C152 186 158 176 164 158 ' +
    'C168 140 169 124 166 110 C160 96 150 88 140 84 C136 78 135 68 134 54 Z'
  const arm =
    'M79 93 C67 99 60 115 57 134 C53 160 50 188 48 216 C46 242 44 268 42 296 ' +
    'C41 314 40 332 40 344 C40 354 44 360 49 359 C54 358 56 352 56 344 ' +
    'C57 330 59 312 61 294 C64 266 67 240 70 216 C73 188 77 160 81 132 ' +
    'C83 118 87 106 94 98 Z'
  const leg =
    'M89 264 C81 294 76 328 75 358 C75 374 76 384 78 392 C75 412 71 432 71 448 ' +
    'C72 466 77 478 79 490 C77 500 75 510 77 516 C81 522 95 522 99 516 ' +
    'C101 510 96 500 93 490 C95 476 99 462 100 448 C102 432 105 412 106 392 ' +
    'C107 380 108 370 109 358 C111 330 114 296 116 272 L116 264 Z'

  return (
    <>
      <ellipse cx="120" cy="36" rx="19" ry="25" />
      <path d={torso} />
      <path d={arm} />
      <path d={arm} transform={MIRROR} />
      <path d={leg} />
      <path d={leg} transform={MIRROR} />
    </>
  )
}
