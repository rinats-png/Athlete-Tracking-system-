import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EChartsOption, RadarSeriesOption } from "echarts";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import { Table2, Radar as RadarIcon } from "lucide-react";
import { EChart } from "./EChart";
import { useChartTokens } from "./useChartTokens";
import { Button } from "@/components/ui/Button";
import { formatNumber, formatDate } from "@/lib/format";
import { axisLabel } from "@/data/profileAxes";
import type {
  AppLocale,
  PerformanceDimension,
  RadarAxis,
  ScoreMode,
} from "@/types/domain";

interface RadarProfileProps {
  axes: RadarAxis[];
  /** Zweite Serie: dieselben Achsen zu einem früheren Zeitpunkt. */
  previousAxes?: RadarAxis[];
  previousLabel?: string;
  mode: ScoreMode;
  locale: AppLocale;
  /**
   * Anforderungskontur der gewählten Disziplin (Achsengewichte 0–1).
   *
   * Nur im Populationsmodus sinnvoll: dort ist die Skala ein Perzentil und
   * die Kontur sagt «hier sollte ein Wettkämpfer dieser Disziplin liegen».
   * Im Bestleistungsmodus wäre sie eine Linie ohne Bezug — genau wie die
   * 50er-Referenz, die dort ebenfalls nicht gezeichnet wird.
   */
  disciplineWeights?: Partial<Record<PerformanceDimension, number>>;
  disciplineLabel?: string;
}

/**
 * Das Spider-Web-Diagramm der App.
 *
 * Zur Form: sechs feste Kategorien, ein bis zwei Serien, gleiche Skala auf
 * allen Achsen (0–100) — das ist der Fall, für den ein Radar-Chart die
 * richtige Wahl ist. Er zeigt die *Gestalt* eines Profils, nicht den exakten
 * Wert; die Zahlen stehen deshalb zusätzlich als Direktbeschriftung an den
 * Punkten und vollständig in der Tabellenansicht.
 *
 * Die Achsenskala bedeutet je nach Modus etwas anderes — deshalb steht die
 * Einheit immer sichtbar am Diagramm und nicht nur im Umschalter.
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
  const { t } = useTranslation();
  const lang = locale;
  const tokens = useChartTokens();
  const [view, setView] = useState<"chart" | "table">("chart");

  const axisUnit =
    mode === "population"
      ? t("radar.axisUnitPopulation")
      : t("radar.axisUnitPersonalBest");

  const option = useMemo<EChartsOption>(() => {
    const names = axes.map((axis) => axisLabel(axis.axisId, t, lang));
    const currentValues = axes.map((axis) => axis.score);
    const previousValues = previousAxes?.map((axis) => axis.score);

    const series: RadarSeriesOption[] = [
      {
        type: "radar",
        name: t("radar.current"),
        symbolSize: 8,
        lineStyle: { width: 2, color: tokens["series-1"] },
        itemStyle: {
          color: tokens["series-1"],
          borderWidth: 2,
          borderColor: tokens.surface,
        },
        areaStyle: { color: tokens["series-1"], opacity: 0.16 },
        data: [
          {
            value: currentValues,
            name: t("radar.current"),
            // Direktbeschriftung nur auf der aktuellen Serie: sechs Werte sind
            // lesbar, zwölf wären ein Zahlenteppich.
            label: {
              show: true,
              color: tokens.ink,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 11,
              formatter: (params: CallbackDataParams) =>
                typeof params.value === "number"
                  ? String(Math.round(params.value))
                  : "",
            },
          },
        ],
      },
    ];

    if (previousValues) {
      series.push({
        type: "radar",
        name: previousLabel ?? t("radar.previous"),
        symbolSize: 6,
        lineStyle: { width: 2, color: tokens["series-2"], type: [6, 4] },
        itemStyle: { color: tokens["series-2"] },
        areaStyle: { opacity: 0 },
        data: [
          { value: previousValues, name: previousLabel ?? t("radar.previous") },
        ],
      });
    }

    // Im Populationsmodus ist die 50er-Linie der Median der Referenzgruppe und
    // damit eine echte Bezugsgrösse. Im Bestleistungsmodus wäre sie bedeutungslos.
    if (mode === "population") {
      series.push({
        type: "radar",
        name: t("radar.referenceMedian"),
        symbol: "none",
        // itemStyle steuert zusätzlich das Legendensymbol — ohne das erbt die
        // Legende die Farbe der vorherigen Serie.
        itemStyle: { color: tokens.reference },
        lineStyle: { width: 1, color: tokens.reference, type: [3, 3] },
        areaStyle: { opacity: 0 },
        silent: true,
        data: [{ value: axes.map(() => 50), name: t("radar.referenceMedian") }],
      });
    }

    if (mode === "population" && disciplineWeights && disciplineLabel) {
      series.push({
        type: "radar",
        name: disciplineLabel,
        symbol: "none",
        itemStyle: { color: tokens["series-3"] ?? tokens.reference },
        lineStyle: {
          width: 1.5,
          color: tokens["series-3"] ?? tokens.reference,
          type: [8, 4],
        },
        areaStyle: { opacity: 0 },
        silent: true,
        data: [
          {
            // Achsen ohne Anforderung bleiben leer statt auf null gesetzt:
            // «keine Anforderung» ist etwas anderes als «Anforderung null».
            value: axes.map((axis) => {
              const weight = axis.dimension
                ? disciplineWeights[axis.dimension]
                : null;
              return weight == null ? null : Math.round(weight * 100);
            }),
            name: disciplineLabel,
          },
        ],
      });
    }

    return {
      backgroundColor: "transparent",
      animationDuration: 400,
      legend: {
        bottom: 0,
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 3,
        textStyle: {
          color: tokens["ink-secondary"],
          fontFamily: "IBM Plex Sans, sans-serif",
          fontSize: 12,
        },
        inactiveColor: tokens["ink-muted"],
      },
      tooltip: {
        trigger: "item",
        backgroundColor: tokens.surface,
        borderColor: tokens["line-strong"],
        borderWidth: 1,
        padding: [8, 10],
        textStyle: {
          color: tokens.ink,
          fontFamily: "IBM Plex Sans, sans-serif",
          fontSize: 12,
        },
        formatter: (raw: TopLevelFormatterParams) => {
          const params = (
            Array.isArray(raw) ? raw[0] : raw
          ) as CallbackDataParams;
          const values = (params.value ?? []) as (number | null)[];
          const rows = names
            .map((name, index) => {
              const value = values[index];
              const text =
                value == null ? t("radar.noData") : `${Math.round(value)}`;
              return `<div style="display:flex;justify-content:space-between;gap:16px">
                        <span>${name}</span>
                        <span style="font-family:IBM Plex Mono,monospace">${text}</span>
                      </div>`;
            })
            .join("");
          return `<div style="font-weight:600;margin-bottom:6px">${params.name}</div>${rows}
                  <div style="margin-top:6px;opacity:.6;font-size:11px">${axisUnit}</div>`;
        },
      },
      radar: {
        shape: "polygon",
        splitNumber: 4,
        radius: "62%",
        center: ["50%", "48%"],
        // Abstand der Achsenbeschriftung zum Aussenring: ohne ihn überlagert
        // ein Wert von 100 den Achsennamen.
        axisNameGap: 24,
        indicator: axes.map((axis) => ({
          name: axisLabel(axis.axisId, t, lang),
          max: 100,
          min: 0,
        })),
        axisName: {
          color: tokens["ink-secondary"],
          fontFamily: "Saira Condensed, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          padding: [0, 2],
          formatter: (name?: string) => {
            if (!name) return "";
            const axis = axes.find(
              (item) => axisLabel(item.axisId, t, lang) === name,
            );
            return axis?.hasData
              ? name.toUpperCase()
              : `${name.toUpperCase()} ·`;
          },
        },
        axisLine: { lineStyle: { color: tokens.grid } },
        splitLine: { lineStyle: { color: tokens.grid } },
        splitArea: { show: false },
      },
      series,
    };
  }, [
    axes,
    previousAxes,
    previousLabel,
    mode,
    tokens,
    t,
    axisUnit,
    disciplineWeights,
    disciplineLabel,
  ]);

  const covered = axes.filter((axis) => axis.hasData).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <span className="label-tag">{axisUnit}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
        >
          {view === "chart" ? (
            <Table2 size={14} aria-hidden />
          ) : (
            <RadarIcon size={14} aria-hidden />
          )}
          {view === "chart" ? t("actions.showTable") : t("actions.showChart")}
        </Button>
      </div>

      {view === "chart" ? (
        <EChart
          option={option}
          height={380}
          ariaLabel={`${t("radar.title")} — ${axisUnit}`}
          unavailableLabel={t("charts.unavailable")}
          className="px-2"
        />
      ) : (
        <div className="overflow-x-auto px-4 py-3">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-tag py-2 pr-3 font-semibold">
                  {t("table.dimension")}
                </th>
                <th className="label-tag py-2 pr-3 text-right font-semibold">
                  {t("table.score")}
                </th>
                {disciplineWeights ? (
                  <th className="label-tag py-2 pr-3 text-right font-semibold">
                    {t("table.requirement")}
                  </th>
                ) : null}
                <th className="label-tag py-2 pr-3 text-right font-semibold">
                  {t("table.tests")}
                </th>
                <th className="label-tag py-2 text-right font-semibold">
                  {t("table.lastTest")}
                </th>
              </tr>
            </thead>
            <tbody>
              {axes.map((axis) => (
                <tr
                  key={axis.axisId}
                  className="border-b border-line/60 last:border-0"
                >
                  <td className="py-2 pr-3">
                    {axisLabel(axis.axisId, t, lang)}
                  </td>
                  <td className="readout py-2 pr-3 text-right">
                    {axis.score == null
                      ? "—"
                      : formatNumber(axis.score, locale, 0)}
                  </td>
                  {disciplineWeights ? (
                    <td className="readout py-2 pr-3 text-right text-ink-secondary">
                      {axis.dimension == null ||
                      disciplineWeights[axis.dimension] == null
                        ? "—"
                        : formatNumber(
                            disciplineWeights[axis.dimension]! * 100,
                            locale,
                            0,
                          )}
                    </td>
                  ) : null}
                  <td className="readout py-2 pr-3 text-right text-ink-secondary">
                    {axis.testCount}
                  </td>
                  <td className="py-2 text-right text-ink-secondary">
                    {axis.hasData
                      ? formatDate(axis.latestPerformedAt, locale)
                      : t("radar.noData")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">
        {t("radar.coverage", { count: covered })} ·{" "}
        {mode === "population"
          ? t("radar.modeHintPopulation")
          : t("radar.modeHintPersonalBest")}
      </p>
    </div>
  );
}
