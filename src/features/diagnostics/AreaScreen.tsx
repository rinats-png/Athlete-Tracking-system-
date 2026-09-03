import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { TestCard } from '@/features/shared/TestCard'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf, reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById } from '@/data/sportProfiles'
import { AREAS, testsForArea, type Area } from '@/domain/areas'

/** Ein Leistungsbereich (Konzept §7): erst die Tests der eigenen Sportart, dann alle. */
export function AreaScreen() {
  const { area = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  if (!AREAS.includes(area as Area)) return null
  const key = area as Area
  const main = disciplineById(data.profile.disciplineId)
  const all = testsForArea(key)
  const ownSlugs = new Set(main?.tests.map((entry) => entry.slug) ?? [])
  const own = all.filter((test) => ownSlugs.has(test.slug))
  const rest = all.filter((test) => !ownSlugs.has(test.slug))
  const context = ratingContextOf(data.profile)
  const reminders = reminderSettingsOf(data.profile)

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/diagnostik">
          <ArrowLeft size={14} aria-hidden />
          {t('diag.eyebrow')}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('diag.eyebrow')} title={t(`diag.areaTitle.${key}`)} intro={t('diag.areaIntro')} />

      {main && (
        <section className="mb-6">
          <h2 className="label-tag mb-2">
            {t('diag.forYourSport')} · {main.name[locale]}
          </h2>
          {own.length === 0 ? (
            <p className="text-[13px] text-ink-secondary">{t('diag.noneInArea')}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {own.map((test) => (
                <TestCard key={test.slug} slug={test.slug} results={data.results} context={context} reminders={reminders} />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="label-tag mb-2">{t('diag.allInArea')}</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((test) => (
            <TestCard key={test.slug} slug={test.slug} results={data.results} context={context} reminders={reminders} />
          ))}
        </div>
      </section>
    </>
  )
}
