import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TrendChart } from '@/components/charts/TrendChart'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { RatingScale, RatingWord } from '@/features/shared/RatingScale'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { describeTest } from '@/domain/testModel'
import { rateResult } from '@/domain/rating'
import { EQUIPMENT_BY_ID } from '@/data/equipment'
import { formatDate, formatDuration, formatNumber } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import type { ReferenceEntry } from '@/data/references'

/**
 * Die Testdetailseite (Konzept §12).
 *
 * In dieser Reihenfolge: Was wird gemessen? Protokoll, Dauer, Equipment,
 * Einheit. Dann die wissenschaftliche Grundlage — jede Referenzgruppe als
 * Zeile mit Geschlecht, Alter, Werten, Datenqualität und Quelle. Dann der
 * eigene Stand mit Einordnung und Verlauf. Und der Knopf, der den Test
 * startet.
 */
export function TestDetailScreen() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const model = describeTest(slug)
  const context = ratingContextOf(data.profile)

  const history = useMemo(
    () => data.results.filter((r) => r.testSlug === slug && r.score != null).sort((a, b) => b.performedAt.localeCompare(a.performedAt)),
    [data.results, slug],
  )

  if (!model) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('tests.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/tests">{t('actions.backToCatalog')}</Link>
        </Button>
      </Panel>
    )
  }
  const { test } = model
  const latest = history[0] ?? null
  const rating = latest ? rateResult(latest, context) : null
  const points = [...history].reverse().map((r) => ({ performedAt: r.performedAt, value: r.score as number }))
  const duration = test.protocol.durationSeconds != null ? formatDuration(test.protocol.durationSeconds) : t('testInfo.durationOpen')

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/diagnostik">
          <ArrowLeft size={14} aria-hidden />
          {t('diag.eyebrow')}
        </Link>
      </Button>
      <ScreenHeader
        eyebrow={`${t(`categories.${test.category}`)} · ${t(`dimensions.${test.dimension}`)}`}
        title={test.name[locale]}
        intro={test.summary[locale]}
        action={
          <Button asChild variant="primary">
            <Link to={`/tests/${test.slug}`}>
              <Play size={14} strokeWidth={2.5} aria-hidden />
              {t('testInfo.run')}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel>
            <PanelHeader title={t('testInfo.protocol')} />
            <p className="px-4 py-3 text-[14px] leading-relaxed text-ink-secondary">{test.instructions[locale]}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[13px] sm:grid-cols-4">
              <Fact label={t('testInfo.duration')} value={duration} />
              <Fact label={t('testInfo.unit')} value={test.primaryUnit} />
              <Fact label={t('testInfo.direction')} value={t(`testDetail.${test.direction}`)} />
              <Fact label={t('testInfo.mode')} value={t(`testCard.mode.${model.mode}`)} />
            </dl>
            <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">{t(`testInfo.modeHint.${model.mode}`)}</p>
            <div className="border-t border-line px-4 py-3">
              <span className="label-tag">{t('testInfo.equipment')}</span>
              <p className="mt-1 text-[13px]">{test.equipment[locale]}</p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {test.equipmentIds.map((group) => group.map((id) => EQUIPMENT_BY_ID.get(id)?.name[locale] ?? id).join(' / ')).join(' + ')}
              </p>
            </div>
            {model.sports.length > 0 && (
              <div className="border-t border-line px-4 py-3">
                <span className="label-tag">{t('testInfo.sports')}</span>
                <p className="mt-1 text-[13px] text-ink-secondary">
                  {model.sports.map((s) => (
                    <Link key={s.disciplineId} to={`/sport/${s.disciplineId}`} className="mr-2 underline-offset-2 hover:underline">
                      {s.name[locale]}
                    </Link>
                  ))}
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader title={t('testInfo.science')} subtitle={t('testInfo.scienceHint')} />
            {model.references.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('testInfo.noScience')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {(['group', 'sex', 'age', 'values', 'quality', 'source'] as const).map((col) => (
                        <th key={col} className="label-tag px-3 py-2 font-semibold">{t(`testInfo.cols.${col}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {model.references.map((entry, i) => (
                      <ReferenceRow key={i} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel ticked>
            <PanelHeader title={t('testInfo.standing')} action={rating && <RatingWord level={rating.level} />} />
            {latest == null ? (
              <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('testDetail.noResults')}</p>
            ) : (
              <div className="px-4 py-4">
                <p className="readout text-[36px] leading-none">{formatResultValue(latest, locale)}</p>
                <p className="mt-1 text-[12px] text-ink-muted">{formatDate(latest.performedAt, locale)}</p>
                <div className="mt-3">
                  <RatingScale level={rating?.level ?? null} />
                </div>
                {rating && !rating.level && (
                  <p className="mt-2 text-[12px] text-ink-secondary">{t(`rating.gap.${rating.gap ?? 'no_reference'}`)}</p>
                )}
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to={`/ergebnis/${latest.id}`}>{t('testInfo.seeResult')}</Link>
                </Button>
              </div>
            )}
          </Panel>

          {points.length >= 2 && (
            <Panel>
              <PanelHeader title={t('testInfo.history')} subtitle={test.primaryUnit} />
              <div className="px-2 py-3">
                <TrendChart points={points} unit={test.primaryUnit} locale={locale} label={test.name[locale]} showFit />
              </div>
              <Button asChild variant="ghost" size="sm" className="m-2">
                <Link to={`/verlauf/test/${test.slug}`}>{t('result.toHistory')}</Link>
              </Button>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-tag">{label}</dt>
      <dd className="mt-0.5 truncate">{value}</dd>
    </div>
  )
}

function ReferenceRow({ entry }: { entry: ReferenceEntry }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const values =
    entry.method === 'mean_sd'
      ? t('testInfo.meanSd', { mean: formatNumber(entry.mean ?? 0, locale, 1), sd: formatNumber(entry.sd ?? 0, locale, 1) })
      : entry.method === 'bands'
        ? t('testInfo.bands', { bands: (entry.bands ?? []).map((b) => `${b.label[locale]}${b.upTo != null ? ` ≤ ${formatNumber(b.upTo, locale, 2)}` : ''}`).join(' · ') })
        : entry.method === 'anchor'
          ? t('testInfo.anchor', { anchor: formatNumber(entry.anchor ?? 0, locale, 1) })
          : t('testInfo.percentiles', { values: (entry.values ?? []).map((v) => formatNumber(v, locale, 1)).join(' / ') })
  return (
    <tr className="border-b border-line align-top last:border-0">
      <td className="px-3 py-2">
        <span className="block">{entry.cohortLabel[locale]}</span>
        <span className="label-tag">{t(`result.groups.${entry.cohort}`)}</span>
      </td>
      <td className="px-3 py-2">{entry.sex === 'all' ? t('testInfo.sexAll') : t(`profile.${entry.sex}`)}</td>
      <td className="readout px-3 py-2">{entry.ageMin}–{entry.ageMax >= 120 ? '' : entry.ageMax}</td>
      <td className="px-3 py-2">
        {values}
        {entry.protocolNote && <span className="mt-1 block text-[11px] text-ink-muted">{entry.protocolNote[locale]}</span>}
      </td>
      <td className="px-3 py-2" title={t(`testInfo.qualityHint.${entry.quality}`)}>
        <span className="label-tag text-ink">{entry.quality}</span>
      </td>
      <td className="px-3 py-2 text-ink-secondary">
        {entry.source.study}
        <span className="block text-[11px] text-ink-muted">{entry.source.n != null ? t('testInfo.n', { n: entry.source.n }) : t('testInfo.nUnknown')}</span>
      </td>
    </tr>
  )
}
