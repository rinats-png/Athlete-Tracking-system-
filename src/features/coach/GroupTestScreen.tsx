import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { TEST_CATALOG, getTest } from '@/data/testCatalog'
import { groupStats, MIN_FOR_SPREAD } from '@/domain/groupStats'
import { formatNumber } from '@/lib/format'

/**
 * Ein Test, alle Athleten nacheinander (Konzept §37).
 *
 * DER GRUND, WARUM ES DIESEN BILDSCHIRM GIBT: ein Trainer testet fünfzehn
 * Leute an einer Station, mit dem Klemmbrett in der Hand. Müsste er dafür je
 * Athlet die App umschalten, macht er es nicht — er schreibt auf Papier und
 * tippt es abends in Excel. Genau dort bleibt er dann auch.
 *
 * Deshalb: Station wählen, dann eine Zeile je Person, ein Feld, weiter. Kein
 * Wechsel des aktiven Athleten, kein Formular je Person, kein Termin je
 * Person. Erst am Ende ein einziger Schreibvorgang — und danach steht die
 * Gruppenauswertung da.
 */
export function GroupTestScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { role, athletes, recordForGroup } = useAppData()

  const [slug, setSlug] = useState('')
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState<Record<string, number | null>>({})
  const [written, setWritten] = useState<number | null>(null)

  const test = slug ? getTest(slug) : undefined
  const active = useMemo(() => athletes.filter((a) => !a.archived), [athletes])
  const stats = useMemo(
    () => (written != null && slug ? groupStats(athletes, slug, day) : null),
    [written, athletes, slug, day],
  )

  if (role !== 'coach') {
    return (
      <EmptyState
        title={t('group.soloTitle')}
        body={t('group.soloBody')}
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/profil">{t('coachDash.switchMode')}</Link>
          </Button>
        }
      />
    )
  }

  const filled = Object.values(entries).filter((v) => v != null).length

  const save = () => {
    if (!test) return
    const performedAt = new Date(`${day}T12:00:00`).toISOString()
    // Die Werte stehen in derselben Reihenfolge wie `athletes` — die Aktion
    // schreibt athletenweise in EINEM Vorgang.
    const values = athletes.map((athlete) => {
      const value = entries[athlete.id]
      return value == null ? {} : { [test.primaryMetric]: value }
    })
    setWritten(recordForGroup(test.slug, performedAt, values))
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/trainer">
          <ArrowLeft size={14} aria-hidden />
          {t('coachDash.title')}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('coachDash.title')} title={t('group.title')} intro={t('group.intro')} />

      <Panel>
        <PanelHeader title={t('group.station')} subtitle={t('group.stationHint')} />
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <label className="block">
            <span className="label-tag">{t('table.test')}</span>
            <select
              className="mt-1 min-h-11 w-full border border-line bg-surface px-2 text-[14px]"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setEntries({})
                setWritten(null)
              }}
            >
              <option value="">{t('group.chooseTest')}</option>
              {TEST_CATALOG.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry.name[locale]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-tag">{t('group.day')}</span>
            <input
              type="date"
              className="mt-1 min-h-11 w-full border border-line bg-surface px-2 text-[16px]"
              value={day}
              onChange={(e) => {
                setDay(e.target.value)
                setWritten(null)
              }}
            />
          </label>
        </div>
      </Panel>

      {test && active.length === 0 && (
        <Panel className="mt-4">
          <p className="px-4 py-6 text-[14px] text-ink-secondary">{t('group.noAthletes')}</p>
        </Panel>
      )}

      {test && active.length > 0 && written == null && (
        <Panel className="mt-4">
          <PanelHeader
            title={`${test.name[locale]} · ${test.primaryUnit}`}
            subtitle={t('group.rowHint')}
          />
          <ul className="divide-y divide-line">
            {active.map((athlete) => (
              <li key={athlete.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-2/5 min-w-0 truncate text-[14px]">
                  {athlete.name || t('group.unnamed')}
                </span>
                <div className="flex-1">
                  <NumberField
                    label={athlete.name || t('group.unnamed')}
                    unit={test.primaryUnit}
                    value={entries[athlete.id] ?? null}
                    onChange={(value) =>
                      setEntries((current) => ({ ...current, [athlete.id]: value }))
                    }
                    step={0.1}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
            <Button onClick={save} disabled={filled === 0}>
              <Check size={15} aria-hidden />
              {t('group.save', { count: filled })}
            </Button>
            <span className="text-[13px] text-ink-muted">
              {t('group.progress', { filled, total: active.length })}
            </span>
          </div>
        </Panel>
      )}

      {written != null && stats && (
        <Panel className="mt-4">
          <PanelHeader title={t('group.result')} subtitle={t('group.resultHint')} />
          <div className="px-4 py-4">
            <p role="status" className="text-[14px] text-good">
              {t('group.written', { count: written })}
            </p>
            <dl className="mt-3 space-y-1 text-[14px]">
              <Row label={t('group.median')} value={fmt(stats.median, locale)} />
              <Row label={t('group.best')} value={fmt(stats.best, locale)} />
              <Row label={t('group.worst')} value={fmt(stats.worst, locale)} />
              <Row
                label={t('group.spread')}
                value={
                  stats.q1 == null || stats.q3 == null
                    ? t('group.spreadTooFew', { count: MIN_FOR_SPREAD })
                    : `${fmt(stats.q1, locale)} – ${fmt(stats.q3, locale)}`
                }
              />
              <Row
                label={t('group.measured')}
                value={t('group.ofTotal', { measured: stats.measured, total: stats.total })}
              />
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{t('group.caveat')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setWritten(null)}>
              {t('group.nextStation')}
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

const fmt = (value: number | null, locale: 'de' | 'en') =>
  value == null ? '—' : formatNumber(value, locale, 2)

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="readout text-right">{value}</dd>
    </div>
  )
}
