import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table2, Radar as RadarIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HatchPattern, stripeFan, useHatchId } from './marks'
import { formatNumber, formatDate } from '@/lib/format'
import { axisLabel } from '@/data/profileAxes'
import type { AppLocale, PerformanceDimension, RadarAxis, ScoreMode } from '@/types/domain'

interface RadarProfileProps {
  axes: RadarAxis[]
  /** Zweite Serie: dieselben Achsen zu einem früheren Zeitpunkt. */
  previousAxes?: RadarAxis[]
  previousLabel?: string
  mode: ScoreMode
  locale: AppLocale
  /**
   * Anforderungskontur der gewählten Disziplin (Achsengewichte 0–1).
   *
   * Nur im Populationsmodus sinnvoll: dort ist die Skala ein Perzentil und
   * die Kontur sagt «hier sollte ein Wettkämpfer dieser Disziplin liegen».
   * Im Bestleistungsmodus wäre sie eine Linie ohne Bezug.
   */
  disciplineWeights?: Partial<Record<PerformanceDimension, number>>
  disciplineLabel?: string
}

/*
 * Breiter als hoch: die Beschriftungen links und rechts brauchen Platz, sonst
 * schneidet der Rahmen «SCHNELLKRAFT» in der Mitte durch. Ein quadratischer
 * Ausschnitt sah im Entwurf richtig aus und war im Betrieb falsch.
 */
const VIEW_W = 480
const VIEW_H = 330
const CX = VIEW_W / 2
const CY = VIEW_H / 2 - 4
/*
 * Der Kreis nimmt bewusst nicht die volle Breite: links und rechts steht je
 * eine Beschriftung wie «KRAFTAUSDAUER», und die braucht rund 110 px. Ein
 * grösserer Radius sah im Entwurf besser aus und schnitt im Betrieb die
 * Wörter ab.
 */
const RADIUS = 96

/**
 * Das Leistungsprofil.
 *
 * WARUM KEIN GEZEICHNETES NETZ MEHR
 *
 * Vorher war das ein Radar-Chart aus einer Diagrammbibliothek: eine gefüllte
 * Fläche über sechs Achsen. Die Fläche behauptete zweierlei, was nicht stimmt
 * — dass zwischen zwei Achsen etwas liegt (da liegt nichts, es sind sechs
 * getrennte Fähigkeiten), und dass alle sechs gleich gut belegt sind.
 *
 * Jetzt ist jede Achse ein FÄCHER AUS STREIFEN: seine Länge ist der Wert,
 * und er endet dort, wo die Messung endet. Nichts verbindet zwei Achsen, weil
 * nichts sie verbindet.
 *
 * Die LÜCKE ZUR ANFORDERUNG wird schraffiert. Wer unter der Kontur seiner
 * Disziplin liegt, sieht nicht nur einen kürzeren Strahl, sondern die
 * fehlende Strecke als eigene Gestalt. Eine ungemessene Achse ist ganz
 * schraffiert — eine fehlende Messung ist keine schwache Leistung, und beides
 * darf nicht gleich aussehen.
 *
 * Die Zahlen stehen an den Strahlen, nicht in einer Legende: im Bericht wird
 * über einzelne Werte gesprochen, und dafür muss die Zahl dort stehen, wo
 * gemessen wurde.
 */
export function RadarProfile({
  axes,
  previousAxes,
  previousLabel,
  mode,
  locale,
  disciplineWeights,
  disciplineLabel,
}: RadarProfileProps) {
  const { t } = useTranslation()
  const lang = locale
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const hatch = useHatchId()

  const axisUnit = mode === 'population' ? t('radar.unitPercentile') : t('radar.unitPersonalBest')

  const geometry = useMemo(() => {
    const n = Math.max(1, axes.length)
    return axes.map((axis, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const value = axis.score ?? 0
      const required =
        mode === 'population' && axis.dimension && disciplineWeights?.[axis.dimension] != null
          ? disciplineWeights[axis.dimension]! * 100
          : null
      const previous = previousAxes?.find((p) => p.axisId === axis.axisId)?.score ?? null
      return { axis, angle, value, required, previous }
    })
  }, [axes, previousAxes, mode, disciplineWeights])

  const point = (angle: number, fraction: number) => ({
    x: CX + Math.cos(angle) * RADIUS * fraction,
    y: CY + Math.sin(angle) * RADIUS * fraction,
  })

  /**
   * Beschriftungen am Rand ausrichten, nicht immer mittig: rechts steht der
   * Text linksbündig, links rechtsbündig. Sonst ragt er über den Rahmen
   * hinaus und wird abgeschnitten.
   */
  const anchorFor = (angle: number) => {
    const c = Math.cos(angle)
    if (c > 0.3) return 'start' as const
    if (c < -0.3) return 'end' as const
    return 'middle' as const
  }

  const covered = axes.filter((axis) => axis.hasData).length

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <span className="label-tag">{axisUnit}</span>
        <Button
          variant="ghost"
          size="sm"
          // Bedienelement: auf Papier hat ein Umschalter nichts verloren.
          className="no-print"
          onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
        >
          {view === 'chart' ? <Table2 size={14} aria-hidden /> : <RadarIcon size={14} aria-hidden />}
          {view === 'chart' ? t('actions.showTable') : t('actions.showChart')}
        </Button>
      </div>

      {view === 'chart' ? (
        <div className="px-2 pt-1">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="mx-auto block w-full max-w-[460px]"
            role="img"
            aria-label={`${t('radar.title')} — ${axisUnit}`}
          >
            <HatchPattern id={hatch} />

            {/* Zwei ruhige Hilfsringe. Mehr wäre Gitter, weniger wäre haltlos. */}
            {[0.5, 1].map((g) => (
              <circle
                key={g}
                cx={CX}
                cy={CY}
                r={RADIUS * g}
                fill="none"
                stroke="var(--line)"
                strokeWidth={0.7}
              />
            ))}

            {geometry.map(({ axis, angle, value, required, previous }) => {
              const end = point(angle, 1)
              const label = point(angle, 1.14)
              const anchor = anchorFor(angle)
              const nx = -Math.sin(angle)
              const ny = Math.cos(angle)

              // Ungemessene Achse: ganz schraffiert, kein Strahl.
              if (!axis.hasData) {
                const a = point(angle - 0.16, 1)
                const b = point(angle + 0.16, 1)
                return (
                  <g key={axis.axisId}>
                    <path
                      d={`M${CX},${CY} L${a.x},${a.y} A${RADIUS},${RADIUS} 0 0 1 ${b.x},${b.y} Z`}
                      fill={`url(#${hatch})`}
                      stroke="none"
                    />
                    <text
                      x={label.x + (anchorFor(angle) === 'start' ? 8 : anchorFor(angle) === 'end' ? -8 : 0)}
                      y={label.y + 3}
                      textAnchor={anchorFor(angle)}
                      className="label-tag"
                      fontSize={9}
                      fill="var(--ink-muted)"
                    >
                      {axisLabel(axis.axisId, t, lang)}
                    </text>
                  </g>
                )
              }

              const shortfall = required != null && required > value
              return (
                <g key={axis.axisId}>
                  <title>{`${axisLabel(axis.axisId, t, lang)}: ${formatNumber(value, locale, 0)}`}</title>

                  {/* Die Fehlstelle zwischen Messung und Anforderung. */}
                  {shortfall && (
                    <path
                      d={(() => {
                        // Nicht im Mittelpunkt beginnen: sonst laufen die
                        // Schraffuren zweier gegenüberliegender Achsen zu
                        // einem Balken quer durchs Bild zusammen.
                        const v = point(angle, Math.max(value / 100, 0.1))
                        const r = point(angle, required / 100)
                        const w = 5
                        return `M${v.x - nx * w},${v.y - ny * w} L${r.x - nx * w},${r.y - ny * w} L${r.x + nx * w},${r.y + ny * w} L${v.x + nx * w},${v.y + ny * w} Z`
                      })()}
                      fill={`url(#${hatch})`}
                      stroke="none"
                    />
                  )}

                  {/*
                    Eine gemessene Null bekommt eine eigene Marke.
                    Ohne sie wäre ein Fächer der Länge null unsichtbar — und
                    «gemessen, Wert null» sähe genauso aus wie «nie gemessen».
                    Das sind zwei verschiedene Aussagen.
                  */}
                  {value <= 0 && (
                    <line
                      x1={CX - nx * 7}
                      y1={CY - ny * 7}
                      x2={CX + nx * 7}
                      y2={CY + ny * 7}
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                  )}

                  {/* Der Fächer: das Gemessene. */}
                  {stripeFan(CX, CY, angle, RADIUS * (value / 100)).map((l, k) => (
                    <line
                      key={k}
                      x1={l.x1}
                      y1={l.y1}
                      x2={l.x2}
                      y2={l.y2}
                      stroke="var(--accent)"
                      strokeWidth={0.9}
                      opacity={l.opacity}
                    />
                  ))}

                  {/* Anforderung der Disziplin: ein kräftiger Querstrich. */}
                  {required != null && (
                    <line
                      x1={point(angle, required / 100).x - nx * 9}
                      y1={point(angle, required / 100).y - ny * 9}
                      x2={point(angle, required / 100).x + nx * 9}
                      y2={point(angle, required / 100).y + ny * 9}
                      stroke="var(--ink)"
                      strokeWidth={1.6}
                    />
                  )}

                  {/* Der frühere Stand: eine feine Marke, keine zweite Fläche. */}
                  {previous != null && (
                    <line
                      x1={point(angle, previous / 100).x - nx * 6}
                      y1={point(angle, previous / 100).y - ny * 6}
                      x2={point(angle, previous / 100).x + nx * 6}
                      y2={point(angle, previous / 100).y + ny * 6}
                      stroke="var(--ink-muted)"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                  )}

                  {/*
                    Die Zahl am Maß — an der Spitze des Fächers, QUER zur
                    Achse versetzt. Auf der Achse selbst stiess sie mit der
                    Achsenbeschriftung zusammen, und bei mehreren Achsen nahe
                    null lagen die Ziffern alle im Mittelpunkt aufeinander.
                  */}
                  <text
                    x={point(angle, Math.max(value / 100, 0.12)).x - nx * 14}
                    y={point(angle, Math.max(value / 100, 0.12)).y - ny * 14 + 3}
                    textAnchor="middle"
                    className="readout"
                    fontSize={10}
                    fill="var(--ink)"
                    fontWeight={700}
                  >
                    {formatNumber(value, locale, 0)}
                  </text>

                  <text
                    x={label.x + (anchor === 'start' ? 8 : anchor === 'end' ? -8 : 0)}
                    y={label.y + 3}
                    textAnchor={anchor}
                    className="label-tag"
                    fontSize={9}
                    fill="var(--ink-secondary)"
                  >
                    {axisLabel(axis.axisId, t, lang)}
                  </text>
                  <line
                    x1={end.x}
                    y1={end.y}
                    x2={point(angle, 1.08).x}
                    y2={point(angle, 1.08).y}
                    stroke="var(--line)"
                    strokeWidth={0.7}
                  />
                </g>
              )
            })}
          </svg>

          <p className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 text-[11px] text-ink-muted">
            {disciplineLabel && (
              <span>
                <span aria-hidden className="mr-1 inline-block h-2 w-px align-middle bg-ink" />
                {disciplineLabel}
              </span>
            )}
            {previousLabel && (
              <span>
                <span
                  aria-hidden
                  className="mr-1 inline-block h-px w-3 align-middle border-t border-dashed border-ink-muted"
                />
                {previousLabel}
              </span>
            )}
            <span>
              <span
                aria-hidden
                className="mr-1 inline-block h-2 w-2 align-middle border border-line-strong"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg,var(--line-strong) 0 1px,transparent 1px 3px)' }}
              />
              {t('radar.hatchMeaning')}
            </span>
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto px-4 py-3">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-tag py-2 pr-3 font-semibold">{t('table.dimension')}</th>
                <th className="label-tag py-2 pr-3 text-right font-semibold">{t('table.score')}</th>
                {disciplineWeights ? (
                  <th className="label-tag py-2 pr-3 text-right font-semibold">
                    {t('table.requirement')}
                  </th>
                ) : null}
                <th className="label-tag py-2 pr-3 text-right font-semibold">{t('table.tests')}</th>
                <th className="label-tag py-2 text-right font-semibold">{t('table.lastTest')}</th>
              </tr>
            </thead>
            <tbody>
              {axes.map((axis) => (
                <tr key={axis.axisId} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3">{axisLabel(axis.axisId, t, lang)}</td>
                  <td className="readout py-2 pr-3 text-right">
                    {axis.score == null ? '—' : formatNumber(axis.score, locale, 0)}
                  </td>
                  {disciplineWeights ? (
                    <td className="readout py-2 pr-3 text-right text-ink-secondary">
                      {axis.dimension == null || disciplineWeights[axis.dimension] == null
                        ? '—'
                        : formatNumber(disciplineWeights[axis.dimension]! * 100, locale, 0)}
                    </td>
                  ) : null}
                  <td className="readout py-2 pr-3 text-right text-ink-secondary">
                    {axis.testCount}
                  </td>
                  <td className="py-2 text-right text-ink-secondary">
                    {axis.hasData ? formatDate(axis.latestPerformedAt, locale) : t('radar.noData')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">
        {t('radar.coverage', { count: covered })} ·{' '}
        {mode === 'population' ? t('radar.modeHintPopulation') : t('radar.modeHintPersonalBest')}
      </p>
    </div>
  )
}
