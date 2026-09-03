import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { RatingScale, RatingWord } from '@/features/shared/RatingScale'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { rateResult, ratingFromPercentile, ratingFromBand } from '@/domain/rating'
import { assessQuality } from '@/domain/dataQuality'
import { nextTests } from '@/domain/nextTest'
import { formulaFor } from '@/domain/formulaRegistry'
import { formatDate, formatNumber } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import type { ReferenceComparison } from '@/data/references'

/**
 * Die Ergebnisanalyse (Konzept §15–§18).
 *
 * Konsequent getrennt: Messwert → Referenz → Interpretation. Der Wert steht
 * zuerst und allein. Dann die Referenz — eine benannte Gruppe mit Quelle
 * und Qualität. Dann die Skala. Dann der Vergleich mit allen weiteren
 * Gruppen, Bevölkerung wie Athleten. Wo keine Referenz vorliegt, steht das
 * so da; ein leeres Feld wäre eine Lücke, ein Satz ist eine Auskunft.
 */
export function ResultScreen() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const result = data.results.find((r) => r.id === id) ?? null
  const test = result ? getTest(result.testSlug) : undefined
  const context = ratingContextOf(data.profile)
  const rating = useMemo(() => (result ? rateResult(result, context) : null), [result, context])
  const quality = result ? assessQuality(result) : null
  const suggestions = useMemo(
    () =>
      nextTests({
        disciplineId: data.profile.disciplineId,
        additionalDisciplineIds: data.profile.additionalDisciplineIds,
        goalKey: data.profile.goalKey,
        sex: data.profile.sex,
        birthDate: data.profile.birthDate,
        reminderIntervalDays: data.profile.reminderIntervalDays,
        results: data.results,
      }),
    [data.profile, data.results],
  )

  if (!result || !test || !rating) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('result.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/verlauf">{t('nav.history')}</Link>
        </Button>
      </Panel>
    )
  }

  const primary = rating.comparison
  const all = [...(primary ? [primary] : []), ...rating.alternatives]
  const next = suggestions.find((s) => s.slug !== test.slug) ?? null
  const nextTest = next ? getTest(next.slug) : null
  const value = (key: string) => result.metrics[key] ?? result.values[key] ?? null

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={`/tests/${test.slug}/details`}>
          <ArrowLeft size={14} aria-hidden />
          {test.name[locale]}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('result.eyebrow')} title={test.name[locale]} intro={t('result.measuredOn', { date: formatDate(result.performedAt, locale) })} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel ticked>
          <PanelHeader title={t('result.yourValue')} />
          <div className="px-4 py-4">
            <p className="readout text-[44px] leading-none font-medium">{formatResultValue(result, locale)}</p>
            {rating.metricKey && rating.metricKey !== test.primaryMetric && value(rating.metricKey) != null && (
              <p className="mt-2 text-[13px] text-ink-secondary">
                {t(`metrics.${rating.metricKey}`)}: <span className="readout">{formatNumber(value(rating.metricKey)!, locale, 1)}</span>
              </p>
            )}
            {quality && quality.status !== 'valid' && (
              <p className="mt-2 text-[12px] text-warning">
                {t('result.dataQuality')}: {t(`quality.status.${quality.status}`)} — {quality.reasons.map((r) => t(r)).join(' ')}
              </p>
            )}
            {test.derivedMetrics.some((key) => result.metrics[key] != null) && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-3 text-[12px]">
                {test.derivedMetrics
                  .filter((key) => result.metrics[key] != null)
                  .map((key) => (
                    <div key={key} className="contents">
                      <dt className="text-ink-muted">
                        {t(`metrics.${key}`)}
                        {formulaFor(key)?.source === 'provisional' && (
                          <span className="ml-1 text-[10px] uppercase">{t('tests.provisional')}</span>
                        )}
                      </dt>
                      <dd className="readout text-right">{formatNumber(result.metrics[key], locale, 2)}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {result.notes && <p className="mt-3 text-[12px] text-ink-secondary">{t('result.note')}: {result.notes}</p>}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t('result.comparison')} subtitle={primary ? primary.entry.cohortLabel[locale] : undefined} />
          {primary ? (
            <ComparisonBlock
              comparison={primary}
              // Verglichen wird die Kennzahl der Referenz — beim Cooper-Test
              // die VO₂max, nicht die Distanz. Sonst stünde «3320 m» neben
              // «34,2 ± 2,8» und niemand wüsste, was womit verglichen wird.
              valueLabel={
                rating.metricKey && rating.metricKey !== test.primaryMetric && value(rating.metricKey) != null
                  ? `${formatNumber(value(rating.metricKey)!, locale, 1)} (${t(`metrics.${rating.metricKey}`)})`
                  : formatResultValue(result, locale)
              }
            />
          ) : (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t(`rating.gap.${rating.gap ?? 'no_reference'}`)}</p>
          )}
        </Panel>

        <Panel ticked className="lg:col-span-2">
          <PanelHeader title={t('rating.title')} action={<RatingWord level={rating.level} />} />
          <div className="px-4 py-4">
            <RatingScale level={rating.level} />
            <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">
              {rating.level && primary
                ? primary.percentile != null
                  ? t('rating.basisPercentile', { percentile: percentileLabel(primary.percentile, locale), group: primary.entry.cohortLabel[locale] })
                  : t('rating.basisBand', { band: primary.band?.label[locale] ?? '', group: primary.entry.cohortLabel[locale] })
                : `${t('rating.none')} ${t(`rating.gap.${rating.gap ?? 'no_reference'}`)}`}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{t('rating.caveat')}</p>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title={t('result.benchmark')} subtitle={t('result.benchmarkHint')} />
          {all.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('result.noSociety')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {all.map((comparison) => (
                <BenchmarkRow key={`${comparison.entry.cohort}-${comparison.entry.cohortLabel.de}-${comparison.entry.ageMin}`} comparison={comparison} />
              ))}
            </ul>
          )}
          {!all.some((c) => c.entry.cohort === 'population') && all.length > 0 && (
            <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">{t('result.noSociety')}</p>
          )}
        </Panel>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/verlauf/test/${test.slug}`}>{t('result.toHistory')}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/tests/${test.slug}`}>
            <Play size={13} aria-hidden />
            {t('result.again')}
          </Link>
        </Button>
        {nextTest && (
          <Button asChild variant="primary" size="sm">
            <Link to={`/tests/${nextTest.slug}`}>
              {t('result.next')}: {nextTest.name[locale]}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </>
  )
}

/** Perzentile über 99 werden nicht als «100» gezeigt: das Perzentil ist geklemmt, nicht gemessen. */
function percentileLabel(percentile: number, locale: 'de' | 'en'): string {
  return percentile >= 99.5 ? '>99' : formatNumber(percentile, locale, 0)
}

/** Dein Wert gegen Mittel, Untergrenze und Elitebereich der Gruppe. */
function ComparisonBlock({ comparison, valueLabel }: { comparison: ReferenceComparison; valueLabel: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { entry } = comparison
  const rows: { label: string; value: string }[] = [{ label: t('result.you'), value: valueLabel }]
  if (entry.method === 'mean_sd' && entry.mean != null && entry.sd != null) {
    const direction = getTest(entry.testSlug)?.direction ?? 'higher_is_better'
    const sign = direction === 'lower_is_better' ? -1 : 1
    rows.push({ label: t('result.groupMean', { group: '' }).trim(), value: `${formatNumber(entry.mean, locale, 1)} ${t('result.groupSd', { sd: formatNumber(entry.sd, locale, 1) })}` })
    rows.push({ label: t('result.elite'), value: formatNumber(entry.mean + sign * 2 * entry.sd, locale, 1) })
    rows.push({ label: t('result.cutoff'), value: formatNumber(entry.mean - sign * entry.sd, locale, 1) })
  }
  if (entry.method === 'bands' && entry.bands) {
    rows.push({ label: t('result.band'), value: entry.bands.map((b) => `${b.label[locale]}${b.upTo != null ? ` ≤ ${formatNumber(b.upTo, locale, 2)}` : ''}`).join(' · ') })
  }
  if (entry.method === 'anchor' && entry.anchor != null) {
    rows.push({ label: t('testInfo.anchor', { anchor: formatNumber(entry.anchor, locale, 1) }), value: t('result.percentOfAnchor', { percent: formatNumber(comparison.percentOfAnchor ?? 0, locale, 0) }) })
  }
  return (
    <div className="px-4 py-3">
      <dl className="space-y-1 text-[13px]">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="readout text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
        {t('result.quality', { quality: entry.quality })} · {t('result.source', { study: entry.source.study })}
        {entry.source.n != null && ` · ${t('testInfo.n', { n: entry.source.n })}`}
        {entry.protocolNote && <span className="block">{t('result.protocolNote', { note: entry.protocolNote[locale] })}</span>}
      </p>
    </div>
  )
}

function BenchmarkRow({ comparison }: { comparison: ReferenceComparison }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { entry } = comparison
  const level = comparison.percentile != null ? ratingFromPercentile(comparison.percentile) : comparison.band ? ratingFromBand(comparison) : null
  const figure =
    comparison.percentile != null
      ? comparison.percentile >= 99.5
        ? t('result.percentileTop')
        : t('result.percentile', { percentile: percentileLabel(comparison.percentile, locale) })
      : comparison.band
        ? comparison.band.label[locale]
        : comparison.percentOfAnchor != null
          ? t('result.percentOfAnchor', { percent: formatNumber(comparison.percentOfAnchor, locale, 0) })
          : '—'
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
      <span className="min-w-0">
        <span className="label-tag">{t(`result.groups.${entry.cohort}`)}</span>
        <span className="block text-[13px]">{entry.cohortLabel[locale]}</span>
        <span className="block text-[11px] text-ink-muted">
          {t('result.quality', { quality: entry.quality })} · {entry.source.study}
        </span>
      </span>
      <span className="flex items-center gap-3">
        {comparison.sdFromMean != null && (
          <span className="text-[12px] text-ink-secondary">{t('result.sdFromMean', { sd: formatNumber(comparison.sdFromMean, locale, 1) })}</span>
        )}
        <span className="readout text-[14px]">{figure}</span>
        <RatingWord level={level} />
      </span>
    </li>
  )
}
