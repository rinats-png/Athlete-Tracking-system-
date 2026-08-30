import { Component, Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import type { EChartsOption } from 'echarts'

/**
 * Diagrammfläche — mit nachgeladener Bibliothek.
 *
 * ECharts sind rund 170 kB gepackt und damit der grösste einzelne Posten der
 * Auslieferung. Sie werden erst geholt, wenn wirklich ein Diagramm gezeichnet
 * wird; der erste Aufbau der Seite wartet nicht mehr darauf. Nach dem ersten
 * Besuch liegt der Baustein im Cache des Service Workers und ist sofort da.
 *
 * Nachgeladen wird ausschliesslich die Zeichenfläche, nicht das ganze
 * Diagramm-Panel: der Platzhalter hat dadurch exakt die Höhe des Diagramms,
 * und Kopfzeile samt Umschalter auf die Tabellenansicht bleiben sofort
 * bedienbar. Ein Nachladen, das anschliessend das Layout verschiebt,
 * verursacht Fehlklicks — das war in dieser App schon einmal die Ursache und
 * wird hier nicht neu eingebaut.
 *
 * Und: nachladen kann scheitern. Ohne Auffangnetz reisst ein fehlgeschlagener
 * Abruf — abgebrochene Verbindung, geleerter Cache, blockierendes Netz — die
 * gesamte Seite mit, weil die Ausnahme aus Suspense nach oben durchschlägt.
 * Der Nutzer stünde dann vor einer weissen Seite, obwohl alle seine Daten da
 * sind und die Tabellenansicht sie zeigen könnte. Deshalb fängt eine
 * Fehlergrenze den Fall ab und weist auf die Tabelle hin.
 */

const EChartCanvas = lazy(() =>
  import('./EChartCanvas')
    .then((m) => ({ default: m.EChartCanvas }))
    // Scheitert der Abruf, wird nicht geworfen, sondern ein Ersatzbaustein
    // geliefert. Eine Ausnahme aus `lazy` landet zwar in der Fehlergrenze,
    // aber je nach Zeitpunkt des Abbruchs bleibt das Versprechen auch
    // schlicht offen — dann sähe der Nutzer dauerhaft eine leere Fläche
    // ohne Erklärung. So gibt es in jedem Fall eine Aussage.
    .catch(() => ({ default: ChartUnavailableCanvas })),
)

export interface EChartProps {
  option: EChartsOption
  height: number | string
  className?: string
  ariaLabel: string
  /** Text, wenn die Bibliothek nicht geladen werden konnte. */
  unavailableLabel: string
}

/**
 * Fehlergrenze um die nachgeladene Zeichenfläche.
 *
 * Bewusst als Klasse: Fehlergrenzen gibt es in React nur so, ein Hook dafür
 * existiert nicht.
 */
class ChartBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Ersatz für die Zeichenfläche, wenn die Bibliothek nicht ankommt. */
function ChartUnavailableCanvas(props: EChartProps) {
  return <ChartUnavailable height={props.height} message={props.unavailableLabel} />
}

function ChartUnavailable({ height, message }: { height: number | string; message: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center px-4 text-center text-[13px] text-ink-secondary"
      style={{ height, width: '100%' }}
    >
      {message}
    </div>
  )
}

export function EChart(props: EChartProps) {
  return (
    <ChartBoundary
      fallback={<ChartUnavailable height={props.height} message={props.unavailableLabel} />}
    >
    <Suspense
      fallback={
        <div
          // Für die Hilfstechnik gibt es hier noch nichts zu lesen; der
          // Inhalt steht zusätzlich in der Tabellenansicht.
          aria-hidden
          className={props.className}
          style={{ height: props.height, width: '100%' }}
        />
      }
    >
      <EChartCanvas {...props} />
    </Suspense>
    </ChartBoundary>
  )
}
