import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Camera, Play, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { RatingScale, RatingWord } from '@/features/shared/RatingScale'
import { BenchmarkRow, percentileLabel } from '@/features/shared/BenchmarkRow'
import { GoalBlock } from '@/features/shared/GoalBlock'
import { ReferenceSpectrum, type SpectrumMark } from '@/components/signature/ReferenceSpectrum'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { rateResult } from '@/domain/rating'
import { assessQuality } from '@/domain/dataQuality'
import { nextTests } from '@/domain/nextTest'
import { changeReport, missingForError, type ChangeReport } from '@/domain/change'
import { formulaFor } from '@/domain/formulaRegistry'
import { formatDate, formatNumber } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { preparePhoto, type PhotoError } from '@/lib/photo'
import type { ReferenceComparison } from '@/data/references'

/**
 * Die Ergebnisanalyse (Konzept §15–§18).
 *
 * Konsequent getrennt: Messwert → Referenz → Interpretation. Der Wert steht
 * zuerst und allein. Dann die Referenz — eine benannte Gruppe mit Quelle
 * und Qualität. Dann die Skala. Dann der Vergleich mit allen weiteren
 * Gruppen, Bevölkerung wie Athleten. Wo keine Referenz vorliegt, steht das
 * so da; ein leeres Feld wäre eine Lücke, ein Satz ist eine Auskunft.
 */
export function ResultScreen() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, setResultPhoto } = useAppData()
  const result = data.results.find((r) => r.id === id) ?? null
  const test = result ? getTest(result.testSlug) : undefined
  const context = ratingContextOf(data.profile)
  const rating = useMemo(() => (result ? rateResult(result, context) : null), [result, context])
  const quality = result ? assessQuality(result) : null
  const suggestions = useMemo(
    () =>
      nextTests({
        disciplineId: data.profile.disciplineId,
        additionalDisciplineIds: data.profile.additionalDisciplineIds,
        goalKey: data.profile.goalKey,
        sex: data.profile.sex,
        birthDate: data.profile.birthDate,
        reminderIntervalDays: data.profile.reminderIntervalDays,
        results: data.results,
      }),
    [data.profile, data.results],
  )

  if (!result || !test || !rating) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('result.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/verlauf">{t('nav.history')}</Link>
        </Button>
      </Panel>
    )
  }

  const change = changeReport(data.results, result)
  const primary = rating.comparison
  const all = [...(primary ? [primary] : []), ...rating.alternatives]
  const next = suggestions.find((s) => s.slug !== test.slug) ?? null
  const nextTest = next ? getTest(next.slug) : null
  const value = (key: string) => result.metrics[key] ?? result.values[key] ?? null

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={`/tests/${test.slug}/details`}>
          <ArrowLeft size={14} aria-hidden />
          {test.name[locale]}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('result.eyebrow')} title={test.name[locale]} intro={t('result.measuredOn', { date: formatDate(result.performedAt, locale) })} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel ticked float className="rise">
          <PanelHeader title={t('result.yourValue')} />
          <div className="px-4 py-5">
            {/* Der Messwert ist der Held der Oberfläche — vor Überschrift,
                Symbol und Fläche. Deshalb diese Grösse. */}
            <p className="readout text-[64px] leading-[0.95] font-bold tabular-nums sm:text-[72px]">
              {formatResultValue(result, locale)}
            </p>
            {rating.metricKey && rating.metricKey !== test.primaryMetric && value(rating.metricKey) != null && (
              <p className="mt-2 text-[13px] text-ink-secondary">
                {t(`metrics.${rating.metricKey}`)}: <span className="readout">{formatNumber(value(rating.metricKey)!, locale, 1)}</span>
              </p>
            )}
            {quality && quality.status !== 'valid' && (
              <p className="mt-2 text-[12px] text-warning">
                {t('result.dataQuality')}: {t(`quality.status.${quality.status}`)} — {quality.reasons.map((r) => t(r)).join(' ')}
              </p>
            )}
            {test.derivedMetrics.some((key) => result.metrics[key] != null) && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-3 text-[12px]">
                {test.derivedMetrics
                  .filter((key) => result.metrics[key] != null)
                  .map((key) => (
                    <div key={key} className="contents">
                      <dt className="text-ink-muted">
                        {t(`metrics.${key}`)}
                        {formulaFor(key)?.source === 'provisional' && (
                          <span className="ml-1 text-[10px] uppercase">{t('tests.provisional')}</span>
                        )}
                      </dt>
                      <dd className="readout text-right">{formatNumber(result.metrics[key], locale, 2)}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {result.notes && <p className="mt-3 text-[12px] text-ink-secondary">{t('result.note')}: {result.notes}</p>}
          </div>
          <ChangeBlock change={change} missing={missingForError(data.results, result.testSlug)} />
          <GoalBlock testSlug={result.testSlug} />
          <PhotoBlock
            photo={result.photo}
            onChange={(dataUrl) => setResultPhoto(result.id, dataUrl)}
          />
        </Panel>

        <Panel>
          <PanelHeader title={t('result.comparison')} subtitle={primary ? primary.entry.cohortLabel[locale] : undefined} />
          {primary ? (
            <ComparisonBlock
              comparison={primary}
              // Der Zahlenwert, der auf der Achse liegt — dieselbe Kennzahl
              // wie die Referenz, sonst zeigte das Spektrum Äpfel neben Birnen.
              ownValue={
                rating.metricKey && value(rating.metricKey) != null
                  ? value(rating.metricKey)!
                  : (result.score ?? null)
              }
              // Verglichen wird die Kennzahl der Referenz — beim Cooper-Test
              // die VO₂max, nicht die Distanz. Sonst stünde «3320 m» neben
              // «34,2 ± 2,8» und niemand wüsste, was womit verglichen wird.
              valueLabel={
                rating.metricKey && rating.metricKey !== test.primaryMetric && value(rating.metricKey) != null
                  ? `${formatNumber(value(rating.metricKey)!, locale, 1)} (${t(`metrics.${rating.metricKey}`)})`
                  : formatResultValue(result, locale)
              }
            />
          ) : (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t(`rating.gap.${rating.gap ?? 'no_reference'}`)}</p>
          )}
        </Panel>

        <Panel ticked className="lg:col-span-2">
          <PanelHeader title={t('rating.title')} action={<RatingWord level={rating.level} />} />
          <div className="px-4 py-4">
            <RatingScale level={rating.level} />
            <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">
              {rating.level && primary
                ? primary.percentile != null
                  ? t('rating.basisPercentile', { percentile: percentileLabel(primary.percentile, locale), group: primary.entry.cohortLabel[locale] })
                  : t('rating.basisBand', { band: primary.band?.label[locale] ?? '', group: primary.entry.cohortLabel[locale] })
                : `${t('rating.none')} ${t(`rating.gap.${rating.gap ?? 'no_reference'}`)}`}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{t('rating.caveat')}</p>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title={t('result.benchmark')} subtitle={t('result.benchmarkHint')} />
          {all.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('result.noSociety')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {all.map((comparison) => (
                <BenchmarkRow key={`${comparison.entry.cohort}-${comparison.entry.cohortLabel.de}-${comparison.entry.ageMin}`} comparison={comparison} />
              ))}
            </ul>
          )}
          {!all.some((c) => c.entry.cohort === 'population') && all.length > 0 && (
            <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">{t('result.noSociety')}</p>
          )}
        </Panel>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/verlauf/test/${test.slug}`}>{t('result.toHistory')}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/tests/${test.slug}`}>
            <Play size={13} aria-hidden />
            {t('result.again')}
          </Link>
        </Button>
        {nextTest && (
          <Button asChild variant="primary" size="sm">
            <Link to={`/tests/${nextTest.slug}`}>
              {t('result.next')}: {nextTest.name[locale]}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </>
  )
}

/** Dein Wert gegen Mittel, Untergrenze und Elitebereich der Gruppe. */
function ComparisonBlock({
  comparison,
  valueLabel,
  ownValue,
}: {
  comparison: ReferenceComparison
  valueLabel: string
  ownValue: number | null
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { entry } = comparison
  const direction = getTest(entry.testSlug)?.direction ?? 'higher_is_better'

  /**
   * Die Marken des Spektrums. Nur was die Quelle wirklich hergibt: bei
   * `mean_sd` lassen sich Mittel, Elitebereich und Untergrenze ableiten,
   * bei einem blossen Median nicht. Eine erfundene Marke wäre hier
   * besonders schädlich, weil eine Achse Genauigkeit suggeriert.
   */
  const marks: SpectrumMark[] = []
  if (entry.method === 'mean_sd' && entry.mean != null && entry.sd != null) {
    const sign = direction === 'lower_is_better' ? -1 : 1
    marks.push({ key: 'cutoff', label: t('result.cutoff'), value: entry.mean - sign * entry.sd })
    marks.push({ key: 'mean', label: t('result.groupMean', { group: '' }).trim(), value: entry.mean })
    marks.push({ key: 'elite', label: t('result.elite'), value: entry.mean + sign * 2 * entry.sd })
  } else if (entry.method === 'median' && entry.median != null) {
    marks.push({ key: 'median', label: t('result.groupMedian'), value: entry.median })
  }
  if (ownValue != null && marks.length > 0) {
    marks.push({ key: 'you', label: t('result.you'), value: ownValue, own: true })
  }
  const rows: { label: string; value: string }[] = [{ label: t('result.you'), value: valueLabel }]
  if (entry.method === 'mean_sd' && entry.mean != null && entry.sd != null) {
    const direction = getTest(entry.testSlug)?.direction ?? 'higher_is_better'
    const sign = direction === 'lower_is_better' ? -1 : 1
    rows.push({ label: t('result.groupMean', { group: '' }).trim(), value: `${formatNumber(entry.mean, locale, 1)} ${t('result.groupSd', { sd: formatNumber(entry.sd, locale, 1) })}` })
    rows.push({ label: t('result.elite'), value: formatNumber(entry.mean + sign * 2 * entry.sd, locale, 1) })
    rows.push({ label: t('result.cutoff'), value: formatNumber(entry.mean - sign * entry.sd, locale, 1) })
  }
  if (entry.method === 'bands' && entry.bands) {
    rows.push({ label: t('result.band'), value: entry.bands.map((b) => `${b.label[locale]}${b.upTo != null ? ` ≤ ${formatNumber(b.upTo, locale, 2)}` : ''}`).join(' · ') })
  }
  if (entry.method === 'anchor' && entry.anchor != null) {
    rows.push({ label: t('testInfo.anchor', { anchor: formatNumber(entry.anchor, locale, 1) }), value: t('result.percentOfAnchor', { percent: formatNumber(comparison.percentOfAnchor ?? 0, locale, 0) }) })
  }
  if (entry.method === 'median' && entry.median != null) {
    const percent = comparison.percentFromMedian
    rows.push({
      label: t('result.groupMedian'),
      value: `${formatNumber(entry.median, locale, 1)}${percent == null ? '' : ` · ${t('result.percentFromMedian', { percent: `${percent > 0 ? '+' : ''}${formatNumber(percent, locale, 0)}` })}`}`,
    })
  }
  return (
    <div className="px-4 py-3">
      {marks.length >= 2 && (
        <ReferenceSpectrum marks={marks} direction={direction} className="mb-4" ripple />
      )}
      <dl className="space-y-1 text-[13px]">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="readout text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
        {t('result.quality', { quality: entry.quality })} · {t('result.source', { study: entry.source.study })}
        {entry.source.n != null && ` · ${t('testInfo.n', { n: entry.source.n })}`}
        {entry.protocolNote && <span className="block">{t('result.protocolNote', { note: entry.protocolNote[locale] })}</span>}
      </p>
    </div>
  )
}


/**
 * Der Beleg zur Messung (§14).
 *
 * Ein Bild vom Display der Zeitmessung beantwortet Monate später die Frage
 * «woher kommt diese Zahl» — die eine Notiz nicht beantwortet. Genau eines je
 * Ergebnis, verkleinert vor dem Speichern, und es bleibt auf dem Gerät.
 */
function PhotoBlock({
  photo,
  onChange,
}: {
  photo: { dataUrl: string; addedAt: string } | null
  onChange: (dataUrl: string | null) => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState<PhotoError | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file: File) => {
    setBusy(true)
    setError(null)
    const outcome = await preparePhoto(file)
    setBusy(false)
    if (outcome.dataUrl) onChange(outcome.dataUrl)
    else setError(outcome.error)
  }

  return (
    <div className="border-t border-line px-4 py-3">
      {photo ? (
        <div className="space-y-2">
          <img
            src={photo.dataUrl}
            alt={t('result.photoAlt')}
            className="max-h-64 w-auto rounded-md border border-line"
          />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 size={14} aria-hidden />
              {t('result.photoRemove')}
            </Button>
            <span className="text-[11px] text-ink-muted">
              {t('result.photoAdded', { date: formatDate(photo.addedAt, 'de') })}
            </span>
          </div>
        </div>
      ) : (
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-ink-secondary">
          <Camera size={16} aria-hidden />
          <span>{busy ? t('result.photoWorking') : t('result.photoAdd')}</span>
          <input
            type="file"
            accept="image/*"
            aria-label={t('result.photoAdd')}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void pick(file)
            }}
          />
        </label>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{t('result.photoHint')}</p>
      {error && (
        <p role="alert" className="mt-1 text-[12px] text-critical">
          {t(`result.photoError.${error}`)}
        </p>
      )}
    </div>
  )
}


/**
 * Die Veränderung gegenüber der letzten Messung — und ob sie etwas bedeutet.
 *
 * Der Satz «+8 % gegenüber deinem letzten Test» ist ohne die eigene Streuung
 * wertlos: liegt die typische Abweichung dieses Athleten in diesem Test bei
 * 6 %, sind 8 % kaum mehr als ein guter Tag. Deshalb steht die Streuung immer
 * daneben, und solange sie unbekannt ist, sagt der Block das, statt die
 * Prozentzahl allein zu feiern.
 */
function ChangeBlock({ change, missing }: { change: ChangeReport; missing: number }) {
  const { t } = useTranslation()
  const locale = useLocale()
  if (change.verdict === 'first') {
    return (
      <div className="border-t border-line px-4 py-3">
        <span className="label-tag">{t('change.title')}</span>
        <p className="mt-1 text-[13px] text-ink-secondary">{t('change.first')}</p>
      </div>
    )
  }

  const percent = change.changePercent ?? 0
  const signed = `${percent > 0 ? '+' : ''}${formatNumber(percent, locale, 1)} %`
  const tone =
    change.verdict === 'better'
      ? 'text-good'
      : change.verdict === 'worse'
        ? 'text-critical'
        : 'text-ink-secondary'

  return (
    <div className="border-t border-line px-4 py-3">
      <span className="label-tag">{t('change.title')}</span>
      <p className="mt-1 flex items-baseline gap-2">
        <span className={`readout text-[22px] tabular-nums ${tone}`}>{signed}</span>
        <span className="text-[12px] text-ink-muted">
          {t('change.sincePrevious', { days: change.daysSincePrevious ?? 0 })}
        </span>
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
        {change.typicalErrorPercent == null
          ? t('change.unknownError', { count: missing })
          : t(`change.verdict.${change.verdict}`, {
              error: formatNumber(change.typicalErrorPercent, locale, 1),
              detectable: formatNumber(change.detectablePercent ?? 0, locale, 1),
              points: change.points,
            })}
      </p>
    </div>
  )
}
