import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Dumbbell, Flame, Footprints, HeartPulse, Scale } from 'lucide-react'
import { BodyFigure } from '@/components/body/BodyFigure'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AppLocale, PerformanceDimension, RadarAxis, ScoreMode } from '@/types/domain'

/**
 * Der Körper als Einstieg ins Leistungsprofil.
 *
 * Statt einer Zahlenwand steht am Anfang die Frage "wie steht mein Körper
 * gerade da?". Die sechs Knoten liegen an der Körperregion, die sie messen;
 * ein Antippen hebt Knoten und Region gemeinsam hervor und blendet die
 * Detailkarte ein.
 */

const NODES: {
  dimension: PerformanceDimension
  icon: typeof HeartPulse
  /**
   * Position des Knotens und Ankerpunkt am Körper, jeweils in Prozent der
   * Hero-Fläche. Die Anker liegen auf der Muskelgruppe, die der Knoten
   * benennt, und immer auf der Seite, auf der auch der Knoten sitzt.
   */
  node: [number, number]
  anchor: [number, number]
}[] = [
  { dimension: 'max_strength', icon: Dumbbell, node: [12, 17], anchor: [40.8, 22.5] },
  { dimension: 'relative_strength', icon: Scale, node: [9, 45], anchor: [37.7, 29.5] },
  { dimension: 'agility', icon: Footprints, node: [13, 75], anchor: [43.9, 69.5] },
  { dimension: 'endurance', icon: HeartPulse, node: [88, 21], anchor: [54.4, 21.5] },
  { dimension: 'strength_endurance', icon: Flame, node: [91, 49], anchor: [52.2, 31.5] },
  { dimension: 'power', icon: Activity, node: [87, 73], anchor: [53.5, 51.5] },
]

export function BodyHero({
  axes,
  mode,
  locale,
  index,
}: {
  axes: RadarAxis[]
  mode: ScoreMode
  locale: AppLocale
  /** Gesamtindex, zentral berechnet — die Ansicht rechnet nicht selbst. */
  index: number | null
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<PerformanceDimension | null>(null)

  const scores = useMemo(
    () => Object.fromEntries(axes.map((axis) => [axis.dimension, axis.score])) as Record<
      PerformanceDimension,
      number | null
    >,
    [axes],
  )

  const covered = axes.filter((axis) => axis.score != null)
  const detail = selected ? axes.find((axis) => axis.dimension === selected) : null
  const unit = mode === 'population' ? t('units.percentile') : t('units.percentOfBest')

  return (
    <div className="relative">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[560px] sm:aspect-[10/11]">
        {/* Verbindungslinien. Eigenes Koordinatensystem 0–100, damit Knoten
            (HTML) und Linien (SVG) dieselben Prozentwerte teilen. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-0 hidden h-full w-full sm:block"
        >
          {NODES.map(({ dimension, node, anchor }) => {
            if (scores[dimension] == null) return null
            const dimmed = selected != null && selected !== dimension
            return (
              <g key={dimension} opacity={dimmed ? 0.2 : 0.55}>
                <line
                  x1={node[0]}
                  y1={node[1]}
                  x2={anchor[0]}
                  y2={anchor[1]}
                  stroke="var(--accent)"
                  strokeWidth="0.16"
                  strokeDasharray="0.9 1.4"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={anchor[0]} cy={anchor[1]} r="0.5" fill="var(--accent)" />
              </g>
            )
          })}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <BodyFigure
            scores={scores}
            highlighted={selected}
            onSelect={(dimension) =>
              setSelected((current) => (current === dimension ? null : dimension))
            }
            className="h-[94%]"
            ariaLabel={t('body.figureLabel')}
          />
        </div>

        {NODES.map(({ dimension, icon: Icon, node }) => {
          const score = scores[dimension]
          const active = selected === dimension
          const dimmed = selected != null && !active
          const alignRight = node[0] > 50

          return (
            <button
              key={dimension}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setSelected((current) => (current === dimension ? null : dimension))
              }
              style={{ left: `${node[0]}%`, top: `${node[1]}%` }}
              className={cn(
                'absolute hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-opacity sm:flex',
                dimmed && 'opacity-35',
                score == null && 'opacity-30',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border transition-colors',
                  active
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-line-strong bg-surface-sunken text-accent-text',
                )}
              >
                <Icon size={17} strokeWidth={1.8} aria-hidden />
              </span>
              <span className={cn('label-tag whitespace-nowrap', alignRight && 'text-right')}>
                {t(`dimensions.${dimension}`)}
              </span>
              <span className="readout text-[15px] leading-none">
                {score == null ? '—' : formatNumber(score, locale, 0)}
              </span>
            </button>
          )
        })}

        {/* Detailkarte zur gewählten Achse — erscheint nur auf Anforderung,
            damit der Ruhezustand ruhig bleibt. */}
        {detail && (
          <div className="absolute inset-x-3 bottom-2 border border-white/12 bg-display-raised/92 p-3 backdrop-blur-sm sm:inset-x-auto sm:right-0 sm:w-[190px]">
            <span className="label-tag">{t(`dimensions.${detail.dimension}`)}</span>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="readout text-[26px] leading-none">
                {detail.score == null ? '—' : formatNumber(detail.score, locale, 0)}
              </span>
              <span className="text-[11px] text-ink-muted">{unit}</span>
            </p>
            <p className="mt-2 text-[12px] leading-snug text-ink-secondary">
              {t('body.detail', {
                count: detail.testCount,
                context: mode === 'population' ? 'population' : 'personalBest',
              })}
            </p>
          </div>
        )}
      </div>

      <div className="mt-1 flex flex-col items-center border-t border-line px-4 py-4">
        <span className="readout text-[46px] leading-none font-medium text-accent-text">
          {index == null ? '—' : formatNumber(index, locale, 0)}
        </span>
        <span className="label-tag mt-2">{t('body.index')}</span>
        <p className="mt-1.5 text-center text-[12px] text-ink-secondary">
          {t('radar.coverage', { count: covered.length })} · {unit}
        </p>
      </div>
    </div>
  )
}
