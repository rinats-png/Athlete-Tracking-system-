import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { axisLabel } from '@/data/profileAxes'
import { disciplineById } from '@/data/sportProfiles'
import { groupHeatmap, PATTERN_MIN_ATHLETES, type HeatmapGroup } from '@/domain/groupHeatmap'
import { OPEN_AXIS_MAX_SCORE, OPEN_AXIS_MIN_REQUIREMENT } from '@/domain/requirementGap'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pick } from '@/i18n/pick'

/**
 * Gruppen-Heatmap.
 *
 * Zeilen sind Athleten, Spalten die Achsen ihrer Disziplin, jede Zelle das
 * Perzentil. Der Spaltenfuss sagt, wie viele von wie vielen unter der
 * Anforderung liegen — und wo das die halbe Gruppe ist, steht es oben als
 * Muster. Farbe trägt hier nie allein: die Zahl steht in jeder Zelle, und
 * eine offene Zelle trägt zusätzlich eine Marke.
 */
export function GroupHeatmapScreen() {
  const { t } = useTranslation()
  const { athletes, role } = useAppData()
  const groups = useMemo(() => groupHeatmap(athletes), [athletes])
  const measured = groups.reduce((n, g) => n + g.athletes.length, 0)

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/trainer">
          <ArrowLeft size={14} aria-hidden />
          {t('coachDash.title')}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('coachDash.title')} title={t('coachDash.heatmap.title')} intro={t('coachDash.heatmap.intro')} />

      {role !== 'coach' || measured < 2 ? (
        <EmptyState title={t('coachDash.heatmap.title')} body={t('coachDash.heatmap.empty')} />
      ) : (
        groups.map((group) => <GroupBlock key={group.disciplineId ?? 'general'} group={group} />)
      )}

      <p className="mt-4 max-w-[70ch] text-[12px] leading-relaxed text-ink-muted">
        {t('coachDash.heatmap.method', { req: OPEN_AXIS_MIN_REQUIREMENT, score: OPEN_AXIS_MAX_SCORE, min: PATTERN_MIN_ATHLETES })}
      </p>
    </>
  )
}

function GroupBlock({ group }: { group: HeatmapGroup }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const discipline = group.disciplineId ? disciplineById(group.disciplineId) : null
  const cell = (athleteId: string, axisId: string) =>
    group.cells.find((c) => c.athleteId === athleteId && c.axisId === axisId)

  return (
    <div className="mb-6" data-testid="heatmap-group">
      {group.patterns.length > 0 ? (
        <Panel ticked float className="mb-3">
          <PanelHeader title={t('coachDash.heatmap.pattern')} />
          <ul className="space-y-2 px-4 py-3">
            {group.patterns.map((column) => (
              <li key={column.axisId} className="text-[14px] leading-relaxed" data-testid="heatmap-pattern">
                {t('coachDash.heatmap.patternBody', {
                  open: column.openCount,
                  covered: column.covered,
                  axis: axisLabel(column.axisId, t, locale),
                })}
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <p className="mb-3 text-[13px] leading-relaxed text-ink-secondary">
          {t('coachDash.heatmap.noPattern', { min: PATTERN_MIN_ATHLETES })}
        </p>
      )}

      <Panel>
        <PanelHeader
          title={pick(discipline?.name, locale) ?? t('coachDash.heatmap.general')}
          subtitle={t('coachDash.heatmap.athletes', { count: group.athletes.length })}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                <th scope="col" className="px-3 py-2 font-medium">{t('coachDash.name')}</th>
                {group.columns.map((column) => (
                  <th key={column.axisId} scope="col" className="px-2 py-2 text-center font-medium">
                    <span className="block">{axisLabel(column.axisId, t, locale)}</span>
                    {column.requirement != null && (
                      <span className="readout block text-[11px] tabular-nums text-ink-muted">
                        {t('lever.requirement')} {formatNumber(column.requirement, locale, 1)}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.athletes.map((athlete) => (
                <tr key={athlete.id} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    {athlete.name || t('coach.unnamed')}
                  </th>
                  {group.columns.map((column) => {
                    const c = cell(athlete.id, column.axisId)
                    return (
                      <td key={column.axisId} className="px-2 py-1.5 text-center">
                        {c?.score == null ? (
                          <span className="text-[11px] text-ink-muted">{c?.measured ? t('coachDash.heatmap.noReference') : '—'}</span>
                        ) : (
                          <span
                            className={cn(
                              'readout inline-flex min-w-9 items-center justify-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 tabular-nums',
                              c.open ? 'bg-warning/15 text-warning' : 'bg-accent-quiet text-ink',
                            )}
                            data-open={c.open ? 'true' : 'false'}
                          >
                            {Math.round(c.score)}
                            {c.open && <span aria-label={t('coachDash.heatmap.open')}>▲</span>}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong text-ink-secondary">
                <th scope="row" className="px-3 py-2 text-left font-medium">{t('coachDash.heatmap.open')}</th>
                {group.columns.map((column) => (
                  <td
                    key={column.axisId}
                    className={cn('readout px-2 py-2 text-center text-[12px] tabular-nums', column.pattern && 'font-bold text-warning')}
                    data-testid="heatmap-foot"
                  >
                    {column.covered === 0 ? '—' : `${column.openCount} / ${column.covered}`}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  )
}
