import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme'

const TOKEN_NAMES = [
  'surface',
  'ink',
  'ink-secondary',
  'ink-muted',
  'line',
  'line-strong',
  'grid',
  'series-1',
  'series-2',
  'series-3',
  'reference',
  'accent',
] as const

export type ChartTokens = Record<(typeof TOKEN_NAMES)[number], string>

/**
 * Liest die Farbrollen des Designsystems aus dem CSS aus, statt sie im
 * Chart-Code zu wiederholen. Dadurch gibt es genau eine Quelle der Wahrheit
 * und der Theme-Umschalter wirkt auch auf die Diagramme.
 */
export function useChartTokens(): ChartTokens {
  const { resolved } = useTheme()
  const [tokens, setTokens] = useState<ChartTokens>(() => readTokens())

  useEffect(() => {
    // Ein Frame warten, damit die neuen Custom Properties angewendet sind.
    const frame = requestAnimationFrame(() => setTokens(readTokens()))
    return () => cancelAnimationFrame(frame)
  }, [resolved])

  return tokens
}

function readTokens(): ChartTokens {
  const styles = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    TOKEN_NAMES.map((name) => [name, styles.getPropertyValue(`--${name}`).trim()]),
  ) as ChartTokens
}
