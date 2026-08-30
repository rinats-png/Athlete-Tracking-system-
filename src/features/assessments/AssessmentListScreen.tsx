import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, ChevronRight, CircleDashed, CircleCheck, CirclePause } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppData } from '@/lib/store/AppDataProvider'
import { assessmentProgress, resultsForAssessment } from '@/domain/assessment'
import { formatDate } from '@/lib/format'
import type { AppLocale } from '@/types/domain'

/**
 * Übersicht aller Diagnostiken.
 *
 * Bewusst nach Datum absteigend und ohne Filter: wer mehr als eine Handvoll
 * Termine hat, sucht nach dem letzten oder dem gleichen Zeitraum im Vorjahr —
 * beides steht mit einer Datumsliste sofort da.
 */
export function AssessmentListScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const { data } = useAppData()

  const assessments = [...data.assessments].sort((a, b) =>
    b.performedOn.localeCompare(a.performedOn),
  )

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight font-bold sm:text-[34px]">
            {t('assessments.title')}
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">
            {t('assessments.intro')}
          </p>
        </div>
        <Button asChild variant="primary" size="md">
          <Link to="/diagnostik/neu">
            <CalendarPlus size={15} aria-hidden />
            {t('assessments.new')}
          </Link>
        </Button>
      </header>

      {assessments.length === 0 ? (
        <EmptyState
          title={t('assessments.emptyTitle')}
          body={t('assessments.emptyBody')}
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/diagnostik/neu">{t('assessments.new')}</Link>
            </Button>
          }
        />
      ) : (
        <Panel>
          <PanelHeader title={t('assessments.all')} subtitle={t('assessments.count', { count: assessments.length })} />
          <ul>
            {assessments.map((assessment) => {
              const results = resultsForAssessment(data, assessment.id)
              const progress = assessmentProgress(assessment, results)
              return (
                <li key={assessment.id} className="border-t border-line first:border-t-0">
                  <Link
                    to={`/diagnostik/${assessment.id}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <StatusIcon status={assessment.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {assessment.title ?? formatDate(assessment.performedOn, locale)}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-muted">
                        {t(`assessments.status.${assessment.status}`)} ·{' '}
                        {formatDate(assessment.performedOn, locale)} ·{' '}
                        {t('assessments.testsDone', {
                          done: progress.completed.length + progress.additional.length,
                          planned: progress.planned.length,
                        })}
                      </span>
                    </span>
                    <span className="readout shrink-0 text-[13px] tabular-nums">{progress.percent}%</span>
                    <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </>
  )
}

function StatusIcon({ status }: { status: 'planned' | 'in_progress' | 'completed' | 'abandoned' }) {
  const { t } = useTranslation()
  const Icon =
    status === 'completed' ? CircleCheck : status === 'abandoned' ? CirclePause : CircleDashed
  return (
    <Icon
      size={18}
      aria-label={t(`assessments.status.${status}`)}
      className={status === 'completed' ? 'shrink-0 text-accent-text' : 'shrink-0 text-ink-muted'}
    />
  )
}
