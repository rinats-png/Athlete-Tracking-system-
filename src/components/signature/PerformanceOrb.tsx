import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/features/shared/useLocale'
import { axisLabel } from '@/data/profileAxes'
import type { PerformanceScore } from '@/domain/performanceScore'

/**
 * Der Performance Orb — das Signature-Element des Systems.
 *
 * Ein organisch geschlossener Weg DURCH die Achsenknoten. Der Abstand jedes
 * Knotens vom Mittelpunkt IST sein Wert; die Form des Orbs ist damit das
 * Leistungsprofil und keine Illustration davon.
 *
 * VIER ENTSCHEIDUNGEN, DIE HIER WICHTIG SIND:
 *
 * 1. Achsen OHNE belegte Referenz liegen auf einem festen kleinen Radius und
 *    tragen einen offenen Knoten. Sie als Null zu zeichnen hiesse, eine
 *    fehlende Referenz als schlechte Leistung darzustellen — das ist die
 *    gefährlichste Lüge, die dieses Bild erzählen könnte.
 *
 * 2. Die Kurve läuft durch die Knoten. Vorher führte sie über die
 *    MITTELPUNKTE zwischen ihnen (quadratische Bögen). Das sah weich aus,
 *    war aber falsch: bei einem Profil mit einer starken und vier
 *    unbelegten Achsen erreichte die Form den starken Knoten nie, und der
 *    Punkt schwebte sichtbar neben der Fläche. Jetzt ist es eine
 *    geschlossene Catmull-Rom-Kurve — sie geht durch jeden Punkt, und die
 *    Zusage des ersten Absatzes stimmt wieder.
 *
 * 3. Die Beschriftungen liegen auf einem RING um die Form, nicht am Knoten.
 *    Am Knoten wanderten sie mit dem Wert nach innen und schoben sich über
 *    die Zahl in der Mitte; auf dem Ring stehen sie immer aussen. Ihre
 *    Ausrichtung folgt der Seite: rechts linksbündig, links rechtsbündig,
 *    oben und unten mittig — so wachsen sie vom Bild weg statt darüber.
 *
 *    Dazu gehört der MASSSTAB: zwei blasse Kreise bei 50 und 100 und eine
 *    Speiche je Achse. Ohne ihn stand eine kleine Form in der Mitte und die
 *    Beschriftungen weit draussen im Nichts — der Abstand sah aus wie ein
 *    Fehler im Satz. Mit ihm ist derselbe Abstand die Aussage: so weit ist
 *    diese Achse vom oberen Ende der Skala entfernt.
 *
 * 4. Die Atmung ist winzig (±2 px) und langsam. Sie sagt «das ist ein
 *    lebendes Profil», nicht «schau her». Bei `prefers-reduced-motion`
 *    steht sie still — die Form bleibt trotzdem korrekt, weil die Ruhelage
 *    die Daten sind und die Bewegung nur eine Auslenkung davon.
 *
 * WAS HIER NICHT MEHR STEHT: die Zusammenfassungszahl in der Mitte. Ein
 * grosser Zahlenblock im Zentrum setzt voraus, dass der innere Radius frei
 * ist — bei diesem Datenmodell ist er es gerade dann nicht, wenn es darauf
 * ankommt: eine Achse ohne belegte Referenz liegt auf dem Grundradius, also
 * nah am Mittelpunkt, und ihr Knoten lag dann in der Zahl. Die Zahl steht
 * mit ihrer Abdeckung, ihrem Balken und ihrem Vorbehalt unmittelbar unter
 * dem Orb (`ScoreSummary`); zweimal gehörte sie ohnehin nie hin. Der Orb
 * zeigt die FORM, die Zusammenfassung zeigt die ZAHL.
 *
 * Gezeichnet wird auf `requestAnimationFrame` mit direkten
 * Attributschreibungen, nicht über den Zustand von React: ein
 * Zustandswechsel je Bild würde den ganzen Bildschirm neu rendern. Nur die
 * Form und die Knoten atmen; die Beschriftungen stehen fest, sonst
 * zitterten sie mit.
 */

/** Zeichenfläche. Breiter als hoch, weil die Beschriftungen seitlich Platz brauchen. */
const W = 320
const H = 212
const CX = 160
const CY = 106
/** Radius bei Wert 0. Auch ein leeres Profil ist eine Form, kein Punkt. */
const BASE = 26
const SCALE = 0.46
/** Radius bei Wert 100 — der äussere Massstabsring. */
const FULL_R = BASE + 100 * SCALE
/** Ring der Beschriftungen, knapp ausserhalb des Massstabs. */
const LABEL_R = FULL_R + 12

export interface OrbAxis {
  axisId: string
  /** 0–100, oder null wenn keine belegte Referenz vorliegt. */
  score: number | null
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Geschlossene Catmull-Rom-Kurve, als kubische Bézier geschrieben.
 *
 * Sie läuft durch JEDEN Punkt. Die Spannung ist leicht unter 1 gesetzt: bei
 * einem grossen Sprung zwischen zwei Nachbarn — eine starke Achse neben
 * vier unbelegten — wölbt sich eine volle Catmull-Rom über den Knoten
 * hinaus, und die Form behauptete dort mehr, als gemessen wurde.
 */
function closedSpline(points: { x: number; y: number }[], tension = 0.82): string {
  const n = points.length
  if (n < 3) return ''
  const f = (v: number) => v.toFixed(2)
  let d = `M ${f(points[0].x)} ${f(points[0].y)}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension
    d += ` C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2.x)} ${f(p2.y)}`
  }
  return `${d} Z`
}

/** Winkel der i-ten Achse, im Bogenmass. Die erste steht oben. */
const angleOf = (i: number, count: number) => ((-90 + (i * 360) / count) * Math.PI) / 180

export function PerformanceOrb({
  axes,
  score,
  className,
}: {
  axes: OrbAxis[]
  score: PerformanceScore
  className?: string
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const pathRef = useRef<SVGPathElement>(null)
  const nodesRef = useRef<(SVGCircleElement | null)[]>([])

  // Höchstens sechs Achsen: mehr Knoten machen die Form unlesbar, und die
  // Spezifikation nennt sechs Dimensionen.
  const dims = useMemo(() => axes.slice(0, 6), [axes])

  /** Form und Knoten. Läuft ausserhalb von React, Bild für Bild. */
  useEffect(() => {
    const path = pathRef.current
    if (!path || dims.length < 3) return

    const still = prefersReducedMotion()
    let raf = 0
    let phase = 0

    const draw = () => {
      const points = dims.map((dim, i) => {
        const angle = angleOf(i, dims.length)
        // Eine Achse ohne Referenz bekommt den Grundradius — nicht null.
        const value = dim.score ?? 0
        const breathe = still ? 0 : Math.sin(phase + i * 1.1) * 2
        const r = BASE + value * SCALE + breathe
        return { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r }
      })
      path.setAttribute('d', closedSpline(points))
      points.forEach((p, i) => {
        const node = nodesRef.current[i]
        if (!node) return
        node.setAttribute('cx', p.x.toFixed(2))
        node.setAttribute('cy', p.y.toFixed(2))
      })
      if (!still) {
        phase += 0.007
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [dims])

  /**
   * Die Beschriftungen auf dem Ring — einmal gerechnet, nicht je Bild.
   * `anchor` hält sie vom Bild weg, `dy` setzt die Grundlinie: oben über
   * den Punkt, unten darunter, seitlich auf halbe Zeilenhöhe.
   */
  const labels = useMemo(
    () =>
      dims.map((dim, i) => {
        const angle = angleOf(i, dims.length)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const anchor: 'start' | 'end' | 'middle' =
          cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
        return {
          axisId: dim.axisId,
          x: CX + cos * LABEL_R,
          y: CY + sin * LABEL_R,
          anchor,
          dy: sin < -0.7 ? -2 : sin > 0.7 ? 9 : 3.2,
        }
      }),
    [dims],
  )

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block w-full max-w-[360px]"
        role="img"
        aria-label={
          score.value == null
            ? t('orb.altNoScore')
            : t('orb.alt', { score: score.value, rated: score.ratedAxes, total: score.totalAxes })
        }
      >
        {/* Der Massstab, blass und ohne Beschriftung: er ordnet ein, er
            konkurriert nicht mit den Daten. */}
        <g stroke="var(--grid)" fill="none" aria-hidden>
          <circle cx={CX} cy={CY} r={FULL_R} />
          <circle cx={CX} cy={CY} r={BASE + 50 * SCALE} />
          {dims.map((dim, i) => {
            const angle = angleOf(i, dims.length)
            return (
              <line
                key={dim.axisId}
                x1={CX}
                y1={CY}
                x2={CX + Math.cos(angle) * FULL_R}
                y2={CY + Math.sin(angle) * FULL_R}
              />
            )
          })}
        </g>

        <path
          ref={pathRef}
          fill="color-mix(in oklab, var(--accent-glow) 55%, transparent)"
          stroke="var(--accent)"
          strokeWidth={1.4}
        />

        {/* Ein offener Kreis heisst: gemessen, aber ohne belegte Referenz.
            Gefüllt heisst: eingeordnet. */}
        {dims.map((dim, i) => (
          <circle
            key={dim.axisId}
            ref={(el) => {
              nodesRef.current[i] = el
            }}
            r={4.5}
            data-orb-node={dim.axisId}
            fill={dim.score == null ? 'var(--surface)' : 'var(--accent)'}
            stroke="var(--accent)"
            strokeWidth={dim.score == null ? 1.4 : 0}
          />
        ))}

        {labels.map((label) => (
          <text
            key={label.axisId}
            x={label.x}
            y={label.y}
            dy={label.dy}
            textAnchor={label.anchor}
            fontFamily="var(--font-display)"
            fontSize={9}
            fontWeight={600}
            letterSpacing={0.9}
            fill="var(--ink-muted)"
            data-orb-label={label.axisId}
          >
            {axisLabel(label.axisId, t, locale).toUpperCase()}
          </text>
        ))}

      </svg>
    </div>
  )
}
