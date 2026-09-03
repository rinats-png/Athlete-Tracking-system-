import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Circle, CircleCheck, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { BATTERY_BY_SLUG, disciplineBattery } from '@/data/testBatteries'
import { getTest } from '@/data/testCatalog'
import { DEFAULT_RETEST_DAYS } from '@/domain/nextTest'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'

/**
 * Eine Testbatterie (Konzept §10) als Checkliste.
 *
 * «Gemessen» heisst: ein Ergebnis aus den letzten 42 Tagen. Ein Wert von
 * vor einem Jahr ist kein Abschluss dieser Batterie — er ist ein alter
 * Wert. «Batterie starten» legt einen Termin an, in dem jeder Test einzeln
 * gestartet wird; der Zwischenstand bleibt über Tage erhalten.
 */
export function BatteryScreen() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const { data, saveAssessment } = useAppData()
  const decoded = decodeURIComponent(slug)
  const battery =
    BATTERY_BY_SLUG.get(decoded) ??
    (decoded.startsWith('discipline:') ? disciplineBattery(decoded.slice('discipline:'.length)) : null)

  if (!battery) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('battery.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/diagnostik">{t('diag.eyebrow')}</Link>
        </Button>
      </Panel>
    )
  }

  const cutoff = Date.now() - DEFAULT_RETEST_DAYS * 86_400_000
  const rows = battery.testSlugs.map((testSlug) => {
    const latest = data.results.find((r) => r.testSlug === testSlug && r.score != null) ?? null
    const done = latest != null && new Date(latest.performedAt).getTime() >= cutoff
    return { testSlug, latest, done }
  })
  const doneCount = rows.filter((r) => r.done).length

  const start = () => {
    const id = newId()
    const today = new Date().toISOString().slice(0, 10)
    saveAssessment({
      id,
      title: battery.name[locale],
      batterySlug: battery.slug,
      performedOn: today,
      status: 'in_progress',
      plannedTestSlugs: battery.testSlugs,
      readiness: null,
      nextAssessmentOn: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    })
    navigate(`/diagnostik/${id}`)
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/diagnostik">
          <ArrowLeft size={14} aria-hidden />
          {t('diag.eyebrow')}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('battery.eyebrow')} title={battery.name[locale]} intro={battery.description[locale]} />

      <Panel ticked className="max-w-2xl">
        <PanelHeader
          title={t('battery.progress', { done: doneCount, total: rows.length })}
          subtitle={t('battery.duration', { minutes: battery.durationMinutes })}
        />
        <div role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={rows.length} className="h-1.5 w-full bg-line">
          <div className="h-full bg-accent" style={{ width: `${(doneCount / Math.max(1, rows.length)) * 100}%` }} />
        </div>
        <ul className="divide-y divide-line">
          {rows.map(({ testSlug, latest, done }) => {
            const test = getTest(testSlug)
            if (!test) return null
            return (
              <li key={testSlug} className="flex items-center gap-3 px-4 py-2.5">
                {done ? (
                  <CircleCheck size={18} className="shrink-0 text-accent-text" aria-label={t('battery.done')} />
                ) : (
                  <Circle size={18} className="shrink-0 text-ink-muted" aria-label={t('battery.open')} />
                )}
                <span className="min-w-0 flex-1">
                  <Link to={`/tests/${testSlug}/details`} className="block truncate text-[14px] font-medium hover:underline">
                    {test.name[locale]}
                  </Link>
                  <span className="block text-[11px] text-ink-muted">
                    {latest ? `${formatResultValue(latest, locale)} · ${formatDate(latest.performedAt, locale)}` : t('testCard.noValue')}
                  </span>
                </span>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/tests/${testSlug}`}>{t('testCard.run')}</Link>
                </Button>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[12px] text-ink-muted">{t('battery.doneWithin', { days: DEFAULT_RETEST_DAYS })}</p>
          <p className="mt-1 text-[12px] text-ink-secondary">{t('battery.startHint')} {t('battery.summary')}</p>
          <Button variant="primary" className="mt-3" onClick={start}>
            <Play size={14} strokeWidth={2.5} aria-hidden />
            {t('battery.start')}
          </Button>
        </div>
      </Panel>
    </>
  )
}
