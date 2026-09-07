import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, Circle, CircleDot, Minus } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { getTest } from '@/data/testCatalog'
import { projectableTests, type FormProjection } from '@/domain/formProjection'
import { seasonPlan, type Checkpoint } from '@/domain/seasonPlan'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AthleteData } from '@/lib/store/localStore'
import { pick } from '@/i18n/pick'

/**
 * Der Wettkampf als Rahmen: drei Kontrollpunkte rückwärts vom Tag, und die
 * Hochrechnung der eigenen Messungen auf den Tag.
 *
 * Ohne eingetragenen Wettkampf steht hier nur der Weg zum Profil — die App
 * erfindet keinen Termin, um etwas anzeigen zu können.
 */
export function CompetitionPanel({
  data,
  className,
  style,
}: {
  data: AthleteData
  className?: string
  style?: React.CSSProperties
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const competition = data.profile.competition

  const plan = useMemo(
    () => (competition ? seasonPlan(competition.on, data.profile.disciplineId, data.results) : null),
    [competition, data.profile.disciplineId, data.results],
  )
  const projections = useMemo(
    () => (competition ? projectableTests(data.results, competition.on, data.profile.testGoals).slice(0, 3) : []),
    [competition, data.results, data.profile.testGoals],
  )

  if (!competition || !plan) {
    return (
      <Panel className={className} style={style} data-testid="competition-panel">
        <PanelHeader title={t('competition.title')} />
        <div className="px-4 py-3">
          <p className="text-[13px] leading-relaxed text-ink-secondary">{t('competition.noneBody')}</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/profil">
              {t('competition.setInProfile')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </Button>
        </div>
      </Panel>
    )
  }

  return (
    <Panel ticked className={className} style={style} data-testid="competition-panel">
      <PanelHeader
        title={competition.name || t('competition.title')}
        subtitle={
          plan.daysToGo < 0
            ? `${formatDate(competition.on, locale)} · ${t('competition.past')}`
            : `${formatDate(competition.on, locale)} · ${t('competition.daysToGo', { count: plan.daysToGo })}`
        }
      />

      <ol className="divide-y divide-line">
        {plan.checkpoints.map((checkpoint) => (
          <CheckpointRow key={checkpoint.kind} checkpoint={checkpoint} isNext={plan.next?.kind === checkpoint.kind} />
        ))}
      </ol>

      <div className="border-t border-line px-4 py-3">
        <span className="label-tag">{t('competition.projection')}</span>
        {projections.length === 0 ? (
          <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{t('competition.noProjection')}</p>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {projections.map((p) => (
              <ProjectionRow key={p.testSlug} projection={p} />
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{t('competition.assumption')}</p>
      </div>
    </Panel>
  )
}

function CheckpointRow({ checkpoint, isNext }: { checkpoint: Checkpoint; isNext: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const Icon =
    checkpoint.status === 'done' ? Check : checkpoint.status === 'missed' ? Minus : isNext ? CircleDot : Circle
  return (
    <li className={cn('flex items-start gap-3 px-4 py-2.5', isNext && 'bg-accent-quiet')} data-status={checkpoint.status}>
      <Icon
        size={16}
        className={cn(
          'mt-0.5 shrink-0',
          checkpoint.status === 'done' && 'text-good',
          checkpoint.status === 'missed' && 'text-ink-muted',
          checkpoint.status === 'due' && 'text-accent-text',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[14px]">
          <span className="font-medium">{t(`competition.kind.${checkpoint.kind}`)}</span>
          <span className="readout text-[12px] tabular-nums text-ink-muted">{formatDate(checkpoint.on, locale)}</span>
          <span className="text-[11px] text-ink-muted">
            {t('competition.weeksBefore', { count: checkpoint.weeksBefore })} · {t(`competition.status.${checkpoint.status}`)}
          </span>
        </p>
        {/* Als Chips, nicht als Fliesstextlinks: eine Tippfläche braucht
            44 px, und ein Testname hat sie nicht. */}
        <p className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-ink-secondary">
          {checkpoint.slugs.map((slug) => {
            const test = getTest(slug)
            if (!test) return null
            return (
              <Link
                key={slug}
                to={`/tests/${slug}`}
                className="inline-flex min-h-11 min-w-11 items-center rounded-[var(--radius-sm)] border border-line px-2.5 hover:border-accent hover:bg-accent-quiet"
              >
                {pick(test.shortName, locale)}
              </Link>
            )
          })}
        </p>
      </div>
    </li>
  )
}

function ProjectionRow({ projection }: { projection: FormProjection }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const test = getTest(projection.testSlug)
  if (!test || projection.projected == null) return null
  const unit = test.primaryUnit
  return (
    <li className="text-[13px]" data-testid="projection-row">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{pick(test.shortName, locale)}</span>
        <span className="readout shrink-0 tabular-nums">
          {formatNumber(projection.projected, locale, 1)} {unit}
          {projection.band && (
            <span className="text-ink-muted">
              {' '}
              ({formatNumber(projection.band[0], locale, 1)}–{formatNumber(projection.band[1], locale, 1)})
            </span>
          )}
        </span>
      </div>
      <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-ink-muted">
        <span>
          {t('competition.latest')}{' '}
          <span className="readout tabular-nums">{formatNumber(projection.latest, locale, 1)} {unit}</span>
        </span>
        <span>{t('competition.points', { count: projection.points, days: projection.spanDays })}</span>
        {projection.goalOutlook && (
          <span
            className={cn(
              projection.goalOutlook === 'reaches' && 'text-good',
              projection.goalOutlook === 'misses' && 'text-critical',
            )}
          >
            {t(`competition.goalOutlook.${projection.goalOutlook}`, { goal: formatNumber(projection.goal, locale, 1) })}
          </span>
        )}
      </p>
    </li>
  )
}
