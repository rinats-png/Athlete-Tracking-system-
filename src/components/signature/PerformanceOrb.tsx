import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/features/shared/useLocale'
import { axisLabel } from '@/data/profileAxes'
import { formatNumber } from '@/lib/format'
import type { PerformanceScore } from '@/domain/performanceScore'

/**
 * Der Performance Orb — das Signature-Element des Systems.
 *
 * Ein organisch geschlossener Weg durch die Dimensionsknoten. Der Abstand
 * jedes Knotens vom Mittelpunkt IST sein Wert; die Form des Orbs ist damit
 * das Leistungsprofil und keine Illustration davon. Wer in einer Dimension
 * besser wird, sieht die Form dort nach aussen gehen.
 *
 * DREI ENTSCHEIDUNGEN, DIE HIER WICHTIG SIND:
 *
 * 1. Achsen OHNE belegte Referenz liegen auf einem festen kleinen Radius und
 *    tragen einen offenen Knoten. Sie als Null zu zeichnen hiesse, eine
 *    fehlende Referenz als schlechte Leistung darzustellen — das ist die
 *    gefährlichste Lüge, die dieses Bild erzählen könnte.
 *
 * 2. Die Atmung ist winzig (±2,2 px) und langsam. Sie sagt «das ist ein
 *    lebendes Profil», nicht «schau her». Bei `prefers-reduced-motion`
 *    steht sie still — die Form bleibt trotzdem korrekt, weil die Ruhelage
 *    die Daten sind und die Bewegung nur eine Auslenkung davon.
 *
 * 3. Gezeichnet wird auf `requestAnimationFrame` mit direkten
 *    Attributschreibungen, nicht über den Zustand von React. Ein
 *    Zustandswechsel je Bild würde den ganzen Bildschirm neu rendern.
 */

/** Radius bei Wert 0. Auch ein leeres Profil ist eine Form, kein Punkt. */
const BASE = 32
const SCALE = 0.6
const CX = 112
const CY = 112

export interface OrbAxis {
  axisId: string
  /** 0–100, oder null wenn keine belegte Referenz vorliegt. */
  score: number | null
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Der geschlossene Weg durch die Punkte, weich über Quadratbögen geführt. */
function pathThrough(points: { x: number; y: number }[]): string {
  if (points.length < 3) return ''
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  })
  const start = mid(points[0], points[1])
  let d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`
  for (let i = 1; i <= points.length; i++) {
    const current = points[i % points.length]
    const next = points[(i + 1) % points.length]
    const end = mid(current, next)
    d += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
  }
  return `${d} Z`
}

export function PerformanceOrb({
  axes,
  score,
  delta,
  className,
}: {
  axes: OrbAxis[]
  score: PerformanceScore
  /** Satz unter dem Wert, z. B. «+6 seit deinem ersten Test». Optional. */
  delta?: string | null
  className?: string
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const pathRef = useRef<SVGPathElement>(null)
  const nodesRef = useRef<(SVGGElement | null)[]>([])
  const [shown, setShown] = useState(score.value == null ? null : 0)

  // Höchstens sechs Achsen: mehr Knoten machen die Form unlesbar, und die
  // Spezifikation nennt sechs Dimensionen.
  const dims = useMemo(() => axes.slice(0, 6), [axes])

  /**
   * Der Zähler des Werts. Kubisch auslaufend, damit er ankommt statt
   * abzubrechen — und nur einmal je Wert, nicht bei jedem Rendern.
   */
  useEffect(() => {
    if (score.value == null) {
      setShown(null)
      return
    }
    const target = score.value
    if (prefersReducedMotion()) {
      setShown(target)
      return
    }
    let raf = 0
    const started = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - started) / 1300, 1)
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score.value])

  /** Form und Knoten. Läuft ausserhalb von React, Bild für Bild. */
  useEffect(() => {
    const path = pathRef.current
    if (!path || dims.length < 3) return

    const still = prefersReducedMotion()
    let raf = 0
    let phase = 0

    const draw = () => {
      const points = dims.map((dim, i) => {
        const angle = ((-90 + (i * 360) / dims.length) * Math.PI) / 180
        // Eine Achse ohne Referenz bekommt den Grundradius — nicht null.
        const value = dim.score ?? 0
        const breathe = still ? 0 : Math.sin(phase + i * 1.1) * 2.2
        const r = BASE + value * SCALE + breathe
        return { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r, angle, r }
      })
      path.setAttribute('d', pathThrough(points))
      points.forEach((p, i) => {
        const node = nodesRef.current[i]
        if (!node) return
        node.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`)
        const label = node.querySelector('text')
        if (label) {
          label.setAttribute('x', (Math.cos(p.angle) * 17).toFixed(2))
          label.setAttribute('y', (Math.sin(p.angle) * 17 + 3).toFixed(2))
        }
      })
      if (!still) {
        phase += 0.007
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [dims])

  const label = (axisId: string) => axisLabel(axisId, t, locale)

  return (
    <div className={className}>
      <div className="relative mx-auto aspect-square w-full max-w-[240px]">
        <svg
          viewBox="0 0 224 224"
          className="absolute inset-0 overflow-visible"
          role="img"
          aria-label={
            score.value == null
              ? t('orb.altNoScore')
              : t('orb.alt', { score: score.value, rated: score.ratedAxes, total: score.totalAxes })
          }
        >
          <path
            ref={pathRef}
            fill="color-mix(in oklab, var(--accent-glow) 55%, transparent)"
            stroke="var(--accent)"
            strokeWidth={1.4}
          />
          {dims.map((dim, i) => (
            <g
              key={dim.axisId}
              ref={(el) => {
                nodesRef.current[i] = el
              }}
            >
              {/* Ein offener Kreis heisst: gemessen, aber ohne belegte
                  Referenz. Gefüllt heisst: eingeordnet. */}
              <circle
                r={4.5}
                fill={dim.score == null ? 'var(--surface)' : 'var(--accent)'}
                stroke="var(--accent)"
                strokeWidth={dim.score == null ? 1.4 : 0}
              />
              <text
                fontSize={7.5}
                letterSpacing={1}
                textAnchor="middle"
                fill="var(--ink-muted)"
                className="uppercase"
              >
                {label(dim.axisId)}
              </text>
            </g>
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {shown == null ? (
            <p className="max-w-[9rem] text-[12px] leading-snug text-ink-secondary">
              {t('orb.noScore')}
            </p>
          ) : (
            <>
              <span className="readout text-[48px] leading-none font-bold tabular-nums">
                {formatNumber(shown, locale, 0)}
              </span>
              <span className="label-tag mt-1.5">{t('score.title')}</span>
            </>
          )}
          <span className="readout mt-2 rounded-pill bg-accent-quiet px-2.5 py-1 text-[10px] whitespace-nowrap text-accent-text">
            {delta ?? t('score.coverage', { rated: score.ratedAxes, total: score.totalAxes })}
          </span>
        </div>
      </div>
    </div>
  )
}
