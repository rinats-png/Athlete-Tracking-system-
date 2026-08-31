import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, CalendarClock, Minus, Target } from "lucide-react";
import { useAppData } from "@/lib/store/AppDataProvider";
import { buildInsights } from "@/domain/insights";
import { baselineComparisons, confidenceScore } from "@/domain/analytics";
import { radarProfile, baselineIndex } from "@/lib/scoring";
import { assessmentProgress, resultsForAssessment } from "@/domain/assessment";
import { getTest } from "@/data/testCatalog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/types/domain";
import { useMemo } from "react";

/**
 * Die vier Zahlen, wegen derer jemand das Dashboard öffnet (§64).
 *
 * Gesamtleistung, primärer Limiter, grösste Verbesserung, Stand der
 * laufenden Diagnostik. Alles Weitere steht darunter.
 *
 * Jede Kachel führt dorthin, wo die Zahl herkommt. Eine Kennzahl, die man
 * nicht aufklappen kann, ist eine Behauptung — und in einer Diagnostik ist
 * die Herleitung wichtiger als die Zahl.
 */
export function DecisionRow({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation();
  const { data } = useAppData();

  const axes = useMemo(
    () =>
      radarProfile(
        data.results,
        "population",
        new Date(),
        data.profile.disciplineId,
      ),
    [data.results, data.profile.disciplineId],
  );
  const insights = useMemo(
    () => buildInsights(axes, data.results, data.assessments, data.profile),
    [axes, data.results, data.assessments, data.profile],
  );
  const confidence = useMemo(
    () => confidenceScore(data.results),
    [data.results],
  );
  const index = baselineIndex(axes);

  const biggestGain = useMemo(() => {
    const rows = baselineComparisons(data.results).filter(
      (r) => r.changePercent != null,
    );
    return rows.length > 0 ? rows[0] : null;
  }, [data.results]);

  const running = useMemo(
    () =>
      [...data.assessments]
        .filter((a) => a.status === "in_progress")
        .sort((a, b) => b.performedOn.localeCompare(a.performedOn))[0] ?? null,
    [data.assessments],
  );
  const runningProgress = running
    ? assessmentProgress(running, resultsForAssessment(data, running.id))
    : null;

  const limiter = insights.limiters[0] ?? null;

  return (
    <div className="mb-4 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        to="/analyse"
        label={t("dashboard.overall")}
        value={index == null ? "—" : String(Math.round(index))}
        note={t("dashboard.overallNote", { confidence: confidence.score })}
      />

      <Tile
        to="/analyse"
        label={t("dashboard.primaryLimiter")}
        value={limiter ? t(`dimensions.${limiter.dimension}`) : "—"}
        note={
          limiter
            ? t("insights.limiterGap", { gap: Math.abs(limiter.gapToMean) })
            : t("dashboard.noLimiter")
        }
        icon={<Target size={14} aria-hidden />}
        tone={limiter ? "warn" : "neutral"}
      />

      <Tile
        to="/analyse"
        label={t("dashboard.biggestChange")}
        value={
          biggestGain
            ? (getTest(biggestGain.testSlug)?.shortName[locale] ??
              biggestGain.testSlug)
            : "—"
        }
        note={
          biggestGain
            ? `${(biggestGain.changePercent as number) > 0 ? "+" : ""}${(biggestGain.changePercent as number).toFixed(1)} % · ${t("analysis.overDays", { count: biggestGain.daysBetween })}`
            : t("analysis.needTwoPerTest")
        }
        icon={
          biggestGain == null ? (
            <Minus size={14} aria-hidden />
          ) : (biggestGain.changePercent as number) >= 0 ? (
            <ArrowUp size={14} aria-hidden />
          ) : (
            <ArrowDown size={14} aria-hidden />
          )
        }
        tone={
          biggestGain == null
            ? "neutral"
            : (biggestGain.changePercent as number) >= 0
              ? "good"
              : "warn"
        }
      />

      {running && runningProgress ? (
        <Tile
          to={`/diagnostik/${running.id}`}
          label={t("dashboard.assessmentStatus")}
          value={`${runningProgress.completed.length + runningProgress.additional.length} / ${runningProgress.planned.length}`}
          note={t("assessments.status.in_progress")}
        />
      ) : (
        <Tile
          to="/diagnostik/neu"
          label={t("insights.nextAssessment")}
          value={
            insights.next.date ? formatDate(insights.next.date, locale) : "—"
          }
          note={
            insights.next.date == null
              ? t("insights.nextNone")
              : insights.next.overdue
                ? t("insights.overdue")
                : t("dashboard.plannedAhead")
          }
          icon={<CalendarClock size={14} aria-hidden />}
          tone={insights.next.overdue ? "warn" : "neutral"}
        />
      )}
    </div>
  );
}

function Tile({
  to,
  label,
  value,
  note,
  icon,
  tone = "neutral",
}: {
  to: string;
  label: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <Link
      to={to}
      className="flex min-h-[92px] flex-col justify-between gap-1 bg-plane px-4 py-3 transition-colors hover:bg-surface-sunken"
    >
      <span className="label-tag flex items-center gap-1.5">
        {/* Richtung und Zustand über Symbol UND Text, nie über Farbe allein. */}
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "readout font-display text-[22px] leading-tight font-bold",
          tone === "good" && "text-accent-text",
          tone === "warn" && "text-warning",
        )}
      >
        {value}
      </span>
      <span className="text-[11px] leading-snug text-ink-muted">{note}</span>
    </Link>
  );
}
