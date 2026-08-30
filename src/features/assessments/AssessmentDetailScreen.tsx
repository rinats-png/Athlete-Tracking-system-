import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, CircleCheck, Circle, Play, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import {
  assessmentProgress,
  coveredDimensions,
  missingDimensions,
  resultsForAssessment,
} from '@/domain/assessment'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/types/domain'

/**
 * Laufende Diagnostik.
 *
 * Ein Termin ist eine Liste offener Messungen, kein Formular. Der Screen zeigt
 * durchgehend, was noch fehlt, und lässt jeden Test einzeln starten — eine
 * Diagnostik zieht sich über Stunden oder zwei Tage, und die App muss den
 * Zwischenstand aushalten, ohne dass etwas verloren geht.
 */
export function AssessmentDetailScreen() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const navigate = useNavigate()
  const { data, saveAssessment, deleteAssessment } = useAppData()
  const [confirmDelete, setConfirmDelete] = useState(false)

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
  const covered = coveredDimensions(results)
  const missing = missingDimensions(results)
  const resultFor = (slug: string) => results.find((r) => r.testSlug === slug)

  const finish = () => {
    saveAssessment({
      ...assessment,
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
    navigate(`/diagnostik/${assessment.id}/abschluss`)
  }

  const reopen = () =>
    saveAssessment({ ...assessment, status: 'in_progress', completedAt: null })

  const rows = [...progress.planned, ...progress.additional]

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/diagnostik">
          <ArrowLeft size={14} aria-hidden />
          {t('assessments.back')}
        </Link>
      </Button>

      <header className="mb-4">
        <span className="label-tag">{t(`assessments.status.${assessment.status}`)}</span>
        <h1 className="mt-1 font-display text-[28px] leading-tight font-bold sm:text-[34px]">
          {assessment.title ?? formatDate(assessment.performedOn, locale)}
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-secondary">
          {formatDate(assessment.performedOn, locale)} ·{' '}
          {t('assessments.testsDone', {
            done: progress.completed.length + progress.additional.length,
            planned: progress.planned.length,
          })}
        </p>
      </header>

      {/* Fortschritt als Balken: die einzige Zahl, die während des Termins
          laufend gebraucht wird. */}
      <div
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('assessments.progress')}
        className="mb-4 h-1.5 w-full bg-line"
      >
        <div className="h-full bg-accent transition-[width]" style={{ width: `${progress.percent}%` }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader title={t('assessments.plan')} subtitle={t('assessments.planHint')} />
          <ul>
            {rows.map((slug) => {
              const test = getTest(slug)
              const result = resultFor(slug)
              if (!test) return null
              return (
                <li key={slug} className="border-t border-line first:border-t-0">
                  <div className="flex min-h-16 items-center gap-3 px-4 py-3">
                    {result ? (
                      <CircleCheck size={18} className="shrink-0 text-accent-text" aria-hidden />
                    ) : (
                      <Circle size={18} className="shrink-0 text-ink-muted" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{test.name[locale]}</span>
                      <span className="block text-[11px] text-ink-muted">
                        {t(`dimensions.${test.dimension}`)}
                        {progress.additional.includes(slug) && ` · ${t('assessments.unplanned')}`}
                      </span>
                    </span>
                    {result ? (
                      <span className="readout shrink-0 text-[14px] tabular-nums">
                        {formatResultValue(result, locale, data.profile.unitSystem)}
                      </span>
                    ) : (
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <Link to={`/tests/${slug}?diagnostik=${assessment.id}`}>
                          <Play size={13} aria-hidden />
                          {t('assessments.measure')}
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-line px-4 py-3">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/tests?diagnostik=${assessment.id}`}>{t('assessments.addTest')}</Link>
            </Button>
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <PanelHeader title={t('assessments.coverage')} />
            <ul className="space-y-1.5 px-4 py-4">
              {[...covered, ...missing].map((dimension) => (
                <li key={dimension} className="flex items-center gap-2 text-[13px]">
                  <span
                    aria-hidden
                    className={cn(
                      'inline-block h-2 w-2 shrink-0 rounded-full',
                      covered.includes(dimension) ? 'bg-accent' : 'bg-line',
                    )}
                  />
                  <span className={covered.includes(dimension) ? '' : 'text-ink-muted'}>
                    {t(`dimensions.${dimension}`)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title={t('assessments.finishTitle')} />
            <div className="space-y-3 px-4 py-4">
              {assessment.status === 'completed' ? (
                <>
                  <p className="text-[13px] text-ink-secondary">{t('assessments.finishedHint')}</p>
                  <Button asChild variant="primary" size="md" className="w-full">
                    <Link to={`/diagnostik/${assessment.id}/abschluss`}>
                      {t('assessments.showSummary')}
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full" onClick={reopen}>
                    {t('assessments.reopen')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-ink-secondary">
                    {progress.open.length > 0
                      ? t('assessments.finishEarly', { count: progress.open.length })
                      : t('assessments.finishReady')}
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={results.length === 0}
                    onClick={finish}
                  >
                    <Check size={15} strokeWidth={2.5} aria-hidden />
                    {t('assessments.finish')}
                  </Button>
                </>
              )}

              {confirmDelete ? (
                <div className="border-l-2 border-critical bg-critical/10 px-3 py-2">
                  <p className="text-[12px] leading-snug text-ink-secondary">
                    {t('assessments.deleteHint')}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        deleteAssessment(assessment.id)
                        navigate('/diagnostik')
                      }}
                    >
                      {t('assessments.deleteConfirm')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      {t('actions.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} aria-hidden />
                  {t('assessments.delete')}
                </Button>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
