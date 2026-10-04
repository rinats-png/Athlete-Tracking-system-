import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Eye, FileText, Flag } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ImageCard } from '@/components/ui/ImageCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { coachToday, type PriorityAthlete } from '@/domain/coachToday'
import { axisLabel } from '@/data/profileAxes'
import { testImageUrl } from '@/data/testImages'
import { formatDate } from '@/lib/format'

/**
 * Heute — die Startseite des Trainers (Produktdoktrin §36).
 *
 * Ein Blick, eine Minute: wer ist aktuell, wer sollte geprüft werden, wer ist
 * überfällig. Die Karten beschreiben Daten und nennen ihren Grund; kein
 * «bereit», kein Risiko, keine Freigabe. Alles rechnet `domain/coachToday.ts`.
 */
export function CoachToday() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const { athletes, testDays, data, switchAthlete } = useAppData()
  const today = useMemo(() => coachToday(athletes, testDays), [athletes, testDays])
  const { status } = today
  const d = (day: string) => formatDate(`${day}T12:00:00Z`, locale)

  if (status.total === 0) {
    return <EmptyState title={t('coachDash.emptyTitle')} body={t('coachDash.emptyBody')} />
  }

  const share = (n: number) => `${Math.round((n / status.total) * 100)}%`
  const open = (id: string) => {
    switchAthlete(id)
    navigate('/verlauf')
  }

  return (
    <div data-testid="coach-today">
      <header className="mb-4">
        <p className="label-tag">{t('coachToday.eyebrow')}</p>
        <h1 className="mt-1 font-display text-[30px] leading-tight font-bold sm:text-[36px]">{data.branding.organisation || t('coachToday.title')}</h1>
        <p className="mt-1 text-[14px] text-ink-secondary">{t('coachToday.week', { from: d(today.week.from), to: d(today.week.to) })}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel float data-testid="today-status" className="lg:col-span-2">
          <PanelHeader title={t('coachToday.status.title')} subtitle={t('coachToday.status.athletes', { count: status.total })} />
          <div className="grid grid-cols-3 gap-px bg-line">
            {(
              [
                ['current', CheckCircle2, status.current, 'var(--accent)'],
                ['review', Eye, status.review, 'var(--warning)'],
                ['overdue', CalendarClock, status.overdue, 'var(--line-strong)'],
              ] as const
            ).map(([key, Icon, n, color]) => (
              <div key={key} className="bg-surface px-3 py-3" data-testid={`status-${key}`}>
                <div className="flex items-center gap-2">
                  <Icon size={20} aria-hidden style={{ color }} />
                  <span className="readout text-[26px] font-light leading-none">{n}</span>
                </div>
                <p className="mt-1 text-[12px] text-ink-secondary">{t(`coachToday.status.${key}`)}</p>
                <div className="mt-2 h-1.5 rounded-pill bg-surface-sunken" aria-hidden>
                  <i className="block h-full rounded-pill" style={{ width: share(n), background: color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('coachToday.status.note')}</p>
        </Panel>

        <Panel data-testid="today-priority">
          <PanelHeader
            title={t('coachToday.priority.title')}
            subtitle={today.priority.length > 0 ? t('coachToday.priority.flagged', { count: today.priority.length }) : undefined}
            action={
              <Link to="/trainer" className="inline-flex min-h-11 items-center text-[12px] text-accent-text underline underline-offset-2">
                {t('coachToday.priority.all')}
              </Link>
            }
          />
          {today.priority.length === 0 ? (
            <p className="px-4 pb-4 text-[14px] text-ink-secondary">{t('coachToday.priority.none')}</p>
          ) : (
            <ul className="px-2 pb-2">
              {today.priority.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => open(p.id)} className="flex min-h-14 w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-sunken">
                    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-pill bg-accent-quiet font-display text-[14px] font-semibold text-accent-text">
                      {(p.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{p.name || t('coach.unnamed')}</span>
                      <span className="block text-[12px] text-ink-secondary">{reasonText(p, t)}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {today.matrix && (
          <Panel data-testid="today-matrix">
            <PanelHeader
              title={t('coachToday.matrix.title')}
              subtitle={t('coachToday.matrix.sub')}
              action={
                <Link to="/trainer/heatmap" className="inline-flex min-h-11 items-center text-[12px] text-accent-text underline underline-offset-2">
                  {t('coachToday.matrix.open')}
                </Link>
              }
            />
            <div className="overflow-x-auto px-4 pb-3">
              <table className="w-full min-w-[280px] border-separate border-spacing-y-1 text-[12px]">
                <thead>
                  <tr className="text-ink-muted">
                    <th scope="col" className="w-[30%] text-left font-normal">
                      <span className="sr-only">{t('coachDash.name')}</span>
                    </th>
                    {today.matrix.axisIds.map((axis) => (
                      <th key={axis} scope="col" className="px-0.5 text-center font-normal">
                        <span className="block truncate">{axisLabel(axis, t, locale)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {today.matrix.athletes.map((a) => (
                    <tr key={a.id}>
                      <th scope="row" className="truncate pr-2 text-left font-normal">{a.name || t('coach.unnamed')}</th>
                      {today.matrix!.axisIds.map((axis) => {
                        const cell = today.matrix!.cells.find((c) => c.athleteId === a.id && c.axisId === axis)
                        const score = cell?.score ?? null
                        return (
                          <td key={axis} className="px-0.5">
                            <span
                              role="img"
                              aria-label={score == null ? t('coachToday.matrix.noData') : `${axisLabel(axis, t, locale)}: ${Math.round(score)}`}
                              className="block h-7 rounded-[4px]"
                              style={{
                                background:
                                  score == null
                                    ? 'color-mix(in oklab, var(--line) 55%, var(--plane))'
                                    : `color-mix(in oklab, var(--accent) ${Math.round(18 + score * 0.62)}%, var(--plane))`,
                              }}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <ImageCard image={testImageUrl('sprint_30m')} data-testid="today-testday">
          <div className="px-4 py-4">
            <p className="label-tag">{t('coachToday.testDay.title')}</p>
            {today.testDay ? (
              <>
                <p className="mt-1 font-display text-[22px] font-bold">{today.testDay.title || t('testDay.plural')}</p>
                <p className="text-[13px] text-ink-secondary">
                  {t('coachToday.testDay.body', { athletes: today.testDay.athletes, stations: today.testDay.stations })} · {d(today.testDay.plannedOn)}
                </p>
                <Link to={`/trainer/testtag/${today.testDay.id}`} className="mt-2 inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
                  {t('coachToday.testDay.open')}
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-[14px] text-ink-secondary">{t('coachToday.testDay.none')}</p>
                <Link to="/trainer/testtag" className="mt-2 inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
                  {t('coachToday.actions.testDay')}
                </Link>
              </>
            )}
          </div>
        </ImageCard>

        <ImageCard image={testImageUrl('repeated_sprint_bike') ?? testImageUrl('countermovement_jump')} data-testid="today-pattern">
          <div className="px-4 py-4">
            <p className="label-tag">{t('coachToday.pattern.title')}</p>
            {today.pattern ? (
              <p className="mt-1 text-[14px] leading-relaxed">
                {t('coachToday.pattern.body', {
                  open: today.pattern.openCount,
                  covered: today.pattern.covered,
                  axis: axisLabel(today.pattern.axisId, t, locale),
                })}
              </p>
            ) : (
              <p className="mt-1 text-[14px] leading-relaxed text-ink-secondary">{t('coachToday.pattern.none')}</p>
            )}
          </div>
        </ImageCard>

        <Panel className="lg:col-span-2" data-testid="today-actions">
          <PanelHeader title={t('coachToday.actions.title')} />
          <div className="grid gap-2 px-4 pb-4 sm:grid-cols-3">
            {(
              [
                ['/trainer/testtag', ClipboardList, 'testDay'],
                ['/trainer', Flag, 'review'],
                ['/trainer/gruppenbericht', FileText, 'report'],
              ] as const
            ).map(([to, Icon, key]) => (
              <Link key={key} to={to} className="flex min-h-12 items-center gap-3 rounded-md border border-line px-3 text-[14px] hover:bg-surface-sunken">
                <Icon size={18} aria-hidden className="text-accent-text" />
                <span className="flex-1">{t(`coachToday.actions.${key}`)}</span>
                <ChevronRight size={16} aria-hidden className="text-ink-muted" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function reasonText(p: PriorityAthlete, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (p.reason === 'overdue' && p.daysOverdue != null && p.daysOverdue > 0) return t('coachToday.reason.overdueDays', { days: p.daysOverdue })
  return t(`coachToday.reason.${p.reason}`)
}
