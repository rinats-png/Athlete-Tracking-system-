import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileText, TriangleAlert } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { nextAssessment } from '@/domain/insights'
import {
  assessmentProgress,
  coveredDimensions,
  missingDimensions,
  resultsForAssessment,
} from '@/domain/assessment'
import { assessQuality, isOutlier } from '@/domain/dataQuality'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { normPercentile } from '@/data/norms'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/types/domain'

/**
 * Abschluss einer Diagnostik.
 *
 * Nicht nur eine Ergebnisliste, sondern eine ehrliche Einordnung dessen, was
 * der Termin hergibt: was gemessen wurde, was fehlt, welche Werte belastbar
 * sind und welche mit Vorbehalt zu lesen sind. Ein Bericht, der Lücken
 * verschweigt, ist gefährlicher als gar keiner.
 */
export function AssessmentSummaryScreen() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const { data, saveAssessment } = useAppData()

  const assessment = data.assessments.find((a) => a.id === id)
  if (!assessment) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('assessments.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/diagnostik">{t('assessments.back')}</Link>
        </Button>
      </Panel>
    )
  }

  const results = resultsForAssessment(data, assessment.id)
  const progress = assessmentProgress(assessment, results)
  const missing = missingDimensions(results)
  const covered = coveredDimensions(results)

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={`/diagnostik/${assessment.id}`}>
          <ArrowLeft size={14} aria-hidden />
          {t('assessments.backToAssessment')}
        </Link>
      </Button>

      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
        <span className="label-tag">{t('assessments.summary')}</span>
        <h1 className="mt-1 font-display text-[28px] leading-tight font-bold sm:text-[34px]">
          {assessment.title ?? formatDate(assessment.performedOn, locale)}
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-secondary">
          {formatDate(assessment.performedOn, locale)} ·{' '}
          {t('assessments.testCount', { count: results.length })} ·{' '}
          {t('assessments.axisCount', { count: covered.length })}
        </p>
        </div>
        <Button asChild variant="outline" size="md">
          <Link to={`/bericht/${assessment.id}`}>
            <FileText size={15} aria-hidden />
            {t('report.open')}
          </Link>
        </Button>
      </header>

      {missing.length > 0 && (
        <p className="mb-4 flex gap-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] leading-snug text-ink-secondary">
          <TriangleAlert size={15} className="mt-px shrink-0" aria-hidden />
          <span>
            {t('assessments.summaryGaps', {
              axes: missing.map((d) => t(`dimensions.${d}`)).join(', '),
            })}
          </span>
        </p>
      )}

      <Panel>
        <PanelHeader title={t('assessments.results')} subtitle={t('assessments.resultsHint')} />
        {results.length === 0 ? (
          <p className="px-4 py-6 text-[14px] text-ink-secondary">{t('assessments.noResults')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-muted">
                  <th scope="col" className="px-4 py-2 font-medium">{t('table.test')}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t('table.value')}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t('table.percentile')}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t('table.quality')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const test = getTest(result.testSlug)
                  const quality = assessQuality(result)
                  const outlier = isOutlier(result, data.results)
                  const percentile =
                    test && result.score != null
                      ? normPercentile(test.slug, test.primaryMetric, result.sex, result.ageYears, result.score)
                      : null
                  return (
                    <tr key={result.id} className="border-b border-line last:border-b-0">
                      <th scope="row" className="px-4 py-2.5 text-left font-normal">
                        {test?.name[locale] ?? result.testSlug}
                        {result.attemptSelection && (
                          <span className="ml-1.5 text-[11px] text-ink-muted">
                            ({t(`assessments.attempt.${result.attemptSelection}`)})
                          </span>
                        )}
                      </th>
                      <td className="readout px-4 py-2.5 tabular-nums">
                        {formatResultValue(result, locale, data.profile.unitSystem)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-ink-secondary">
                        {percentile != null ? `P${Math.round(percentile)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'text-[12px]',
                            quality.status === 'valid' ? 'text-ink-secondary' : 'text-warning',
                          )}
                          title={quality.reasons.map((r) => t(r)).join(' · ')}
                        >
                          {t(`quality.status.${quality.status}`)}
                          {outlier && ` · ${t('quality.outlier')}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* §32: der nächste Termin wird festgelegt, nicht nur vorgeschlagen.
          Der Vorschlag der App ist eine Voreinstellung, die Planung des
          Athleten ist eine Entscheidung. */}
      <Panel className="mt-4">
        <PanelHeader title={t('insights.nextAssessment')} />
        <div className="flex flex-wrap items-end gap-3 px-4 py-4">
          <label className="block">
            <span className="label-tag">{t('assessments.nextDate')}</span>
            <input
              type="date"
              value={
                assessment.nextAssessmentOn ??
                nextAssessment(data.assessments, data.results).date ??
                ''
              }
              onChange={(e) =>
                saveAssessment({ ...assessment, nextAssessmentOn: e.target.value || null })
              }
              className="mt-1.5 h-11 border border-line bg-surface-sunken px-3 text-[15px]"
            />
          </label>
          <p className="max-w-[46ch] flex-1 text-[12px] leading-relaxed text-ink-muted">
            {assessment.nextAssessmentOn
              ? t('assessments.nextFixed')
              : t('assessments.nextSuggested')}
          </p>
        </div>
      </Panel>

      {progress.open.length > 0 && (
        <p className="mt-4 text-[13px] text-ink-muted">
          {t('assessments.stillOpen', {
            tests: progress.open.map((s) => getTest(s)?.name[locale] ?? s).join(', '),
          })}
        </p>
      )}

      <p className="mt-6 max-w-[70ch] border-t border-line pt-4 text-[12px] leading-relaxed text-ink-muted">
        {t('assessments.disclaimer')}
      </p>
    </>
  )
}
