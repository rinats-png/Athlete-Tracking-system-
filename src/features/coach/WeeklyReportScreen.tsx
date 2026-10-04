import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/features/shared/useLocale'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { RECIPIENTS, weeklyReport, type Recipient } from '@/domain/weeklyReport'
import type { Fact } from '@/domain/askKydon'
import { getTest } from '@/data/testCatalog'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Wochenbericht für Athlet, Eltern oder Verband. Der Trainer wählt, prüft
 * und ergänzt; der Bericht ist erst «geprüft», wenn er es bestätigt, und
 * KYDON verschickt nichts — kopiert oder gedruckt wird von hier.
 */
export function WeeklyReportScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { athletes } = useAppData()
  const active = athletes.filter((a) => !a.archived)
  const [id, setId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Recipient>('athlete')
  const [note, setNote] = useState('')
  const [checked, setChecked] = useState(false)
  const [copied, setCopied] = useState(false)
  const athlete = active.find((a) => a.id === id) ?? active[0] ?? null

  const report = useMemo(
    () => (athlete ? weeklyReport({ athlete: { profile: athlete.profile, results: athlete.results, workouts: athlete.workouts, diary: athlete.diary }, trainingBlocks: athlete.trainingBlocks, reminders: reminderSettingsOf(athlete.profile) }, recipient) : null),
    [athlete, recipient],
  )
  if (!athlete || !report) return <EmptyState title={t('coachDash.emptyTitle')} body={t('coachDash.emptyBody')} />

  const d = (day: string) => formatDate(`${day}T12:00:00Z`, locale)
  const name = (slug: unknown) => pick(getTest(String(slug))?.name, locale) ?? String(slug)
  const num = (v: unknown, digits = 1) => formatNumber(Number(v), locale, digits)
  const who = athlete.name || athlete.profile.firstName || t('coach.unnamed')

  const line = (f: Fact): string | null => {
    const p = f.params
    switch (f.key) {
      case 'form':
        return t('brief.form.text', { level: t(`performance.level.${String(p.level)}`) })
      case 'finding':
        return t('brief.finding.text', { name: name(p.slug), percent: num(p.percent), detectable: num(p.detectable) })
      case 'noFinding':
        return t('brief.finding.none')
      case 'load':
        return t('brief.load.compare', { week: num(p.week, 0), mean: num(p.mean, 0) })
      case 'loadNoBaseline':
        return t('brief.load.noBaseline', { week: num(p.week, 0) })
      case 'checkins':
        return t('brief.checkins', { count: Number(p.days) })
      case 'plan': {
        const parts: string[] = []
        if (Number(p.sessionsTarget) >= 0) parts.push(t('brief.plan.sessions', { actual: Number(p.sessions), target: Number(p.sessionsTarget) }))
        if (Number(p.loadTarget) >= 0) parts.push(t('brief.plan.load', { actual: num(p.load, 0), target: num(p.loadTarget, 0) }))
        return parts.join(' ')
      }
      case 'countdown':
        return t(p.name ? 'brief.plan.countdownNamed' : 'brief.plan.countdown', { days: Number(p.days), name: String(p.name) })
      case 'block':
        return t('weeklyReport.block', { week: Number(p.week), weeks: Number(p.weeks), done: Number(p.done), planned: Number(p.planned) })
      case 'nextOverdue':
        return t('brief.next.overdue', { name: name(p.slug), days: Number(p.days) })
      case 'nextMissing':
        return t('brief.next.missing', { name: name(p.slug) })
      case 'nextNone':
        return t('brief.next.none')
      default:
        return null
    }
  }
  const lines = report.facts.map(line).filter((x): x is string => !!x)
  const text = [`${t('weeklyReport.heading', { name: who })} (${d(report.from)} – ${d(report.to)})`, ...lines, ...(note.trim() ? [note.trim()] : []), t('weeklyReport.note')].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Ohne Zwischenablage: Drucken bleibt.
    }
  }

  return (
    <div data-testid="weekly-report">
      <ScreenHeader eyebrow={t('weeklyReport.eyebrow')} title={t('weeklyReport.title')} intro={t('weeklyReport.intro')} />
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-[13px]">
          <span className="label-tag">{t('weeklyReport.athlete')}</span>
          <select data-testid="report-athlete" value={athlete.id} onChange={(e) => { setId(e.target.value); setChecked(false); setCopied(false) }} className="mt-1.5 block min-h-11 rounded-md border border-line bg-surface px-3 text-[16px]">
            {active.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.profile.firstName || t('coach.unnamed')}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label={t('weeklyReport.recipient')} className="flex flex-wrap gap-2">
          {RECIPIENTS.map((r) => (
            <button
              key={r}
              type="button"
              data-testid={`report-to-${r}`}
              aria-pressed={recipient === r}
              onClick={() => { setRecipient(r); setChecked(false); setCopied(false) }}
              className={cn('min-h-11 rounded-pill border px-4 text-[13px]', recipient === r ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line hover:bg-surface-sunken')}
            >
              {t(`weeklyReport.to.${r}`)}
            </button>
          ))}
        </div>
      </div>

      <Panel data-testid="report-body">
        <PanelHeader title={t('weeklyReport.heading', { name: who })} subtitle={`${d(report.from)} – ${d(report.to)}`} />
        <ul className="space-y-2 px-4 pb-3 text-[14px] leading-relaxed">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
          {note.trim() && <li data-testid="report-note-text">{note.trim()}</li>}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t(`weeklyReport.scope.${recipient}`)}</p>
      </Panel>

      <div className="mt-4 space-y-3 print:hidden">
        <label className="block text-[13px]">
          <span className="label-tag">{t('weeklyReport.noteLabel')}</span>
          <textarea data-testid="report-note" value={note} maxLength={400} rows={3} onChange={(e) => { setNote(e.target.value); setChecked(false) }} className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-[16px]" />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-[14px]">
          <input type="checkbox" data-testid="report-checked" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="size-5" />
          {t('weeklyReport.checked')}
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="report-copy" disabled={!checked} onClick={() => void copy()} className="min-h-11 rounded-pill border border-line px-4 text-[13px] enabled:hover:bg-surface-sunken disabled:opacity-45">
            {copied ? t('coachToday.copilot.copied') : t('coachToday.copilot.copy')}
          </button>
          <button type="button" data-testid="report-print" disabled={!checked} onClick={() => window.print()} className="min-h-11 rounded-pill border border-line px-4 text-[13px] enabled:hover:bg-surface-sunken disabled:opacity-45">
            {t('weeklyReport.print')}
          </button>
        </div>
        {!checked && <p className="text-[11px] text-ink-muted">{t('weeklyReport.needsCheck')}</p>}
      </div>
    </div>
  )
}
