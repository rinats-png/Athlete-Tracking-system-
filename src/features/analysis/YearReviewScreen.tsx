import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { axisLabel } from '@/data/profileAxes'
import { radarProfile } from '@/lib/scoring'
import { performanceScore } from '@/domain/performanceScore'
import { yearReview } from '@/domain/yearReview'
import { drawPerformanceCard } from '@/lib/performanceCard'
import { formatNumber } from '@/lib/format'

/**
 * Der Jahresrückblick und die Karte zum Weitergeben.
 *
 * Das ist die eine Ansicht, die jemand freiwillig öffnet und weiterschickt.
 * Genau deshalb ist sie beim Zählen streng: ein «grösster Fortschritt», der
 * aus einer Tagesschwankung stammt, stünde als Bild in einem Gruppenchat.
 */
export function YearReviewScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const years = useMemo(
    () =>
      [...new Set(data.results.map((r) => new Date(r.performedAt).getUTCFullYear()))].sort(
        (a, b) => b - a,
      ),
    [data.results],
  )
  const [year, setYear] = useState(() => years[0] ?? new Date().getUTCFullYear())

  const review = useMemo(
    () => yearReview(data.results, data.assessments, year),
    [data.results, data.assessments, year],
  )
  const axes = useMemo(
    () => radarProfile(data.results, 'population', new Date(`${year}-12-31T23:59:59Z`), data.profile.disciplineId),
    [data.results, year, data.profile.disciplineId],
  )
  const score = performanceScore(axes)
  const sport = data.profile.disciplineId ? disciplineById(data.profile.disciplineId) : null

  /**
   * Die Karte wird GEZEICHNET, sobald sie zu sehen ist — nicht erst beim
   * Herunterladen. Vorher stand an der Stelle ein leerer Rahmen, und wer
   * eine Vorschau erwartet, sah einen Fehler. Wer sie weitergibt, soll
   * vorher wissen, was daraufsteht.
   */
  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false
    drawPerformanceCard(canvas, {
      title: sport?.name[locale] ?? t('year.generalProfile'),
      score: score.value,
      coverage: t('score.coverage', { rated: score.ratedAxes, total: score.totalAxes }),
      rows: score.parts
        .slice(0, 5)
        .map((part) => ({ label: axisLabel(part.axisId, t, locale), value: part.score })),
      footer: t('year.cardFooter', { results: review.results, year: review.year }),
      caveat: t('year.cardCaveat'),
    })
    return true
  }, [locale, review.results, review.year, score, sport, t])

  useEffect(() => {
    paint()
  }, [paint])

  if (data.results.length === 0) {
    return <EmptyState title={t('year.emptyTitle')} body={t('year.emptyBody')} />
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!paint() || !canvas) return
    const link = document.createElement('a')
    link.download = `baseline-${review.year}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/analyse">
          <ArrowLeft size={14} aria-hidden />
          {t('nav.analysis')}
        </Link>
      </Button>
      <ScreenHeader
        eyebrow={t('nav.analysis')}
        title={t('year.title', { year: review.year })}
        intro={t('year.intro')}
      />

      {years.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {years.map((candidate) => (
            <Button
              key={candidate}
              variant={candidate === year ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setYear(candidate)}
            >
              {candidate}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel ticked>
          <PanelHeader title={t('year.numbers')} />
          <dl className="space-y-1 px-4 py-4 text-[14px]">
            <Row label={t('year.results')} value={String(review.results)} />
            <Row label={t('year.testsUsed')} value={String(review.testsUsed)} />
            <Row label={t('year.assessments')} value={String(review.assessments)} />
            <Row label={t('year.personalBests')} value={String(review.personalBests)} />
            <Row
              label={t('year.activeMonths')}
              value={t('year.ofTwelve', { count: review.activeMonths })}
            />
          </dl>
        </Panel>

        <Panel>
          <PanelHeader title={t('year.development')} subtitle={t('year.developmentHint')} />
          <div className="px-4 py-4 text-[14px] leading-relaxed">
            {review.biggestGain ? (
              <p className="text-good">
                {t('year.gain', {
                  test: getTest(review.biggestGain.testSlug)?.name[locale],
                  percent: formatNumber(review.biggestGain.changePercent, locale, 1),
                })}
              </p>
            ) : (
              <p className="text-ink-secondary">{t('year.noGain')}</p>
            )}
            {review.biggestDrop && (
              <p className="mt-2 text-critical">
                {t('year.drop', {
                  test: getTest(review.biggestDrop.testSlug)?.name[locale],
                  percent: formatNumber(Math.abs(review.biggestDrop.changePercent), locale, 1),
                })}
              </p>
            )}
            {review.changes.some((c) => c.proven === false) && (
              <p className="mt-2 text-[13px] text-ink-muted">
                {t('year.withinNoise', {
                  count: review.changes.filter((c) => c.proven === false).length,
                })}
              </p>
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <PanelHeader title={t('year.card')} subtitle={t('year.cardHint')} />
        <div className="px-4 py-4">
          <canvas
            ref={canvasRef}
            width={640}
            height={800}
            className="max-w-full border border-line"
            aria-label={t('year.cardAlt')}
          />
          <Button variant="outline" size="sm" className="mt-3" onClick={download}>
            <Download size={14} aria-hidden />
            {t('year.cardDownload')}
          </Button>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{t('year.cardPrivacy')}</p>
        </div>
      </Panel>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="readout text-right tabular-nums">{value}</dd>
    </div>
  )
}
