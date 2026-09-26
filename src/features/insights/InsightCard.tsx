import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { getTest } from '@/data/testCatalog'
import { exerciseByKey } from '@/data/exercises'
import { axisLabel } from '@/data/profileAxes'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'
import type { Insight, InsightAction } from '@/domain/insightEngine'

/**
 * Ein Hinweis der Insight Engine.
 *
 * Aufbau, immer gleich: Titel · Satz mit den Zahlen · «Warum jetzt» ·
 * Belastbarkeit · aufklappbare Belege · Handlungen. Die Handlungen sind
 * «Erledigt» (ruht die Sperrfrist lang in «Erledigt») und «Ausblenden»
 * (erscheint während der Sperrfrist nicht). Es gibt keinen Knopf, der
 * etwas im Training ändert — ein Hinweis ist ein Anlass, keine Anweisung.
 */
export function InsightCard({
  insight,
  onAction,
  compact = false,
}: {
  insight: Insight
  onAction?: (action: InsightAction) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [open, setOpen] = useState(false)

  const subject = subjectLabel(insight, t, locale)
  const values = Object.fromEntries(
    Object.entries(insight.values).map(([k, v]) => [k, typeof v === 'number' ? formatNumber(v, locale, Number.isInteger(v) ? 0 : 1) : v]),
  )
  if (insight.ruleId === 'decision_review_due' && typeof insight.values.reviewOn === 'string' && insight.values.reviewOn) {
    values.reviewOn = formatDate(`${insight.values.reviewOn}T12:00:00Z`, locale)
  }
  const tone =
    insight.severity === 'review' ? 'border-l-warning' : insight.severity === 'warning' ? 'border-l-critical' : insight.severity === 'notice' ? 'border-l-accent' : 'border-l-line-strong'

  return (
    <li className={cn('border-l-2 px-4 py-3', tone)} data-testid="insight" data-rule={insight.ruleId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-medium">
          {t(`hints.rule.${insight.ruleId}.title`, { ...values, subject })}
          {insight.state === 'new' && <span className="ml-2 align-middle text-[10px] uppercase tracking-[0.14em] text-accent-text">{t('hints.new')}</span>}
        </p>
        <span className="label-tag">{t(`hints.severity.${insight.severity}`)}</span>
      </div>
      <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">{t(`hints.rule.${insight.ruleId}.body`, { ...values, subject })}</p>
      {!compact && (
        <>
          <p className="mt-1 text-[12px] text-ink-muted">
            <span className="font-medium">{t('hints.whyNow')}</span> {t(`hints.why.${insight.whyNow}`, values)}
            {insight.confidenceLabel && ` · ${t(`metric.confidence.${insight.confidenceLabel}`)}`}
          </p>
          {insight.evidence.length > 0 && (
            <div className="mt-1">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1 text-[12px] text-ink-secondary underline-offset-2 hover:underline"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
              >
                <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
                {t('hints.evidence', { count: insight.evidence.length })}
              </button>
              {open && (
                <ul className="mb-1 ml-5 list-disc text-[12px] text-ink-muted">
                  {insight.evidence.map((e, i) => (
                    <li key={`${e.kind}-${e.id ?? e.key ?? i}`}>
                      {evidenceLabel(e, t, locale)}
                      {e.value != null && ` · ${formatNumber(e.value, locale, Number.isInteger(e.value) ? 0 : 1)}`}
                      {e.day && ` · ${formatDate(`${e.day}T12:00:00Z`, locale)}`}
                    </li>
                  ))}
                  <li>{t('hints.rule.version', { rule: insight.ruleId, version: insight.ruleVersion })}</li>
                </ul>
              )}
            </div>
          )}
        </>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {insight.link && (
          <Button asChild variant="outline" size="sm">
            <Link to={linkTarget(insight)}>
              {t(`hints.go.${insight.link.kind}`)}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </Button>
        )}
        {onAction && insight.state !== 'acknowledged' && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onAction('acknowledge')}>
              <Check size={13} aria-hidden />
              {t('hints.acknowledge')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onAction('dismiss')}>
              <X size={13} aria-hidden />
              {t('hints.dismiss')}
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

function linkTarget(insight: Insight): string {
  if (!insight.link) return '/'
  if (insight.link.kind === 'test') return `/tests/${insight.link.target}`
  if (insight.link.kind === 'decision') return '/cockpit'
  return insight.link.target
}

type T = (key: string, options?: Record<string, unknown>) => string

function subjectLabel(insight: Insight, t: T, locale: ReturnType<typeof useLocale>): string {
  const test = getTest(insight.subject)
  if (test) return pick(test.name, locale)
  if (['measure_missing_axis', 'deepen_axis', 'benchmark_gap'].includes(insight.ruleId)) {
    return axisLabel(insight.subject, (k) => t(k), locale)
  }
  if (insight.ruleId === 'strength_plateau') {
    const ex = exerciseByKey(insight.subject)
    return ex ? pick(ex.name, locale) : insight.subject
  }
  return insight.subject
}

function evidenceLabel(e: Insight['evidence'][number], t: T, locale: ReturnType<typeof useLocale>): string {
  if (e.kind === 'result' && e.key) return pick(getTest(e.key)?.name, locale) ?? e.key
  if (e.kind === 'decision') return t('hints.evidenceKind.decision')
  if (e.key) {
    const test = getTest(e.key)
    if (test) return pick(test.name, locale)
    return t(`hints.metricKey.${e.key.split(':')[0]}`, { defaultValue: e.key })
  }
  return t(`hints.evidenceKind.${e.kind}`)
}
