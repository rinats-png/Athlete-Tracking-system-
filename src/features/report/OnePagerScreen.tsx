import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { radarProfile } from '@/lib/scoring'
import { axisLabel } from '@/data/profileAxes'
import { confidenceScore } from '@/domain/analytics'
import { changeReport } from '@/domain/change'
import { rateResult } from '@/domain/rating'
import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { formatDate, formatNumber } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import type { StoredResult } from '@/lib/store/localStore'
import { pick } from '@/i18n/pick'

/** So viele Messwerte passen auf eine Seite, ohne dass sie zwei wird. */
const MAX_ROWS = 8

/**
 * Der Einseiter.
 *
 * DER GRUND, WARUM ES DIESEN BILDSCHIRM GIBT: der vollständige Bericht hat
 * vier A4-Seiten. Was tatsächlich weitergereicht wird — an Eltern, an einen
 * Vereinsvorstand, an den nächsten Trainer — ist eine Seite. Ein Bericht,
 * den niemand weitergibt, erzeugt auch keine Nachfrage.
 *
 * Er ist deshalb kein gekürzter Bericht, sondern eine eigene Auswahl: Profil,
 * die jüngsten Messwerte mit Einordnung, ein Satz zur Veränderung, und der
 * Hinweis darauf, was das hier NICHT ist. Der vollständige Bericht bleibt
 * daneben bestehen — nichts wird ersetzt (§89).
 */
export function OnePagerScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, athletes, activeAthleteId } = useAppData()

  const athlete = athletes.find((a) => a.id === activeAthleteId) ?? null
  const context = ratingContextOf(data.profile)
  const discipline = data.profile.disciplineId ? disciplineById(data.profile.disciplineId) : null

  const axes = useMemo(
    () => radarProfile(data.results, 'personal_best', new Date(), data.profile.disciplineId),
    [data.results, data.profile.disciplineId],
  )
  const confidence = useMemo(() => confidenceScore(data.results), [data.results])

  /** Die jüngste Messung je Test — nicht die beste: der Einseiter ist ein Stand. */
  const latest = useMemo(() => {
    const byTest = new Map<string, StoredResult>()
    for (const result of data.results) {
      if (result.score == null) continue
      const current = byTest.get(result.testSlug)
      if (!current || result.performedAt > current.performedAt) byTest.set(result.testSlug, result)
    }
    return [...byTest.values()]
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      .slice(0, MAX_ROWS)
  }, [data.results])

  if (latest.length === 0) {
    return (
      <>
        <BackLink />
        <EmptyState title={t('onePager.title')} body={t('onePager.noData')} />
      </>
    )
  }

  const name =
    athlete?.name || data.profile.firstName || t('onePager.for')
  const covered = axes.filter((a) => a.hasData).length

  return (
    <>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        <BackLink />
        <Button variant="primary" size="sm" onClick={() => window.print()}>
          <Printer size={14} aria-hidden />
          {t('onePager.print')}
        </Button>
        <span className="text-[12px] text-ink-muted">{t('onePager.intro')}</span>
      </div>

      <article className="report-sheet mx-auto max-w-[820px] border border-line p-6 print:border-0 print:p-0">
        {/* --- Kopf ------------------------------------------------------ */}
        <header className="border-b border-line pb-3">
          <p className="readout text-[10px] tracking-[0.2em] uppercase text-ink-muted">
            KYDON · {t('onePager.title')}
          </p>
          <h1 className="report-name font-display mt-1 text-[30px] leading-none font-bold">{name}</h1>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-3">
            <Fact label={t('onePager.date')} value={formatDate(new Date().toISOString(), locale)} />
            <Fact label={t('onePager.discipline')} value={pick(discipline?.name, locale) ?? '—'} />
            <Fact label={t('onePager.by')} value={data.branding.organisation || '—'} />
          </dl>
        </header>

        {/* --- Kurz gefasst ---------------------------------------------- */}
        <p className="mt-3 text-[13px] leading-relaxed">
          <span className="label-tag mr-2">{t('onePager.summary')}</span>
          {t('onePager.summaryLine', {
            measured: covered,
            planned: axes.length,
            confidence: confidence.score,
          })}
        </p>

        {/* --- Profil ----------------------------------------------------- */}
        <section className="mt-4">
          <h2 className="label-tag">{t('onePager.profile')}</h2>
          <table className="report-table mt-1 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-1 pr-2 font-semibold">{t('onePager.axis')}</th>
                <th className="w-24 py-1 pr-2 font-semibold">{t('onePager.value')}</th>
                <th className="w-28 py-1 font-semibold">{t('onePager.coverage')}</th>
              </tr>
            </thead>
            <tbody>
              {axes.map((axis) => (
                <tr key={axis.axisId} className="border-b border-line/50">
                  <td className="py-1 pr-2">{axisLabel(axis.axisId, t, locale)}</td>
                  <td className="readout py-1 pr-2">{axis.hasData ? axis.score : '—'}</td>
                  <td className="py-1">
                    <span
                      className="coverage-bar align-middle"
                      style={
                        { '--coverage': axis.hasData ? '100%' : '0%' } as React.CSSProperties
                      }
                      aria-hidden
                    />
                    <span className="ml-2 text-[11px] text-ink-muted">
                      {axis.hasData ? axis.testCount : 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* --- Messwerte -------------------------------------------------- */}
        <section className="mt-4">
          <h2 className="label-tag">{t('onePager.measured')}</h2>
          <table className="report-table mt-1 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-1 pr-2 font-semibold">{t('onePager.measured')}</th>
                <th className="w-24 py-1 pr-2 font-semibold">{t('onePager.value')}</th>
                <th className="w-28 py-1 pr-2 font-semibold">{t('onePager.rating')}</th>
                <th className="py-1 font-semibold">{t('onePager.change')}</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((result) => {
                const test = getTest(result.testSlug)
                const rating = rateResult(result, context)
                const change = changeReport(data.results, result)
                return (
                  <tr key={result.id} className="border-b border-line/50">
                    <td className="py-1 pr-2">{pick(test?.name, locale) ?? result.testSlug}</td>
                    <td className="readout py-1 pr-2">{formatResultValue(result, locale)}</td>
                    <td className="py-1 pr-2">
                      {rating.level ? t(`rating.levels.${rating.level}`) : '—'}
                    </td>
                    <td className="py-1 text-ink-secondary">
                      {change.verdict === 'first'
                        ? t('onePager.noChange')
                        : change.changePercent != null
                          ? `${change.changePercent > 0 ? '+' : ''}${formatNumber(change.changePercent, locale, 1)} %`
                          : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* --- Was das hier nicht ist ------------------------------------- */}
        <footer className="mt-4 border-t border-line pt-2">
          <p className="text-[10px] leading-relaxed text-ink-muted">{t('onePager.disclaimer')}</p>
          <p className="mt-1 text-[10px] text-ink-muted">
            {t('onePager.generated', { date: formatDate(new Date().toISOString(), locale) })}
          </p>
        </footer>
      </article>
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-tag">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/bericht">
        <ArrowLeft size={14} aria-hidden />
        {t('report.open')}
      </Link>
    </Button>
  )
}
