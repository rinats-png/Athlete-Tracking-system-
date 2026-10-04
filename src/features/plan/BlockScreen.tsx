import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { blockEndDay, blockReport, blockWeek, nextBlockSuggestion, openSessionsOn, overrideSession, shownBlock, weekChecks } from '@/domain/trainingBlock'
import { blockText } from '@/features/plan/planText'
import { trainingPlanMode } from '@/features/plan/PlanPreviewScreen'
import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'
import type { StoredPlannedSession } from '@/lib/store/localStore'

/**
 * Aktiver Trainingsblock: Wochenprüfung, Einheiten mit Coach Override (Grund
 * Pflicht) und der Block-Bericht gegen den Messfehler. Der Plan ist ein
 * Vorschlag; der Trainer hat das letzte Wort.
 */
export function BlockScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, trainingBlocks, saveTrainingBlock } = useAppData()
  const block = shownBlock(trainingBlocks)
  const readOnly = block?.status === 'closed'
  const today = new Date().toISOString().slice(0, 10)
  const [editing, setEditing] = useState<string | null>(null)
  const [day, setDay] = useState(1)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const checks = useMemo(() => (block ? weekChecks(block, today) : []), [block, today])
  const report = useMemo(() => (block ? blockReport(block, data.results, today) : null), [block, data.results, today])

  if (trainingPlanMode() === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!block || !report) return <EmptyState title={t('block.title')} body={t('block.none')} action={<Link to="/plan/waehlen" className="inline-flex min-h-11 items-center text-accent-text underline">{t('block.toPlan')}</Link>} />

  const week = blockWeek(block, today)
  const testName = (slug: string) => pick(getTest(slug)?.name, locale) ?? slug
  const d = (x: string) => formatDate(`${x}T12:00:00Z`, locale)
  const discipline = disciplineById(block.disciplineId ?? '')
  const open = openSessionsOn(block, today)
  const next = report.finished ? nextBlockSuggestion(block, report) : null

  const apply = (s: StoredPlannedSession, change: { day?: number; removed?: boolean }) => {
    const res = overrideSession(block, s.id, change, reason, new Date().toISOString())
    if (!res.ok) {
      setError(res.error)
      return
    }
    saveTrainingBlock(res.block)
    setEditing(null)
    setReason('')
    setError(null)
  }

  const verdictText = (m: (typeof report.metrics)[number]): string => {
    if (m.status === 'open' || !m.report) return report.finished ? t('block.report.missing') : t('block.report.open')
    const r = m.report
    const pct = formatNumber(Math.abs(r.changePercent ?? 0), locale, 1)
    if (r.verdict === 'better') return t('block.report.better', { percent: pct, detectable: formatNumber(r.detectablePercent ?? 0, locale, 1) })
    if (r.verdict === 'worse') return t('block.report.worse', { percent: pct, detectable: formatNumber(r.detectablePercent ?? 0, locale, 1) })
    if (r.verdict === 'within_noise') return t('block.report.noise', { percent: pct, detectable: formatNumber(r.detectablePercent ?? 0, locale, 1) })
    return t('block.report.unknown')
  }

  return (
    <div data-testid="plan-block">
      <ScreenHeader
        eyebrow={t('block.eyebrow')}
        title={t('block.title')}
        intro={t('block.range', { discipline: pick(discipline?.name, locale) ?? '', from: d(block.startDay), to: d(blockEndDay(block)) })}
      />

      <p className="mb-3">
        <Link to="/plan/kalender" data-testid="block-to-calendar" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
          {t('cal.link')}
        </Link>
      </p>

      <Panel className="mb-4" data-testid="block-week">
        {readOnly && <p className="px-4 pt-3 text-[12px] text-ink-secondary" data-testid="block-closed">{t('block.closedNote')}</p>}
        <PanelHeader title={typeof week === 'number' ? t('block.week', { week, weeks: block.weeks }) : week === 'before' ? t('block.before', { day: d(block.startDay) }) : t('block.after')} />
        <ul className="px-4 pb-3 text-[14px]">
          {checks.length === 0 && <li className="text-ink-secondary">{t('block.noWeeks')}</li>}
          {checks.map((c) => (
            <li key={c.week} className="flex justify-between border-t border-line py-2 first:border-t-0" data-testid={`block-check-${c.week}`}>
              <span>{t('block.checkWeek', { week: c.week })}</span>
              <span className="readout">{t('block.checkCount', { done: c.done, planned: c.planned })}</span>
            </li>
          ))}
        </ul>
        {!readOnly && open.length > 0 && (
          <p className="border-t border-line px-4 py-3">
            <Link to="/plan/heute" data-testid="block-to-player" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">
              {t('block.startPlayer', { count: open.length })}
            </Link>
          </p>
        )}
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('block.checkNote')}</p>
      </Panel>

      <Panel className="mb-4" data-testid="block-sessions">
        <PanelHeader title={t('block.sessions')} />
        <ul>
          {[...block.sessions].sort((a, b) => a.day - b.day).map((s) => (
            <li key={s.id} className={cn('border-t border-line px-4 py-3 first:border-t-0', s.removed && 'opacity-60')} data-testid={`block-session-${s.id}`}>
              <p className="font-display text-[15px] font-bold">
                {t(`plan.day.${s.day}`)} · {t(`plan.intent.${s.primaryIntent}`)}
                {s.removed && <span className="ml-2 text-[12px] font-normal text-ink-muted">{t('block.removed')}</span>}
              </p>
              <p className="text-[12px] text-ink-secondary">{s.ruleId ? t(`plan.rules.${s.ruleId}.title`) : t('plan.openSession')}</p>
              {s.blocks.map((b, i) => (
                <p key={i} className="mt-1 text-[14px]">{blockText(b, t)}</p>
              ))}
              {s.coachModified && (
                <p className="mt-1 text-[12px] text-accent-text" data-testid={`block-reason-${s.id}`}>
                  {t('block.coachChanged', { reason: s.coachModificationReason ?? '' })}
                </p>
              )}
              {editing === s.id ? (
                <div className="mt-2 space-y-2" data-testid="block-edit">
                  <label className="block text-[13px]">
                    <span className="label-tag">{t('block.newDay')}</span>
                    <select value={day} onChange={(e) => setDay(Number(e.target.value))} data-testid="block-edit-day" className="mt-1.5 block min-h-11 rounded-md border border-line bg-surface px-3 text-[16px]">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>{t(`plan.day.${n}`)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[13px]">
                    <span className="label-tag">{t('block.reason')}</span>
                    <input type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="block-edit-reason" className="mt-1.5 min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
                  </label>
                  {error && <p className="text-[12px] text-red-600" data-testid="block-edit-error">{t(`block.error.${error}`)}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" data-testid="block-edit-move" onClick={() => apply(s, { day })} className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{t('block.move')}</button>
                    <button type="button" data-testid="block-edit-remove" onClick={() => apply(s, { removed: !s.removed })} className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{s.removed ? t('block.restore') : t('block.remove')}</button>
                    <button type="button" onClick={() => { setEditing(null); setError(null) }} className="min-h-11 px-3 text-[13px] text-ink-secondary">{t('block.cancel')}</button>
                  </div>
                </div>
              ) : readOnly ? null : (
                <button type="button" data-testid={`block-edit-open-${s.id}`} onClick={() => { setEditing(s.id); setDay(s.day); setReason(''); setError(null) }} className="mt-1 min-h-11 text-[13px] text-accent-text underline underline-offset-2">
                  {t('block.edit')}
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('block.overrideNote')}</p>
      </Panel>

      {next && (
        <Panel className="mb-4" data-testid="block-next">
          <PanelHeader title={t('block.next.title')} />
          <div className="space-y-2 px-4 pb-4 text-[14px]">
            <p>{t('block.next.phase', { phase: t(`plan.phase.${next.phase}`) })}</p>
            {next.unproven.length > 0 && <p data-testid="block-next-unproven">{t('block.next.unproven', { tests: next.unproven.map(testName).join(', ') })}</p>}
            {next.missing.length > 0 && <p data-testid="block-next-missing">{t('block.next.missing', { tests: next.missing.map(testName).join(', ') })}</p>}
            <p className="text-[12px] text-ink-secondary">{t('block.next.note')}</p>
            <Link to={`/plan/neu?phase=${next.phase}`} data-testid="block-next-plan" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">
              {t('block.next.button')}
            </Link>
          </div>
        </Panel>
      )}

      <Panel data-testid="block-report">
        <PanelHeader title={t('block.report.title')} subtitle={t('block.report.count', { done: report.done, planned: report.planned })} />
        <ul className="px-4 pb-3 text-[14px]">
          {report.metrics.length === 0 && <li className="text-ink-secondary">{t('block.report.noMetrics')}</li>}
          {report.metrics.map((m) => (
            <li key={m.metric} className="border-t border-line py-2 first:border-t-0" data-testid={`block-metric-${m.metric}`}>
              <p className="font-medium">{testName(m.metric)}</p>
              <p className="text-ink-secondary">{verdictText(m)}</p>
            </li>
          ))}
        </ul>
        {!readOnly && (
        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            data-testid="block-close"
            onClick={() => saveTrainingBlock({ ...block, status: 'closed' })}
            className="min-h-11 rounded-pill border border-line px-4 text-[13px] hover:bg-surface-sunken"
          >
            {t('block.close')}
          </button>
        </div>
        )}
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('block.report.note')}</p>
      </Panel>
    </div>
  )
}
