import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { RadarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([
  RadarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  MarkLineComponent,
  CanvasRenderer,
])

/**
 * Dünner Wrapper um ECharts. Wird über `EChart` nachgeladen — dieses Modul
 * ist der Schnitt, an dem die Bibliothek hängt.
 * Bewusst kein Fremd-Binding: die
 * React-19-Kompatibilität bleibt so unsere eigene Sache, und der Wrapper macht
 * nur drei Dinge — Instanz halten, Option setzen, auf Grössenänderung reagieren.
 */
export function EChartCanvas({
  option,
  height,
  className,
  ariaLabel,
}: {
  option: EChartsOption
  height: number | string
  className?: string
  ariaLabel: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    // notMerge, damit entfernte Serien nicht als Leichen im Chart bleiben.
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ height, width: '100%' }}
    />
  )
}
