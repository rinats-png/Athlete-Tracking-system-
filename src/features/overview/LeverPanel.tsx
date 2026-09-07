import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { axisLabel, axisById } from '@/data/profileAxes'
import {
  OPEN_AXIS_MAX_SCORE,
  OPEN_AXIS_MIN_REQUIREMENT,
  type RequirementGap,
  type RequirementRow,
} from '@/domain/requirementGap'
import { useLocale } from '@/features/shared/useLocale'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pick } from '@/i18n/pick'

/**
 * Die Anforderungslücke als Fläche.
 *
 * Zwei Zeilen je Achse: die Anforderung der Disziplin als Marke auf einer
 * Skala, das eigene Perzentil als Balken darunter. Der Abstand zwischen
 * beiden IST die Aussage — kein Wort erklärt sie besser als die Lücke selbst.
 *
 * `compact` zeigt die drei grössten Hebel (Übersicht); ohne zeigt die Fläche
 * die ganze Rangfolge samt dem, was nicht einzureihen ist (Analyse).
 */
export function LeverPanel({
  gap,
  compact = false,
  className,
  style,
}: {
  gap: RequirementGap
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const rows = compact ? gap.ranked.slice(0, 3) : gap.ranked

  return (
    <Panel ticked className={className} style={style} data-testid="lever-panel">
      <PanelHeader title={t('lever.title')} subtitle={compact ? undefined : t('lever.intro')} />
      {gap.disciplineId == null ? (
        <p className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">{t('lever.noDiscipline')}</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">{t('lever.tooFew')}</p>
      ) : (
        <ol className="divide-y divide-line">
          {rows.map((row, i) => (
            <LeverRow key={row.axisId} row={row} rank={i + 1} />
          ))}
        </ol>
      )}

      {!compact && gap.unmeasured.length > 0 && (
        <p className="border-t border-line px-4 py-2.5 text-[12px] leading-relaxed text-ink-muted">
          {t('lever.unmeasured')}{' '}
          {gap.unmeasured.map((r) => axisLabel(r.axisId, t, locale)).join(', ')}
        </p>
      )}
      {!compact && gap.unweighted.length > 0 && (
        <p className="border-t border-line px-4 py-2.5 text-[12px] leading-relaxed text-ink-muted">
          {t('lever.unweighted')}{' '}
          {gap.unweighted
            .map((r) => `${axisLabel(r.axisId, t, locale)} ${formatNumber(r.score, locale, 0)}`)
            .join(', ')}
        </p>
      )}

      <div className="border-t border-line px-4 py-3">
        <p className="text-[12px] leading-relaxed text-ink-secondary">{t('lever.where')}</p>
        {compact ? (
          <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2">
            <Link to="/analyse">
              {t('lever.all')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </Button>
        ) : (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            {t('lever.method', { req: formatNumber(OPEN_AXIS_MIN_REQUIREMENT, locale, 1), score: OPEN_AXIS_MAX_SCORE })}
          </p>
        )}
      </div>
    </Panel>
  )
}

function LeverRow({ row, rank }: { row: RequirementRow; rank: number }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const requirementPercent = Math.round((row.requirement ?? 0) * 100)
  const score = Math.round(row.score ?? 0)
  const meaning = pick(axisById(row.axisId)?.meaning, locale)

  return (
    <li className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="readout text-[12px] text-ink-muted">[{String(rank).padStart(2, '0')}]</span>
          <span className="truncate text-[14px] font-medium">{axisLabel(row.axisId, t, locale)}</span>
          {row.open && (
            <span className="label-tag shrink-0 text-warning" data-testid="lever-open">
              {t('lever.open')}
            </span>
          )}
        </span>
        <span className="readout shrink-0 text-[13px] tabular-nums text-ink-secondary">
          {t('lever.leverValue', { value: formatNumber(row.leverage, locale, 0) })}
        </span>
      </div>

      {/* Die Skala: Anforderung als Marke, eigenes Perzentil als Balken. */}
      <div className="relative mt-2 h-2 rounded-[var(--radius-sm)] bg-surface-sunken" aria-hidden>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-[var(--radius-sm)]', row.open ? 'bg-warning' : 'bg-accent')}
          style={{ width: `${score}%` }}
        />
        <div
          className="absolute top-[-3px] h-[14px] w-[2px] bg-ink"
          style={{ left: `calc(${requirementPercent}% - 1px)` }}
        />
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-ink-muted">
        <span>
          {t('lever.requirement')}{' '}
          <span className="readout tabular-nums text-ink-secondary">{formatNumber(row.requirement, locale, 1)}</span>
        </span>
        <span>
          {t('lever.yours')}{' '}
          <span className="readout tabular-nums text-ink-secondary">P{score}</span>
        </span>
        <span>{t('lever.evidence', { count: row.measurements })}</span>
      </p>
      {meaning && <p className="mt-1 text-[11px] leading-snug text-ink-muted">{meaning}</p>}
    </li>
  )
}
