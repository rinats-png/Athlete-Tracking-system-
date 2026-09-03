import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { monthCalendar } from '@/domain/calendar'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { cn } from '@/lib/utils'

/** Kalender (Konzept §23): wann getestet wurde, was, und was fällig ist. */
export function CalendarScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const settings = reminderSettingsOf(data.profile)
  const month = useMemo(
    () => monthCalendar(cursor.year, cursor.month, data.results, data.assessments, settings, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cursor, data.results, data.assessments, settings.remindersEnabled, settings.reminderIntervalDays],
  )
  const weekdays = t('calendar.weekdays', { returnObjects: true }) as string[]
  const monthLabel = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', { month: 'long', year: 'numeric' }).format(
    new Date(cursor.year, cursor.month - 1, 1),
  )
  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month - 1 + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() + 1 })
    setSelectedDay(null)
  }
  const day = selectedDay ? month.weeks.flat().find((d) => d.date === selectedDay) : null
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/verlauf">
          <ArrowLeft size={14} aria-hidden />
          {t('nav.history')}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('calendar.eyebrow')} title={t('calendar.title')} />

      <Panel ticked className="max-w-2xl">
        <PanelHeader
          title={monthLabel}
          action={
            <span className="flex gap-1">
              <Button variant="ghost" size="icon" aria-label={t('calendar.prev')} onClick={() => shift(-1)}>
                <ChevronLeft size={16} aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={t('calendar.next')} onClick={() => shift(1)}>
                <ChevronRight size={16} aria-hidden />
              </Button>
            </span>
          }
        />
        <div className="grid grid-cols-7 border-b border-line text-center">
          {weekdays.map((w) => (
            <span key={w} className="label-tag py-1.5">{w}</span>
          ))}
        </div>
        {month.weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7">
            {week.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDay(d.date)}
                aria-pressed={selectedDay === d.date}
                aria-label={`${formatDate(d.date, locale)}: ${d.results.length} ${t('calendar.results')}, ${d.due.length} ${t('calendar.due')}`}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-start gap-1 border-b border-r border-line py-1 text-[13px]',
                  !d.inMonth && 'text-ink-muted/60',
                  d.date === todayKey && 'font-bold',
                  selectedDay === d.date && 'bg-accent-quiet',
                )}
              >
                <span className="readout">{Number(d.date.slice(8))}</span>
                <span className="flex gap-0.5">
                  {d.results.length > 0 && <span className="size-1.5 rounded-full bg-accent" aria-hidden />}
                  {d.due.length > 0 && <span className="size-1.5 rounded-full bg-warning" aria-hidden />}
                </span>
              </button>
            ))}
          </div>
        ))}
        <p className="flex gap-4 px-4 py-2 text-[11px] text-ink-muted">
          <span><span className="mr-1 inline-block size-1.5 rounded-full bg-accent" aria-hidden />{t('calendar.legendResult')}</span>
          <span><span className="mr-1 inline-block size-1.5 rounded-full bg-warning" aria-hidden />{t('calendar.legendDue')}</span>
        </p>
      </Panel>

      {day && (
        <Panel className="mt-4 max-w-2xl">
          <PanelHeader title={formatDate(day.date, locale)} />
          {day.results.length === 0 && day.due.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('calendar.dayEmpty')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {day.results.map((r) => (
                <li key={r.id}>
                  <Link to={`/ergebnis/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent-quiet">
                    <span className="text-[14px]">{getTest(r.testSlug)?.name[locale] ?? r.testSlug}</span>
                    <span className="readout">{formatResultValue(r, locale)}</span>
                  </Link>
                </li>
              ))}
              {day.due.map((slug) => (
                <li key={slug}>
                  <Link to={`/tests/${slug}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent-quiet">
                    <span className="text-[14px]">{getTest(slug)?.name[locale] ?? slug}</span>
                    <span className="label-tag text-warning">{t('calendar.due')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  )
}
