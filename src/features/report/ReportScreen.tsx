import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppData } from "@/lib/store/AppDataProvider";
import { disciplineById } from "@/data/sportProfiles";
import { FORMULA_REGISTRY } from "@/domain/formulaRegistry";
import {
  resultsForAssessment,
  coveredDimensions,
  missingDimensions,
} from "@/domain/assessment";
import {
  baselineComparisons,
  confidenceScore,
  resultPercentile,
  testTrend,
} from "@/domain/analytics";
import { buildInsights } from "@/domain/insights";
import { assessQuality } from "@/domain/dataQuality";
import { radarProfile } from "@/lib/scoring";
import { getTest } from "@/data/testCatalog";
import { ageFromBirthDate, formatDate } from "@/lib/format";
import { formatResultValue } from "@/lib/resultView";
import { resultsToCsv, downloadFile } from "@/lib/export/csv";
import { PERFORMANCE_DIMENSIONS } from "@/types/domain";
import { RadarProfile } from "@/components/charts/RadarProfile";
import { compareAssessments } from "@/domain/analytics";
import { coverageByDimension } from "@/domain/benchmark";
import { readinessScore } from "@/domain/readiness";
import { getTest as lookupTest } from "@/data/testCatalog";
import type { AppLocale } from "@/types/domain";
import type { StoredResult } from "@/lib/store/localStore";

/**
 * Diagnostikbericht.
 *
 * Bewusst KEINE PDF-Bibliothek. Der Bericht ist eine für den Druck gebaute
 * Seite; „Drucken → Als PDF sichern“ erzeugt die Datei über die Engine des
 * Systems. Das kostet keine 300 kB Abhängigkeit, funktioniert offline,
 * bricht Seiten nach den Regeln des Browsers um, ist mit dem Screenreader
 * lesbar und lässt sich in jeder Sprache setzen. Eine eingebundene
 * PDF-Bibliothek müsste all das nachbauen — und Schriften mitliefern.
 *
 * Der Bericht ist ausdrücklich kein Marketingdokument: er nennt seine
 * Lücken, die Belegstärke jeder Aussage und die Herkunft der Referenzwerte.
 */
export function ReportScreen() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const locale: AppLocale = i18n.resolvedLanguage === "en" ? "en" : "de";
  const { data, athleteNotes } = useAppData();
  // Anforderungskontur der Disziplin, sofern eine gewählt ist.
  const discipline = disciplineById(data.profile.disciplineId ?? "");
  const [searchParams] = useSearchParams();

  const assessment = id
    ? (data.assessments.find((a) => a.id === id) ?? null)
    : null;

  // Ein Termin, oder das ganze Profil.
  const results: StoredResult[] = assessment
    ? resultsForAssessment(data, assessment.id)
    : [...data.results].sort((a, b) =>
        a.performedAt.localeCompare(b.performedAt),
      );

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
  const comparisons = useMemo(
    () => baselineComparisons(data.results),
    [data.results],
  );

  const covered = coveredDimensions(results);
  const missing = missingDimensions(results);
  const coverage = useMemo(
    () => coverageByDimension(data.results),
    [data.results],
  );
  const usedFormulas = useMemo(() => {
    const keys = new Set(results.flatMap((r) => Object.keys(r.metrics ?? {})));
    return FORMULA_REGISTRY.filter((f) => keys.has(f.metricKey));
  }, [results]);

  /**
   * Der vorherige abgeschlossene Termin (§33). Ohne ihn ist ein Bericht eine
   * Momentaufnahme; mit ihm wird er eine Entwicklung.
   */
  const previousAssessment = useMemo(() => {
    if (!assessment) return null;
    return (
      data.assessments
        .filter(
          (a) =>
            a.id !== assessment.id &&
            a.status === "completed" &&
            a.performedOn < assessment.performedOn,
        )
        .sort((a, b) => b.performedOn.localeCompare(a.performedOn))[0] ?? null
    );
  }, [assessment, data.assessments]);

  const comparisonRows = useMemo(
    () =>
      assessment && previousAssessment
        ? compareAssessments(data, previousAssessment.id, assessment.id)
        : [],
    [data, assessment, previousAssessment],
  );
  const showInsights = searchParams.get("hinweise") !== "aus";

  const athlete =
    [data.profile.firstName, data.profile.lastName].filter(Boolean).join(" ") ||
    t("report.anonymousAthlete");
  const age = ageFromBirthDate(data.profile.birthDate);

  return (
    <div className="report mx-auto max-w-[820px]">
      {/* Bedienleiste — im Druck ausgeblendet. */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={assessment ? `/diagnostik/${assessment.id}` : "/analyse"}>
            <ArrowLeft size={14} aria-hidden />
            {t("actions.back")}
          </Link>
        </Button>
        <span className="flex-1" />
        <Button
          variant="outline"
          size="md"
          onClick={() =>
            downloadFile(
              `baseline-${assessment?.performedOn ?? new Date().toISOString().slice(0, 10)}.csv`,
              resultsToCsv(data, locale),
              "text/csv",
            )
          }
        >
          <Download size={15} aria-hidden />
          {t("report.csv")}
        </Button>
        <Button variant="primary" size="md" onClick={() => window.print()}>
          <Printer size={15} aria-hidden />
          {t("report.print")}
        </Button>
      </div>

      <p className="no-print mb-5 border-l-2 border-line bg-surface-sunken px-3 py-2 text-[12px] leading-relaxed text-ink-secondary">
        {t("report.printHint")}
      </p>

      {/* --- Der Bericht ------------------------------------------------- */}

      <header className="report-head flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-muted">
            {data.branding.organisation || t("app.name")}
          </p>
          <h1 className="mt-1 font-display text-[26px] leading-tight font-bold">
            {assessment
              ? (assessment.title ?? t("report.assessmentTitle"))
              : t("report.profileTitle")}
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {athlete}
            {age != null && ` · ${t("report.age", { count: age })}`}
            {/* `profile.sex` ist die Feldbeschriftung, nicht der Namensraum
                der Werte — die Werte liegen flach daneben. */}
            {data.profile.sex &&
              ` · ${t(data.profile.sex === "other" ? "profile.otherSex" : `profile.${data.profile.sex}`)}`}
          </p>
          <p className="text-[12px] text-ink-muted">
            {assessment
              ? formatDate(assessment.performedOn, locale)
              : t("report.generatedOn", {
                  date: formatDate(new Date().toISOString(), locale),
                })}
          </p>
        </div>
        {data.branding.logoDataUrl && (
          // Nutzerlogo aus dem lokalen Bestand — nie von einer fremden Quelle.
          <img
            src={data.branding.logoDataUrl}
            alt={data.branding.organisation || t("report.logoAlt")}
            className="max-h-16 max-w-[160px] object-contain"
          />
        )}
      </header>

      {/* Deckblatt: eine eigene Druckseite, damit der Bericht wie ein
          Dokument beginnt und nicht wie ein Ausdruck einer Webseite. */}
      <section className="report-cover">
        <p className="font-display text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-muted">
          {data.branding.organisation || t("app.name")}
        </p>
        <h2 className="mt-2 font-display text-[22px] leading-tight font-bold">
          {assessment ? t("report.assessmentTitle") : t("report.profileTitle")}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-4">
          <CoverField label={t("report.athlete")} value={athlete} />
          <CoverField
            label={t("report.date")}
            value={
              assessment
                ? formatDate(assessment.performedOn, locale)
                : formatDate(new Date().toISOString(), locale)
            }
          />
          {data.profile.sport && (
            <CoverField label={t("profile.sport")} value={data.profile.sport} />
          )}
          {data.profile.performanceLevel && (
            <CoverField
              label={t("profile.performanceLevel")}
              value={t(`profile.level.${data.profile.performanceLevel}`)}
            />
          )}
        </dl>
      </section>

      <Section title={t("report.summary")}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
          <Figure
            label={t("report.testsMeasured")}
            value={String(results.length)}
          />
          <Figure
            label={t("report.axesCovered")}
            value={`${covered.length} / ${PERFORMANCE_DIMENSIONS.length}`}
          />
          <Figure
            label={t("analysis.confidence")}
            value={`${confidence.score} / 100`}
          />
          <Figure
            label={t("insights.nextAssessment")}
            value={
              insights.next.date ? formatDate(insights.next.date, locale) : "—"
            }
          />
        </dl>

        {missing.length > 0 && (
          <p className="mt-3 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-relaxed">
            {t("report.gaps", {
              axes: missing.map((d) => t(`dimensions.${d}`)).join(", "),
            })}
          </p>
        )}
      </Section>

      <Section title={t("radar.title")}>
        {/* Das Profil gehört in den Bericht: sechs Zahlen in einer Tabelle
            beantworten «wo stehe ich» schlechter als ein Netz. Die
            Tabellenansicht liegt darunter und macht es ohne Diagramm
            lesbar. */}
        <RadarProfile
          axes={axes}
          mode="population"
          locale={locale}
          disciplineWeights={discipline?.dimensionWeights}
          disciplineLabel={discipline?.name[locale]}
        />
      </Section>

      <Section title={t("coverage.title")}>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink text-left">
              <th scope="col" className="py-1.5 font-semibold">
                {t("table.dimension")}
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                {t("coverage.title")}
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                {t("report.testsMeasured")}
              </th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((entry) => (
              <tr key={entry.dimension} className="border-b border-line">
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {t(`dimensions.${entry.dimension}`)}
                </th>
                <td className="readout py-1.5 pr-2 tabular-nums">
                  {entry.percent} %
                </td>
                <td className="py-1.5 tabular-nums">
                  {entry.measured} / {entry.available}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          {t("coverage.explain")}
        </p>
      </Section>

      <Section title={t("report.measurements")}>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink text-left">
              <th scope="col" className="py-1.5 font-semibold">
                {t("table.test")}
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                {t("report.date")}
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                {t("table.value")}
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                {t("table.percentile")}
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                {t("table.quality")}
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const test = getTest(result.testSlug);
              const percentile = resultPercentile(result);
              const quality = assessQuality(result);
              return (
                <tr key={result.id} className="border-b border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                    {test?.name[locale] ?? result.testSlug}
                  </th>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {formatDate(result.performedAt, locale)}
                  </td>
                  <td className="readout py-1.5 pr-2 tabular-nums">
                    {formatResultValue(result, locale, data.profile.unitSystem)}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {percentile != null ? `P${Math.round(percentile)}` : "—"}
                  </td>
                  <td className="py-1.5">
                    {t(`quality.status.${quality.status}`)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {results.length === 0 && (
          <p className="text-[13px] text-ink-secondary">
            {t("assessments.noResults")}
          </p>
        )}
      </Section>

      {comparisons.length > 0 && (
        <Section title={t("analysis.sinceBaseline")}>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-ink text-left">
                <th scope="col" className="py-1.5 font-semibold">
                  {t("table.test")}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {t("analysis.first")}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {t("analysis.latest")}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {t("analysis.change")}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {t("analysis.trend")}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => {
                const trend = testTrend(data.results, row.testSlug);
                return (
                  <tr key={row.testSlug} className="border-b border-line">
                    <th
                      scope="row"
                      className="py-1.5 pr-2 text-left font-normal"
                    >
                      {getTest(row.testSlug)?.name[locale] ?? row.testSlug}
                    </th>
                    <td className="readout py-1.5 pr-2 tabular-nums">
                      {formatResultValue(
                        row.baseline,
                        locale,
                        data.profile.unitSystem,
                      )}
                    </td>
                    <td className="readout py-1.5 pr-2 tabular-nums">
                      {formatResultValue(
                        row.current,
                        locale,
                        data.profile.unitSystem,
                      )}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {row.changePercent == null
                        ? "—"
                        : `${row.changePercent > 0 ? "+" : ""}${row.changePercent.toFixed(1)} % (${t("analysis.overDays", { count: row.daysBetween })})`}
                    </td>
                    <td className="py-1.5">
                      {trend.label === "insufficient"
                        ? t("analysis.trendLabel.insufficient", {
                            count: trend.points,
                          })
                        : `${t(`analysis.trendLabel.${trend.label}`)} · R² ${(trend.rSquared ?? 0).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {showInsights &&
        (insights.limiters.length > 0 || insights.strengths.length > 0) && (
          <Section title={t("insights.findings")}>
            <ul className="space-y-1.5 text-[13px]">
              {insights.limiters.map((finding) => (
                <li key={`l-${finding.dimension}`}>
                  <strong className="font-semibold">
                    {t(`dimensions.${finding.dimension}`)}
                  </strong>{" "}
                  {t("insights.limiterGap", {
                    gap: Math.abs(finding.gapToMean),
                  })}{" "}
                  —{" "}
                  <span className="text-ink-secondary">
                    {t("insights.basedOn", { count: finding.measurements })},{" "}
                    {t(`insights.evidence.${finding.evidence}`)}
                  </span>
                </li>
              ))}
              {insights.strengths.map((finding) => (
                <li key={`s-${finding.dimension}`}>
                  <strong className="font-semibold">
                    {t(`dimensions.${finding.dimension}`)}
                  </strong>{" "}
                  {t("insights.strengthGap", {
                    gap: Math.abs(finding.gapToMean),
                  })}{" "}
                  —{" "}
                  <span className="text-ink-secondary">
                    {t("insights.basedOn", { count: finding.measurements })},{" "}
                    {t(`insights.evidence.${finding.evidence}`)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              {t("insights.findingsMethod")}
            </p>
          </Section>
        )}

      {previousAssessment && comparisonRows.length > 0 && (
        <Section
          title={t("report.versusPrevious", {
            date: formatDate(previousAssessment.performedOn, locale),
          })}
        >
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-ink text-left">
                <th scope="col" className="py-1.5 font-semibold">
                  {t("table.test")}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {t("analysis.before")}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {t("analysis.after")}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {t("analysis.change")}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.testSlug} className="border-b border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                    {lookupTest(row.testSlug)?.name[locale] ?? row.testSlug}
                  </th>
                  <td className="readout py-1.5 pr-2 tabular-nums">
                    {row.before
                      ? formatResultValue(
                          row.before,
                          locale,
                          data.profile.unitSystem,
                        )
                      : "—"}
                  </td>
                  <td className="readout py-1.5 pr-2 tabular-nums">
                    {row.after
                      ? formatResultValue(
                          row.after,
                          locale,
                          data.profile.unitSystem,
                        )
                      : "—"}
                  </td>
                  <td className="py-1.5 tabular-nums">
                    {row.onlyIn
                      ? t(`analysis.onlyIn.${row.onlyIn}`)
                      : row.changePercent == null
                        ? "—"
                        : `${row.changePercent > 0 ? "+" : ""}${row.changePercent.toFixed(1)} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {assessment?.readiness && (
        <Section title={t("readiness.title")}>
          <p className="text-[12px]">
            {t("readiness.score")}:{" "}
            <span className="readout">
              {readinessScore(assessment.readiness).score} %
            </span>{" "}
            <span className="text-ink-muted">
              (
              {t("readiness.basis", {
                answered: readinessScore(assessment.readiness).answered,
                total: readinessScore(assessment.readiness).total,
              })}
              )
            </span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            {t("readiness.disclaimer")}
          </p>
        </Section>
      )}

      {showInsights && insights.recommendations.length > 0 && (
        <Section title={t("insights.recommendations")}>
          <ol className="space-y-2 text-[12px]">
            {insights.recommendations
              .slice(0, 5)
              .map((recommendation, index) => (
                <li key={`${recommendation.kind}-${index}`}>
                  <strong className="font-semibold">
                    {t("report.priority", { rank: index + 1 })}
                  </strong>{" "}
                  {t(`insights.recommendation.${recommendation.kind}`, {
                    ...recommendation.values,
                    dimension: recommendation.dimension
                      ? t(`dimensions.${recommendation.dimension}`)
                      : "",
                    test: "",
                  })}
                  {recommendation.emphasis && (
                    <span className="block text-ink-secondary">
                      {recommendation.emphasis.focusKeys
                        .map((key) => t(key))
                        .join(" · ")}{" "}
                      ·{" "}
                      {t("emphasis.volume", {
                        minSessions: recommendation.emphasis.sessionsPerWeek[0],
                        maxSessions: recommendation.emphasis.sessionsPerWeek[1],
                        minWeeks: recommendation.emphasis.weeksToRetest[0],
                        maxWeeks: recommendation.emphasis.weeksToRetest[1],
                      })}
                    </span>
                  )}
                  <span className="block text-ink-muted">
                    {t(`insights.evidence.${recommendation.evidence}`)}
                  </span>
                </li>
              ))}
          </ol>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            {t("emphasis.disclaimer")}
          </p>
        </Section>
      )}

      {(assessment?.notes || athleteNotes) && (
        <Section title={t("notes.title")}>
          {assessment?.notes && (
            <p className="text-[12px] leading-relaxed whitespace-pre-wrap">
              {assessment.notes}
            </p>
          )}
          {athleteNotes && (
            <p className="mt-2 text-[12px] leading-relaxed whitespace-pre-wrap">
              {athleteNotes}
            </p>
          )}
        </Section>
      )}

      <Section title={t("report.method")}>
        <ul className="space-y-1 text-[11px] leading-relaxed text-ink-secondary">
          <li>{t("report.methodConfidence")}</li>
          <li>{t("report.methodNorms")}</li>
          <li>{t("report.methodDerived")}</li>
        </ul>
      </Section>

      {/* Herkunft jeder gerechneten Zahl, die in diesem Bericht vorkommt.
          Aufgeführt wird nur, was tatsächlich verwendet wurde — ein Register
          fremder Formeln unter einem Bericht wäre Beiwerk, das Beleglage
          vortäuscht. Vorläufige Rechnungen stehen mit dem Vermerk da, was
          sie ersetzen müsste (§81). */}
      {usedFormulas.length > 0 && (
        <Section title={t("report.formulas")}>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink-secondary">
            {usedFormulas.map((f) => (
              <li key={f.metricKey}>
                <span className="font-semibold text-ink">
                  {t(`metrics.${f.metricKey}`)}
                </span>{" "}
                — {f.formula}.{" "}
                {f.reference
                  ? t("report.formulaSource", { source: f.reference })
                  : t("report.formulaProvisional")}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <footer className="mt-6 border-t border-line pt-3 text-[10px] leading-relaxed text-ink-muted">
        <p>{t("assessments.disclaimer")}</p>
        {data.branding.footer && <p className="mt-1">{data.branding.footer}</p>}
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section mt-6">
      <h2 className="mb-2 font-display text-[12px] font-semibold tracking-[0.14em] uppercase text-ink-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CoverField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.1em] uppercase text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.1em] uppercase text-ink-muted">
        {label}
      </dt>
      <dd className="readout mt-0.5 font-display text-[18px] font-bold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
