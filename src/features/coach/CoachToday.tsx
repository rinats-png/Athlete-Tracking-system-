import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Eye, FileText, Flag } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ImageCard } from '@/components/ui/ImageCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { coachToday, type CoachToday as CoachTodayView, type PriorityAthlete } from '@/domain/coachToday'
import { axisLabel } from '@/data/profileAxes'
import { testImageUrl } from '@/data/testImages'
import { formatDate, formatNumber } from '@/lib/format'
import { checkinsOf, teamCheckins } from '@/domain/checkin'
import { coachCopilot, type DraftSpec } from '@/domain/coachCopilot'
import { checkinShareEnabled } from '@/lib/checkinShare'
import { fetchLinkedCheckins, type LinkedCheckins } from '@/lib/supabase/checkinShare'

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
              <Link to="/trainer" className="inline-flex min-h-11 min-w-11 items-center justify-end text-[12px] text-accent-text underline underline-offset-2">
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
                <Link to="/trainer/heatmap" className="inline-flex min-h-11 min-w-11 items-center justify-end text-[12px] text-accent-text underline underline-offset-2">
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

        <CheckinsCard />

        <CopilotCard today={today} />

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

/**
 * Check-ins dieser Woche (Produktdoktrin §32): wer hat sich gemeldet, wer
 * weicht von der EIGENEN Baseline ab. Beschreibt, erklärt nichts, empfiehlt
 * nichts. Lokal geführte Athleten zählen immer; verbundene Athleten nur, wenn
 * sie ihre Check-ins zeigen und der Bau-Schalter an ist.
 */
function CheckinsCard() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { athletes } = useAppData()
  const [linked, setLinked] = useState<LinkedCheckins[]>([])
  useEffect(() => {
    if (!checkinShareEnabled()) return
    let alive = true
    void fetchLinkedCheckins(new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10)).then((r) => alive && r && setLinked(r))
    return () => {
      alive = false
    }
  }, [])
  const team = useMemo(() => {
    const own = athletes.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name || a.profile.firstName || '', checkins: checkinsOf(a.diary) }))
    const ids = new Set(own.map((p) => p.id))
    return teamCheckins([...own, ...linked.filter((p) => !ids.has(p.id))])
  }, [athletes, linked])
  if (team.total === 0) return null
  const dev = (field: string) => t(`coachToday.checkins.dev.${field}`)
  return (
    <Panel data-testid="today-checkins">
      <PanelHeader title={t('coachToday.checkins.title')} subtitle={t('coachToday.checkins.count', { done: team.withCheckin, total: team.total })} />
      <div className="px-4 pb-3">
        {team.flagged.length === 0 ? (
          <p className="text-[14px] text-ink-secondary" data-testid="checkins-none-flagged">
            {team.withCheckin === 0 ? t('coachToday.checkins.none') : t('coachToday.checkins.noneFlagged')}
          </p>
        ) : (
          <ul>
            {team.flagged.map((r) => (
              <li key={r.id} className="border-t border-line py-2 first:border-t-0" data-testid={`checkin-flag-${r.id}`}>
                <p className="text-[14px] font-medium">{r.name || t('coach.unnamed')}</p>
                {r.deviations.map((d) => (
                  <p key={d.field} className="text-[12px] text-ink-secondary">
                    {dev(d.field)} · {t('coachToday.checkins.values', { recent: formatNumber(d.recent, locale, 1), baseline: formatNumber(d.baseline, locale, 1) })}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('coachToday.checkins.note')}</p>
    </Panel>
  )
}

/**
 * Zusammenfassung und Nachrichtenentwürfe (Produktdoktrin §31). Die Entwürfe
 * sind bearbeitbar und gehen nirgends hin: KYDON sendet nichts, der Trainer
 * kopiert und verschickt selbst.
 */
function CopilotCard({ today }: { today: CoachTodayView }) {
  const { t } = useTranslation()
  const copilot = useMemo(() => coachCopilot(today), [today])
  const draftOf = (d: DraftSpec) => t(`coachToday.copilot.draft.${d.template}`, { ...d.params, name: d.name || t('coachToday.copilot.noName') })
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
    } catch {
      // Ohne Zwischenablage bleibt der Text im Feld markierbar.
    }
  }
  return (
    <Panel className="lg:col-span-2" data-testid="today-copilot">
      <PanelHeader title={t('coachToday.copilot.title')} subtitle={t('coachToday.copilot.sub')} />
      <ul className="space-y-1 px-4 pb-2 text-[14px]" data-testid="copilot-summary">
        {copilot.summary.map((f) => (
          <li key={f.key}>{t(`coachToday.copilot.${f.key}`, f.params)}</li>
        ))}
      </ul>
      <div className="px-4 pb-4">
        <h3 className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">{t('coachToday.copilot.draftsTitle')}</h3>
        {copilot.drafts.length === 0 ? (
          <p className="mt-1 text-[14px] text-ink-secondary">{t('coachToday.copilot.none')}</p>
        ) : (
          copilot.drafts.map((d) => {
            const value = edited[d.athleteId] ?? draftOf(d)
            return (
              <div key={d.athleteId} className="mt-2" data-testid={`draft-${d.athleteId}`}>
                <label className="block text-[12px] text-ink-secondary" htmlFor={`draft-${d.athleteId}-text`}>
                  {d.name || t('coach.unnamed')}
                </label>
                <textarea
                  id={`draft-${d.athleteId}-text`}
                  value={value}
                  onChange={(e) => setEdited((m) => ({ ...m, [d.athleteId]: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px]"
                />
                <button type="button" onClick={() => void copy(d.athleteId, value)} className="mt-1 min-h-11 rounded-pill border border-line px-4 text-[13px] hover:bg-surface-sunken">
                  {copied === d.athleteId ? t('coachToday.copilot.copied') : t('coachToday.copilot.copy')}
                </button>
              </div>
            )
          })
        )}
      </div>
    </Panel>
  )
}
