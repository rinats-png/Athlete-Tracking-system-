import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { RadarProfile } from '@/components/charts/RadarProfile'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { TestCard } from '@/features/shared/TestCard'
import { RatingWord } from '@/features/shared/RatingScale'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf, reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById, coreSlugs } from '@/data/sportProfiles'
import { getTest } from '@/data/testCatalog'
import { TEST_BATTERIES, disciplineBattery } from '@/data/testBatteries'
import { additionReason } from '@/data/documentCoverage'
import { SPORT_FILTERS, matchesSportFilter, type SportFilter } from '@/domain/areas'
import { nextTests } from '@/domain/nextTest'
import { rateResult } from '@/domain/rating'
import { radarProfile } from '@/lib/scoring'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'

/**
 * Die Sport-Detailseite (Konzept §9): aktueller Stand, empfohlene Tests,
 * alle Tests mit Filter, Batterien — und das Performance-Profil dieser
 * Sportart (§27), auch wenn sie nicht die Hauptsportart ist.
 */
export function SportScreen() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, saveProfile } = useAppData()
  const [filter, setFilter] = useState<SportFilter>('all')
  const sport = disciplineById(id)
  const context = ratingContextOf(data.profile)
  const reminders = reminderSettingsOf(data.profile)

  const axes = useMemo(() => radarProfile(data.results, 'population', new Date(), id), [data.results, id])
  const suggestions = useMemo(
    () =>
      nextTests({
        disciplineId: id,
        additionalDisciplineIds: data.profile.additionalDisciplineIds,
        goalKey: data.profile.goalKey,
        sex: data.profile.sex,
        birthDate: data.profile.birthDate,
        reminderIntervalDays: data.profile.reminderIntervalDays,
        results: data.results,
      }),
    [id, data.profile, data.results],
  )

  if (!sport) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('sport.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/diagnostik">{t('diag.eyebrow')}</Link>
        </Button>
      </Panel>
    )
  }

  const isMain = data.profile.disciplineId === sport.id
  const standing = coreSlugs(sport)
    .map((slug) => data.results.find((r) => r.testSlug === slug && r.score != null))
    .filter((r): r is NonNullable<typeof r> => r != null)
  const sportSlugs = new Set(sport.tests.map((entry) => entry.slug))
  const recommended = suggestions.filter((s) => sportSlugs.has(s.slug)).slice(0, 3)
  const allTests = sport.tests
    .map((entry) => getTest(entry.slug))
    .filter((test): test is NonNullable<typeof test> => test != null && matchesSportFilter(test, filter))
  const batteries = [
    ...[disciplineBattery(sport.id)].filter((b): b is NonNullable<typeof b> => b != null),
    ...TEST_BATTERIES.filter((b) => b.disciplineIds?.includes(sport.id)),
  ]

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/diagnostik">
          <ArrowLeft size={14} aria-hidden />
          {t('diag.eyebrow')}
        </Link>
      </Button>
      <ScreenHeader
        eyebrow={isMain ? t('sport.isMain') : t('sport.isAdditional')}
        title={sport.name[locale]}
        intro={sport.rationale[locale]}
        action={
          !isMain && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                saveProfile({
                  disciplineId: sport.id,
                  sportCategoryId: sport.categoryId,
                  additionalDisciplineIds: [
                    ...(data.profile.disciplineId ? [data.profile.disciplineId] : []),
                    ...data.profile.additionalDisciplineIds.filter((x) => x !== sport.id),
                  ],
                })
              }
            >
              {t('sport.setMain')}
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t('sport.standing')} />
          {standing.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('sport.noStanding')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {standing.map((result) => {
                const test = getTest(result.testSlug)!
                const rating = rateResult(result, { ...context, disciplineIds: [sport.id, ...context.disciplineIds] })
                return (
                  <li key={result.id}>
                    <Link to={`/ergebnis/${result.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent-quiet">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium">{test.name[locale]}</span>
                        <span className="block text-[11px] text-ink-muted">{formatDate(result.performedAt, locale)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <RatingWord level={rating.level} />
                        <span className="readout text-[16px]">{formatResultValue(result, locale)}</span>
                        <ChevronRight size={14} className="text-ink-muted" aria-hidden />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={t('sport.profileTitle', { sport: sport.name[locale] })} subtitle={t('overview.profileHint')} />
          <RadarProfile axes={axes} mode="population" locale={locale} disciplineWeights={sport.dimensionWeights} disciplineLabel={sport.name[locale]} />
        </Panel>
      </div>

      <section className="mt-6">
        <h2 className="label-tag">{t('sport.recommended')}</h2>
        <p className="mb-2 text-[12px] text-ink-muted">{t('sport.recommendedHint')}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {recommended.map((suggestion) => (
            <TestCard
              key={suggestion.slug}
              slug={suggestion.slug}
              results={data.results}
              context={context}
              reminders={reminders}
              reason={suggestion.reasons.slice(0, 2).map((r) => t(`overview.reasons.${r}`)).join(' ')}
            />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="label-tag">{t('sport.allTests', { sport: sport.name[locale] })}</h2>
          <div className="max-w-full overflow-x-auto">
            <SegmentedControl<SportFilter>
              label={t('sport.filter')}
              value={filter}
              onChange={setFilter}
              options={SPORT_FILTERS.map((key) => ({ value: key, label: t(`sport.filters.${key}`) }))}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {allTests.map((test) => (
            <TestCard
              key={test.slug}
              slug={test.slug}
              results={data.results}
              context={context}
              reminders={reminders}
              reason={additionReason(sport.id, test.slug)}
            />
          ))}
        </div>
      </section>

      {batteries.length > 0 && (
        <section className="mt-6">
          <h2 className="label-tag mb-2">{t('sport.batteries', { sport: sport.name[locale] })}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {batteries.map((battery) => (
              <li key={battery.slug}>
                <Link to={`/batterie/${encodeURIComponent(battery.slug)}`} className="panel flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent-quiet">
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{battery.name[locale]}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {t('diag.testCount', { count: battery.testSlugs.length })} · {battery.durationMinutes} min
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
