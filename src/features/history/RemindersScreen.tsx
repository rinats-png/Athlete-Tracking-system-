import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { dueTests, suggestedIntervalDays } from '@/domain/reminders'
import { DEFAULT_RETEST_DAYS } from '@/domain/nextTest'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'

/** Erinnerungen (Konzept §24): einschalten, fällige Tests, Abstände je Test. */
export function RemindersScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, saveProfile } = useAppData()
  const settings = reminderSettingsOf(data.profile)
  const due = useMemo(() => dueTests(data.results, settings), [data.results, settings])
  const overdue = due.filter((d) => d.overdueDays >= 0)

  const setInterval = (slug: string, days: number | null) => {
    const next = { ...data.profile.reminderIntervalDays }
    if (days == null) delete next[slug]
    else next[slug] = days
    saveProfile({ reminderIntervalDays: next })
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/verlauf">
          <ArrowLeft size={14} aria-hidden />
          {t('nav.history')}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('reminders.eyebrow')} title={t('reminders.title')} intro={t('reminders.intro')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel ticked>
          <PanelHeader title={settings.remindersEnabled ? t('reminders.enabled') : t('reminders.disabled')} />
          <div className="px-4 py-3">
            <label className="flex min-h-11 items-center gap-3 text-[14px]">
              <input
                type="checkbox"
                className="size-5"
                checked={settings.remindersEnabled}
                onChange={(e) => saveProfile({ remindersEnabled: e.target.checked })}
              />
              {t('reminders.enable')}
            </label>
          </div>
          <PanelHeader title={t('reminders.overdue')} className="border-t" />
          {!settings.remindersEnabled || overdue.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('reminders.overdueEmpty')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {overdue.map((d) => (
                <li key={d.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-[13px]">
                    {t('reminders.overdueLine', {
                      test: getTest(d.slug)?.name[locale] ?? d.slug,
                      weeks: Math.floor((d.overdueDays + d.intervalDays) / 7),
                    })}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/tests/${d.slug}`}>{t('testCard.run')}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={t('reminders.intervals')} subtitle={t('reminders.intervalsHint', { days: DEFAULT_RETEST_DAYS })} />
          <ul className="divide-y divide-line">
            {due.map((d) => {
              const suggestion = suggestedIntervalDays(data.results, d.slug)
              const own = data.profile.reminderIntervalDays[d.slug] ?? null
              return (
                <li key={d.slug} className="px-4 py-3">
                  <p className="text-[14px] font-medium">{getTest(d.slug)?.name[locale] ?? d.slug}</p>
                  <p className="text-[11px] text-ink-muted">{t('reminders.dueOn', { date: formatDate(d.dueOn, locale) })}</p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <NumberField
                      label={`${t('reminders.interval')} (${own == null ? t('reminders.default') : ''})`}
                      unit="d"
                      value={own}
                      onChange={(v) => setInterval(d.slug, v)}
                      min={1}
                      max={730}
                      step={1}
                      className="w-40"
                    />
                    {suggestion != null ? (
                      <Button variant="ghost" size="sm" onClick={() => setInterval(d.slug, suggestion)}>
                        {t('reminders.suggest', { days: suggestion })} · {t('reminders.apply')}
                      </Button>
                    ) : (
                      <span className="pb-3 text-[11px] text-ink-muted">{t('reminders.noSuggestion')}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </>
  )
}
