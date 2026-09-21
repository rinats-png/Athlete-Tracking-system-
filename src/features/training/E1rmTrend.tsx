import { useMeasuredWidth } from '@/components/charts/marks'
import type { TrendPoint } from '@/types/domain'

/**
 * Der e1RM einer Übung über die Einheiten — klein, ein Punkt je Einheit.
 *
 * Kein Liniendiagramm: zwischen zwei Einheiten wurde nichts geschätzt. Die
 * Achse beginnt bei der Spanne der Werte, nicht bei null — 100 kg auf einer
 * Null-Achse wäre ein Strich ohne Aussage.
 */
export function E1rmTrend({ points, height = 40, label }: { points: TrendPoint[]; height?: number; label: string }) {
  const [box, W] = useMeasuredWidth(200)
  const H = height
  const PAD = 5
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.abs(max) * 0.1 || 1
  const lo = min - span * 0.25
  const hi = max + span * 0.25
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (points.length - 1))
  const y = (v: number) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2)
  return (
    <div ref={box} className="w-full">
      <svg width={W} height={H} role="img" aria-label={label} className="block overflow-visible">
        {points.map((p, i) => (
          <g key={p.performedAt}>
            <title>{`${p.performedAt.slice(0, 10)}: ${p.value.toFixed(1)} kg`}</title>
            <line x1={x(i)} x2={x(i)} y1={y(p.value)} y2={H - PAD} stroke="var(--line)" strokeWidth={1} />
            <circle cx={x(i)} cy={y(p.value)} r={3} fill="var(--accent)" />
          </g>
        ))}
      </svg>
    </div>
  )
}
