import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HatchPattern, STRIPE_GAP, useHatchId, useMeasuredWidth } from './marks'
import { formatDate, formatDuration, formatNumber } from '@/lib/format'
import type { AppLocale, TrendPoint } from '@/types/domain'

/**
 * Verlauf eines einzelnen Tests über die Messzeitpunkte.
 *
 * WARUM KEINE LINIE MEHR
 *
 * Eine durchgezogene Linie zwischen zwei Diagnostikterminen behauptet, dass
 * dazwischen etwas gemessen wurde. Dazwischen wurde nichts gemessen. Bei drei
 * Tests in einer Woche und danach einem halben Jahr Pause führt sie geradezu
 * in die Irre: die Pause sieht aus wie eine ruhige Entwicklung.
 *
 * Jetzt ist der Verlauf ein SEISMOGRAMM. Die feinen Striche sind die
 * angenommene Verbindung — sie sind blass, weil sie nur eine Lesehilfe sind.
 * Die kräftigen Striche sind die tatsächlichen Messungen. Und ein Zeitraum,
 * der deutlich länger ist als der übliche Abstand, wird SCHRAFFIERT: dort
 * liegt keine Messung, und das soll man sehen.
 *
 * Die Achse beginnt nicht bei null: bei Diagnostikwerten ist der interessante
 * Bereich die Spanne der tatsächlichen Messwerte, und die Nulllinie hätte
 * keine Aussage.
 */

const PAD_L = 46
const PAD_R = 12
const PAD_T = 16

/**
 * Ab welchem Vielfachen des üblichen Abstands ein Zeitraum als Lücke gilt.
 *
 * 1,8 und nicht 2: Diagnostik wird selten auf den Tag genau eingehalten, und
 * bei genau 2 fiele ein um zwei Wochen verschobener Termin schon als Lücke
 * auf. Ab 1,8 ist der Abstand fast doppelt so lang wie gewohnt — das ist eine
 * Pause und keine Verschiebung.
 */
const GAP_FACTOR = 1.8

export function TrendChart({
  points,
  unit,
  locale,
  label,
  height = 180,
  showFit = false,
}: {
  points: TrendPoint[]
  unit: string
  locale: AppLocale
  label: string
  height?: number
  /** Ausgleichsgerade einblenden. Erst ab drei Messungen sinnvoll. */
  showFit?: boolean
}) {
  const { t } = useTranslation()
  const hatch = useHatchId()
  const [box, W] = useMeasuredWidth()
  const H = height

  const view = useMemo(() => {
    if (points.length === 0) return null
    const sorted = [...points].sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    const values = sorted.map((p) => p.value)
    const days = sorted.map((p) => new Date(p.performedAt).getTime() / 86_400_000)

    const min = Math.min(...values)
    const max = Math.max(...values)
    // Etwas Luft, damit der höchste Wert nicht am Rand klebt. Bei einer
    // einzigen Messung eine feste Spanne, sonst wäre der Nenner null.
    const span = max - min || Math.abs(max) * 0.1 || 1
    const lo = min - span * 0.18
    const hi = max + span * 0.18

    const x = (i: number) =>
      PAD_L + (sorted.length === 1 ? (W - PAD_L - PAD_R) / 2 : (i * (W - PAD_L - PAD_R)) / (sorted.length - 1))
    const y = (v: number) => H - 26 - ((v - lo) / (hi - lo)) * (H - 26 - PAD_T)

    /**
     * Ausgleichsgerade über die tatsächlichen Messzeitpunkte — nicht über den
     * Index. Bei ungleichen Abständen läge eine Gerade über den Index falsch.
     */
    const fit = (() => {
      if (!showFit || sorted.length < 3) return null
      const n = days.length
      const meanX = days.reduce((a, b) => a + b, 0) / n
      const meanY = values.reduce((a, b) => a + b, 0) / n
      const sxx = days.reduce((sum, d) => sum + (d - meanX) ** 2, 0)
      if (sxx === 0) return null
      const slope = days.reduce((sum, d, i) => sum + (d - meanX) * (values[i] - meanY), 0) / sxx
      return days.map((d) => meanY + slope * (d - meanX))
    })()

    /** Zeiträume ohne Messung. Der Bezug ist der Median der Abstände. */
    const gaps: { from: number; to: number }[] = []
    if (sorted.length > 2) {
      const deltas = days.slice(1).map((d, i) => d - days[i])
      const median = [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length / 2)]
      deltas.forEach((d, i) => {
        if (median > 0 && d > median * GAP_FACTOR) gaps.push({ from: i, to: i + 1 })
      })
    }

    return { sorted, values, x, y, lo, hi, fit, gaps }
  }, [points, showFit, H, W])

  const formatValue = (value: number) =>
    unit === 's' ? formatDuration(value) : formatNumber(value, locale, value < 10 ? 2 : 0)

  if (!view) return null
  const { sorted, x, y, lo, hi, fit, gaps } = view

  // Drei Marken auf der Werteachse: mehr wäre ein Gitter, weniger kein Bezug.
  const ticks = [lo + (hi - lo) * 0.12, (lo + hi) / 2, hi - (hi - lo) * 0.12]

  return (
    <div ref={box} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block"
        role="img"
        aria-label={label}
      >
        <HatchPattern id={hatch} />

        {ticks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              y1={y(v)}
              x2={W - PAD_R}
              y2={y(v)}
              stroke="var(--line)"
              strokeWidth={0.7}
            />
            <text
              x={PAD_L - 6}
              y={y(v) + 3}
              textAnchor="end"
              className="readout"
              fontSize={9}
              fill="var(--ink-muted)"
            >
              {formatValue(v)}
            </text>
          </g>
        ))}

        {/* Zeiträume ohne Messung. */}
        {gaps.map((g) => (
          <rect
            key={g.from}
            x={x(g.from)}
            y={PAD_T}
            width={x(g.to) - x(g.from)}
            height={H - 26 - PAD_T}
            fill={`url(#${hatch})`}
          />
        ))}

        {/* Die feinen Striche: die angenommene Verbindung, keine Messung. */}
        {sorted.length > 1 &&
          Array.from({ length: Math.floor((W - PAD_L - PAD_R) / STRIPE_GAP) }, (_, k) => {
            const px = PAD_L + k * STRIPE_GAP
            const pos = ((px - PAD_L) / (W - PAD_L - PAD_R)) * (sorted.length - 1)
            const i0 = Math.min(sorted.length - 2, Math.floor(pos))
            const f = pos - i0
            const v = sorted[i0].value + (sorted[i0 + 1].value - sorted[i0].value) * f
            return (
              <line
                key={k}
                x1={px}
                y1={H - 26}
                x2={px}
                y2={y(v)}
                stroke="var(--accent)"
                strokeWidth={1}
                opacity={0.32}
              />
            )
          })}

        {/* Die Ausgleichsgerade als Lesehilfe. */}
        {fit && (
          <line
            x1={x(0)}
            y1={y(fit[0])}
            x2={x(sorted.length - 1)}
            y2={y(fit[fit.length - 1])}
            stroke="var(--ink-muted)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.8}
          />
        )}

        {/* Die Messungen selbst. */}
        {sorted.map((p, i) => (
          <g key={p.performedAt + i}>
            <title>{`${formatDate(p.performedAt, locale)}: ${formatValue(p.value)} ${unit === 's' ? '' : unit}`}</title>
            <line
              x1={x(i)}
              y1={H - 26}
              x2={x(i)}
              y2={y(p.value) - 4}
              stroke="var(--accent)"
              strokeWidth={2}
            />
            <line
              x1={x(i) - 4}
              y1={y(p.value)}
              x2={x(i) + 4}
              y2={y(p.value)}
              stroke="var(--ink)"
              strokeWidth={2}
            />
            <text
              x={x(i)}
              y={H - 10}
              // Am Rand bündig, sonst mittig: das letzte Datum lief sonst
              // über die Kante hinaus und wurde abgeschnitten.
              textAnchor={i === 0 ? 'start' : i === sorted.length - 1 ? 'end' : 'middle'}
              className="readout"
              fontSize={8.5}
              fill="var(--ink-muted)"
            >
              {formatDate(p.performedAt, locale)}
            </text>
          </g>
        ))}

        <line
          x1={PAD_L}
          y1={H - 26}
          x2={W - PAD_R}
          y2={H - 26}
          stroke="var(--line-strong)"
          strokeWidth={0.9}
        />
        {gaps.length > 0 && (
          <text x={W - PAD_R} y={PAD_T - 4} textAnchor="end" fontSize={8.5} fill="var(--ink-muted)">
            {t('charts.gapHint')}
          </text>
        )}
      </svg>
    </div>
  )
}
