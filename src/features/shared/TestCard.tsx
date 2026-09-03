import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RatingWord } from './RatingScale'
import { useLocale } from './useLocale'
import { describeTest } from '@/domain/testModel'
import { assessQuality } from '@/domain/dataQuality'
import { rateResult, type RatingContext } from '@/domain/rating'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { intervalFor, type ReminderSettings } from '@/domain/reminders'
import type { StoredResult } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

export type TestStatus = 'open' | 'measured' | 'overdue' | 'questionable'

/**
 * Die standardisierte Testkarte (Konzept §11).
 *
 * Immer dieselben Felder in derselben Reihenfolge: Name, Kategorie, ein
 * Satz, letzter Wert mit Datum, Einordnung, Datenqualität, Status,
 * Evidenz. Was fehlt, steht als «noch nicht getestet» da und nicht als
 * leere Stelle — eine Karte, auf der ein Feld fehlt, sieht aus wie ein
 * Fehler.
 */
export function TestCard({
  slug,
  results,
  context,
  reminders,
  reason,
  asOf = new Date(),
  className,
}: {
  slug: string
  results: StoredResult[]
  context: RatingContext
  reminders: ReminderSettings
  /** Eine Zeile Begründung — warum dieser Test hier steht. */
  reason?: string | null
  asOf?: Date
  className?: string
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const model = describeTest(slug)
  if (!model) return null
  const { test } = model

  const latest = results
    .filter((r) => r.testSlug === slug && r.score != null)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0]
  const rating = latest ? rateResult(latest, context) : null
  const quality = latest ? assessQuality(latest) : null
  const daysSince = latest
    ? Math.floor((asOf.getTime() - new Date(latest.performedAt).getTime()) / 86_400_000)
    : null
  const status: TestStatus = !latest
    ? 'open'
    : quality && quality.status !== 'valid'
      ? 'questionable'
      : daysSince != null && daysSince >= intervalFor(slug, reminders)
        ? 'overdue'
        : 'measured'

  return (
    <article className={cn('panel flex flex-col', className)}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <span className="label-tag">
            {t(`categories.${test.category}`)} · {t(`testCard.mode.${model.mode}`)}
          </span>
          <h3 className="mt-0.5 text-[16px] leading-tight font-semibold">
            <Link to={`/tests/${slug}/details`} className="hover:underline">
              {test.name[locale]}
            </Link>
          </h3>
        </div>
        <span
          className={cn(
            'label-tag shrink-0 border px-1.5 py-0.5',
            status === 'measured' && 'border-accent/50 text-accent-text',
            status === 'overdue' && 'border-warning text-warning',
            status === 'questionable' && 'border-warning text-warning',
            status === 'open' && 'border-line text-ink-muted',
          )}
        >
          {t(`testCard.status.${status}`)}
        </span>
      </div>

      <p className="mt-1.5 px-4 text-[12px] leading-relaxed text-ink-secondary">
        {reason ?? test.summary[locale]}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 text-[12px]">
        <dt className="text-ink-muted">{t('testCard.lastValue')}</dt>
        <dd className="text-right">
          {latest ? (
            <>
              <span className="readout text-[15px]">{formatResultValue(latest, locale)}</span>
              <span className="ml-1.5 text-ink-muted">{formatDate(latest.performedAt, locale)}</span>
            </>
          ) : (
            <span className="text-ink-muted">{t('testCard.noValue')}</span>
          )}
        </dd>
        <dt className="text-ink-muted">{t('rating.title')}</dt>
        <dd className="text-right">
          <RatingWord level={rating?.level ?? null} />
        </dd>
        <dt className="text-ink-muted">{t('testCard.evidence', { quality: '' }).trim()}</dt>
        <dd className="text-right">
          {model.evidence.quality ? (
            <span className="label-tag text-ink">{t('testCard.evidence', { quality: model.evidence.quality })}</span>
          ) : (
            <span className="text-ink-muted">{t('testCard.noEvidence')}</span>
          )}
        </dd>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-2 py-1.5">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/tests/${slug}/details`}>
            {t('testCard.details')}
            <ChevronRight size={14} aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link to={`/tests/${slug}`}>
            <Play size={13} strokeWidth={2.5} aria-hidden />
            {t('testCard.run')}
          </Link>
        </Button>
      </div>
    </article>
  )
}
