import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from 'echarts/types/dist/shared'
import { EChart } from './EChart'
import { useChartTokens } from './useChartTokens'
import { formatDate, formatDuration, formatNumber } from '@/lib/format'
import type { AppLocale, TrendPoint } from '@/types/domain'

/**
 * Verlauf eines einzelnen Tests über die Messzeitpunkte.
 *
 * Eine Serie, also keine Legende — der Titel des Panels benennt sie. Achse
 * beginnt nicht zwingend bei null: bei Diagnostikwerten ist der interessante
 * Bereich die Spanne der tatsächlichen Messwerte, und die Nulllinie hätte
 * keine Aussage.
 */
export function TrendChart({
  points,
  unit,
  locale,
  label,
  height = 180,
}: {
  points: TrendPoint[]
  unit: string
  locale: AppLocale
  label: string
  height?: number
}) {
  const tokens = useChartTokens()

  const option = useMemo<EChartsOption>(() => {
    const values = points.map((point) => point.value)

    const formatValue = (value: number) =>
      unit === 's' ? formatDuration(value) : formatNumber(value, locale, value < 10 ? 2 : 0)

    return {
      backgroundColor: 'transparent',
      grid: { left: 46, right: 14, top: 16, bottom: 24 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tokens.surface,
        borderColor: tokens['line-strong'],
        borderWidth: 1,
        textStyle: { color: tokens.ink, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12 },
        formatter: (raw: TopLevelFormatterParams) => {
          const first = (Array.isArray(raw) ? raw[0] : raw) as CallbackDataParams
          const point = points[first.dataIndex]
          return `<div style="font-size:11px;opacity:.7">${formatDate(point.performedAt, locale)}</div>
                  <div style="font-family:IBM Plex Mono,monospace;font-size:14px">${formatValue(point.value)} ${unit === 's' ? '' : unit}</div>`
        },
      },
      xAxis: {
        type: 'category',
        data: points.map((point) => formatDate(point.performedAt, locale)),
        axisLine: { lineStyle: { color: tokens['line-strong'] } },
        axisTick: { show: false },
        axisLabel: {
          color: tokens['ink-muted'],
          fontFamily: 'IBM Plex Sans, sans-serif',
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        // scale: true lässt ECharts runde Schritte wählen und verzichtet auf
        // die Nulllinie — bei Diagnostikwerten ist die Spanne der Messwerte
        // der interessante Bereich, nicht der Abstand zu null.
        scale: true,
        splitLine: { lineStyle: { color: tokens.grid } },
        axisLabel: {
          color: tokens['ink-muted'],
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          formatter: (value: number) => formatValue(value),
        },
      },
      series: [
        {
          type: 'line',
          name: label,
          data: values,
          smooth: false,
          symbolSize: 8,
          lineStyle: { width: 2, color: tokens['series-1'] },
          itemStyle: { color: tokens['series-1'], borderWidth: 2, borderColor: tokens.surface },
          areaStyle: { color: tokens['series-1'], opacity: 0.1 },
        },
      ],
    }
  }, [points, unit, locale, label, tokens])

  return <EChart option={option} height={height} ariaLabel={label} />
}
