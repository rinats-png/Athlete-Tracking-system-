import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { weekReview } from '@/domain/weekReview'
import { getTest } from '@/data/testCatalog'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'

/**
 * Deine Woche — der Rückblick auf die letzten sieben Tage (Produktdoktrin §19).
 * Beschreibt, was war. Keine Streaks, keine Abzeichen, keine Ratschläge.
 */
export function WeekReviewScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, diary } = useAppData()
  const review = useMemo(
    () => weekReview({ diary, results: data.results, reminders: reminderSettingsOf(data.profile) }),
    [diary, data.results, data.profile],
  )
  const d = (day: string) => formatDate(`${day}T12:00:00Z`, locale)
  const name = (slug: string) => pick(getTest(slug)?.name, locale) ?? slug
  const win = review.win

  return (
    <div data-testid="week-review">
      <ScreenHeader eyebrow={t('week.eyebrow')} title={t('week.title')} intro={t('week.range', { from: d(review.from), to: d(review.to) })} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel float data-testid="week-load">
          <PanelHeader title={t('week.load.title')} />
          <div className="px-4 pb-4">
            <p className="readout text-[34px] font-light leading-none">
              {formatNumber(review.load.week, locale, 0)} <span className="text-[13px] text-ink-muted">AU</span>
            </p>
            <p className="mt-2 text-[13px] text-ink-secondary">
              {review.load.previousWeeklyMean != null
                ? t('week.load.compare', { mean: formatNumber(review.load.previousWeeklyMean, locale, 0) })
                : t('week.load.noBaseline')}
            </p>
            <p className="mt-2 text-[11px] text-ink-muted">{t('week.load.note')}</p>
          </div>
        </Panel>

        <Panel data-testid="week-activity">
          <PanelHeader title={t('week.activity.title')} />
          <dl className="px-4 pb-4 text-[14px]">
            <div className="flex justify-between border-t border-line py-2 first:border-t-0">
              <dt className="text-ink-secondary">{t('week.activity.checkins')}</dt>
              <dd className="readout">{t('week.activity.of7', { count: review.checkinDays })}</dd>
            </div>
            <div className="flex justify-between border-t border-line py-2">
              <dt className="text-ink-secondary">{t('week.activity.results')}</dt>
              <dd className="readout">{review.results}</dd>
            </div>
          </dl>
        </Panel>

        <Panel data-testid="week-win">
          <PanelHeader title={t('week.win.title')} />
          <div className="px-4 pb-4">
            {win ? (
              <>
                <p className="font-display text-[22px] leading-tight font-bold">{name(win.slug)}</p>
                <p className="mt-1 text-[14px]">
                  +{formatNumber(win.report.changePercent ?? 0, locale, 1)} % · {t('week.win.beyond', { detectable: formatNumber(win.report.detectablePercent ?? 0, locale, 1) })}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">{t('week.win.note')}</p>
              </>
            ) : (
              <p className="text-[14px] text-ink-secondary">{t('week.win.none')}</p>
            )}
          </div>
        </Panel>

        <Panel data-testid="week-review-due">
          <PanelHeader title={t('week.due.title')} />
          <div className="px-4 pb-4">
            {review.overdue.length === 0 ? (
              <p className="text-[14px] text-ink-secondary">{t('week.due.none')}</p>
            ) : (
              <ul>
                {review.overdue.slice(0, 3).map((o) => (
                  <li key={o.slug} className="border-t border-line py-2 first:border-t-0">
                    <Link to={`/tests/${o.slug}`} className="flex min-h-11 items-center justify-between gap-3 text-[14px]">
                      <span>{name(o.slug)}</span>
                      <span className="text-[12px] text-ink-muted">{t('week.due.days', { count: Math.max(0, o.overdueDays) })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
