import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Minus, TriangleAlert } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppData } from '@/lib/store/AppDataProvider'
import { athleteRows, coachSummary, type AthleteRow } from '@/domain/coach'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/types/domain'

/**
 * Übersicht für Trainer (§37, §38).
 *
 * Ein Trainer mit zwölf Kunden liest keine zwölf Profile durch. Er braucht
 * eine Zeile je Person und einen nachvollziehbaren Grund, warum jemand
 * Aufmerksamkeit braucht — kein Ampelgefühl. Deshalb steht neben jeder
 * Markierung, woran es liegt: überfälliger Termin, fallender Trend, zu
 * dünne Datenlage.
 *
 * Sortiert wird nach Aufmerksamkeitsbedarf, nicht alphabetisch: die Liste
 * soll die Arbeit vorgeben, nicht das Alphabet.
 */
export function CoachDashboard({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const { athletes, activeAthleteId, switchAthlete } = useAppData()
  const [onlyAttention, setOnlyAttention] = useState(false)

  const rows = useMemo(() => {
    const all = athleteRows(athletes)
    return [...all].sort((a, b) => {
      if (b.attention.length !== a.attention.length) return b.attention.length - a.attention.length
      return a.name.localeCompare(b.name)
    })
  }, [athletes])

  const summary = useMemo(() => coachSummary(athletes), [athletes])
  const visible = onlyAttention ? rows.filter((r) => r.attention.length > 0) : rows

  if (rows.length === 0) {
    return <EmptyState title={t('coachDash.emptyTitle')} body={t('coachDash.emptyBody')} />
  }

  return (
    <>
      <div className="mb-4 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('coachDash.athletes')} value={summary.athletes} />
        <Stat label={t('coachDash.thisMonth')} value={summary.assessmentsThisMonth} />
        <Stat
          label={t('coachDash.needsAttention')}
          value={summary.needsAttention}
          tone={summary.needsAttention > 0 ? 'warn' : 'neutral'}
        />
        <Stat label={t('coachDash.improving')} value={summary.improving} tone="good" />
      </div>

      <Panel>
        <PanelHeader
          title={t('coachDash.roster')}
          subtitle={t('coachDash.sortedBy')}
          action={
            <Button
              variant={onlyAttention ? 'primary' : 'ghost'}
              size="sm"
              aria-pressed={onlyAttention}
              onClick={() => setOnlyAttention((v) => !v)}
            >
              {t('coachDash.filterAttention')}
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                <th scope="col" className="px-4 py-2 font-medium">{t('coachDash.name')}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t('dashboard.overall')}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t('analysis.trend')}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t('dashboard.primaryLimiter')}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t('coachDash.lastAssessment')}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t('coachDash.attention')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  locale={locale}
                  active={row.id === activeAthleteId}
                  onSelect={() => switchAthlete(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <p className="px-4 py-6 text-[14px] text-ink-secondary">{t('coachDash.noneFlagged')}</p>
        )}
      </Panel>

      <p className="mt-4 max-w-[70ch] text-[12px] leading-relaxed text-ink-muted">
        {t('coachDash.method')}
      </p>
    </>
  )
}

function Row({
  row,
  locale,
  active,
  onSelect,
}: {
  row: AthleteRow
  locale: AppLocale
  active: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const TrendIcon =
    row.trend === 'improving' ? ArrowUp : row.trend === 'declining' ? ArrowDown : Minus

  return (
    <tr className={cn('border-b border-line last:border-b-0', active && 'bg-accent/8')}>
      <th scope="row" className="px-4 py-2.5 text-left font-normal">
        <button
          type="button"
          onClick={onSelect}
          className="min-h-11 text-left underline-offset-2 hover:underline"
        >
          {row.name || t('coach.unnamed')}
        </button>
        <span className="block text-[11px] text-ink-muted">
          {t('coachDash.results', { count: row.resultCount })}
        </span>
      </th>
      <td className="px-4 py-2.5">
        <span className="readout tabular-nums">
          {row.overall == null ? '—' : Math.round(row.overall)}
        </span>
        <span className="block text-[11px] text-ink-muted">
          {t('dashboard.overallNote', { confidence: row.confidence })}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {/* Richtung über Symbol UND Text — nie über Farbe allein. */}
        <span
          className={cn(
            'inline-flex items-center gap-1',
            row.trend === 'improving' && 'text-accent-text',
            row.trend === 'declining' && 'text-critical',
          )}
        >
          <TrendIcon size={13} strokeWidth={2.4} aria-hidden />
          {row.trend === 'insufficient'
            ? t('coachDash.tooFew')
            : t(`analysis.trendLabel.${row.trend}`)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {row.primaryLimiter ? t(`dimensions.${row.primaryLimiter}`) : '—'}
      </td>
      <td className="px-4 py-2.5 tabular-nums">
        {row.lastAssessmentOn ? formatDate(row.lastAssessmentOn, locale) : '—'}
      </td>
      <td className="px-4 py-2.5">
        {row.attention.length === 0 ? (
          <span className="text-[12px] text-ink-muted">—</span>
        ) : (
          <ul className="space-y-0.5">
            {row.attention.map((reason) => (
              <li key={reason} className="flex items-start gap-1.5 text-[12px] text-warning">
                <TriangleAlert size={12} className="mt-0.5 shrink-0" aria-hidden />
                {t(`coachDash.reason.${reason}`)}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  )
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'good' | 'warn'
}) {
  return (
    <div className="bg-plane px-4 py-3">
      <span className="label-tag">{label}</span>
      <p
        className={cn(
          'readout mt-1 font-display text-[26px] leading-none font-bold tabular-nums',
          tone === 'good' && 'text-accent-text',
          tone === 'warn' && value > 0 && 'text-warning',
        )}
      >
        {value}
      </p>
    </div>
  )
}
