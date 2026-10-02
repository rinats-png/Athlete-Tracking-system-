import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { deviceTimeZone, parseActivityExport, type ActivitySport, type ImportReport } from '@/domain/activityImport'
import { formatDate, formatNumber } from '@/lib/format'
import { AnalysisTabs } from './AnalysisTabs'

const SPORTS: ActivitySport[] = ['run', 'trail', 'bike', 'strength', 'hike', 'swim', 'other']

/**
 * Läufe (docs/laeufe.md): Stufe 1 — Import. Die Datei wird eingelesen, es wird
 * gezeigt, was erkannt wurde (Quelle, Zeitraum, Einheiten je Sportart, welche
 * Spalte wofür), und erst auf «Übernehmen» landet etwas im Bestand. Alles
 * bleibt auf dem Gerät.
 */
export function RunsScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { activities, importActivities, clearActivities } = useAppData()
  const [report, setReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState(false)
  const [added, setAdded] = useState<number | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const read = (file: File) => {
    void file.text().then((text) => {
      const r = parseActivityExport(text, deviceTimeZone())
      setAdded(null)
      if (!r || r.activities.length === 0) {
        setReport(null)
        setError(true)
        return
      }
      setError(false)
      setReport(r)
    })
  }

  const stored = useMemo(() => {
    if (activities.length === 0) return null
    const counts = Object.fromEntries(SPORTS.map((s) => [s, 0])) as Record<ActivitySport, number>
    for (const a of activities) counts[a.sport]++
    return { counts, first: activities[0].day, last: activities[activities.length - 1].day, withoutHr: activities.filter((a) => a.avgHr == null).length }
  }, [activities])

  const sportLine = (counts: Record<ActivitySport, number>) =>
    SPORTS.filter((s) => counts[s] > 0)
      .map((s) => `${formatNumber(counts[s], locale, 0)} ${t(`runs.sport.${s}`)}`)
      .join(' · ')
  const day = (d: string) => formatDate(`${d}T12:00:00Z`, locale)

  return (
    <>
      <ScreenHeader eyebrow={t('runs.eyebrow')} title={t('runs.title')} intro={t('runs.intro')} />
      <AnalysisTabs active="runs" />

      <Panel className="mb-4" data-testid="runs-import">
        <PanelHeader title={t('runs.import.title')} subtitle={t('runs.import.why')} />
        <div className="px-4 py-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-line bg-glass px-4 py-2 text-[13px] hover:bg-glass-strong">
            <Upload size={16} aria-hidden />
            {t('runs.import.choose')}
            <input type="file" accept=".csv,text/csv" className="sr-only" data-testid="runs-file" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
          </label>
          <p className="mt-2 text-[11px] text-ink-muted">{t('runs.import.formats')}</p>
          {error && <p className="mt-3 text-[13px] text-warning" role="alert" data-testid="runs-error">{t('runs.import.unreadable')}</p>}
        </div>

        {report && (
          <div className="border-t border-line px-4 py-3 text-[13px]" data-testid="runs-preview">
            <span className="label-tag">{t('runs.preview.title')}</span>
            <p className="mt-1.5" data-testid="runs-source">
              {t('runs.preview.source', { source: t(`runs.source.${report.source}`), tz: report.timeZone })}
            </p>
            <p data-testid="runs-period">{t('runs.preview.period', { from: day(report.firstDay!), to: day(report.lastDay!), n: formatNumber(report.activities.length, locale, 0) })}</p>
            <p data-testid="runs-sports">{sportLine(report.countsBySport)}</p>
            <p className="mt-2 text-[12px] text-ink-secondary" data-testid="runs-columns">
              {report.columns.map((c) => `${t(`runs.role.${c.role}`)}: «${c.header}»${c.note ? ` (${c.note})` : ''}`).join(' · ')}
            </p>
            {report.withoutHr > 0 && <p className="mt-1 text-[12px] text-ink-muted">{t('runs.preview.noHr', { n: formatNumber(report.withoutHr, locale, 0) })}</p>}
            {report.skipped > 0 && <p className="mt-1 text-[12px] text-ink-muted">{t('runs.preview.skipped', { n: formatNumber(report.skipped, locale, 0) })}</p>}
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                data-testid="runs-apply"
                onClick={() => {
                  setAdded(importActivities(report.activities))
                  setReport(null)
                }}
              >
                {t('runs.preview.apply')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReport(null)}>
                {t('actions.cancel')}
              </Button>
            </div>
          </div>
        )}
        {added != null && (
          <p className="border-t border-line px-4 py-3 text-[13px]" role="status" data-testid="runs-added">
            {added > 0 ? t('runs.added', { count: added }) : t('runs.addedNone')}
          </p>
        )}
      </Panel>

      <Panel className="mb-4" data-testid="runs-stored">
        <PanelHeader title={t('runs.stored.title')} subtitle={stored ? t('runs.stored.period', { from: day(stored.first), to: day(stored.last), n: formatNumber(activities.length, locale, 0) }) : t('runs.stored.empty')} />
        {stored && (
          <div className="px-4 py-3 text-[13px]">
            <p data-testid="runs-stored-sports">{sportLine(stored.counts)}</p>
            {stored.withoutHr > 0 && <p className="mt-1 text-[12px] text-ink-muted">{t('runs.preview.noHr', { n: formatNumber(stored.withoutHr, locale, 0) })}</p>}
            <p className="mt-2 text-[11px] text-ink-muted">{t('runs.stored.local')}</p>
            <div className="mt-3">
              {confirmClear ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" data-testid="runs-clear-confirm" onClick={() => { clearActivities(); setConfirmClear(false) }}>
                    {t('runs.stored.clearConfirm')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                    {t('actions.cancel')}
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" data-testid="runs-clear" onClick={() => setConfirmClear(true)}>
                  {t('runs.stored.clear')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Panel>
    </>
  )
}
