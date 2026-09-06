import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Printer } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { groupAxisStats } from '@/domain/groupCompare'
import { athleteRows } from '@/domain/coach'
import { formatDate } from '@/lib/format'

/**
 * Die Gruppe als Verteilung (§37, §38).
 *
 * DER GRUND, WARUM ES DIESEN BILDSCHIRM GIBT: ein Trainer, der einem Verein
 * oder einem Elternabend berichtet, braucht ein Blatt über die Gruppe — nicht
 * zwölf Einzelberichte.
 *
 * Bewusst keine Rangliste: eine Gruppenauswertung, die den Letzten benennt,
 * wird gegen ihn verwendet. Wer wo steht, sagt der Vergleich, den ein Trainer
 * gezielt aufruft. Hier steht die Verteilung — und über jeder Zahl der
 * Nenner, denn ein Median über zwei von zwölf ist keine Aussage über die
 * Gruppe.
 */
export function GroupReportScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { role, athletes, data } = useAppData()

  const roster = useMemo(() => athletes.filter((a) => !a.archived), [athletes])
  const stats = useMemo(
    () => groupAxisStats(roster, data.profile.disciplineId ?? null),
    [roster, data.profile.disciplineId],
  )
  const rows = useMemo(() => athleteRows(roster), [roster])
  const withResults = rows.filter((r) => r.resultCount > 0).length

  if (role !== 'coach' || roster.length === 0) {
    return (
      <>
        <BackLink />
        <EmptyState title={t('compare.group.title')} body={t('coachDash.emptyBody')} />
      </>
    )
  }

  return (
    <>
      <div className="no-print">
        <BackLink />
      </div>
      <ScreenHeader
        eyebrow={t('coachDash.title')}
        title={t('compare.group.title')}
        intro={t('compare.group.intro')}
        action={
          <Button variant="primary" onClick={() => window.print()} className="no-print">
            <Printer size={14} aria-hidden />
            {t('compare.group.print')}
          </Button>
        }
      />

      <p className="mb-4 text-[12px] text-ink-muted">
        {t('compare.group.generated', { date: formatDate(new Date().toISOString(), locale) })} ·{' '}
        {t('compare.coverage', { covered: withResults, selected: roster.length })}
      </p>

      <Panel>
        <PanelHeader title={t('compare.axes')} subtitle={t('compare.group.medianHint')} />
        <div className="overflow-x-auto">
          <table className="report-table w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-tag px-3 py-2 font-semibold">{t('compare.axes')}</th>
                <th className="label-tag px-3 py-2 font-semibold">{t('compare.group.covered')}</th>
                <th className="label-tag px-3 py-2 font-semibold">{t('compare.group.median')}</th>
                <th className="label-tag px-3 py-2 font-semibold">{t('compare.group.range')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((axis) => (
                <tr key={axis.axisId} className="border-b border-line/60">
                  <td className="px-3 py-2">{axis.label?.[locale] ?? axis.axisId}</td>
                  <td className="px-3 py-2">
                    <span
                      className="coverage-bar mr-2 align-middle"
                      style={
                        {
                          '--coverage': `${Math.round((axis.covered / axis.selected) * 100)}%`,
                        } as React.CSSProperties
                      }
                      aria-hidden
                    />
                    <span className="readout text-[12px]">
                      {t('compare.coverage', { covered: axis.covered, selected: axis.selected })}
                    </span>
                  </td>
                  <td className="readout px-3 py-2">
                    {axis.median == null ? (
                      <span className="text-[12px] text-ink-muted">{t('compare.group.noData')}</span>
                    ) : (
                      axis.median
                    )}
                  </td>
                  <td className="readout px-3 py-2 text-ink-secondary">
                    {axis.min == null ? '—' : `${axis.min} – ${axis.max}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
      <Link to="/trainer">
        <ArrowLeft size={14} aria-hidden />
        {t('coachDash.title')}
      </Link>
    </Button>
  )
}
