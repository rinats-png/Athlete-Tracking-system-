import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { TEST_BATTERIES } from '@/data/testBatteries'
import { getTest } from '@/data/testCatalog'
import { runPlan } from '@/domain/testDay'
import { formatDate } from '@/lib/format'
import { pick } from '@/i18n/pick'

/**
 * Testtage anlegen und wiederfinden.
 *
 * DER GRUND, WARUM ES DIESEN BILDSCHIRM GIBT: der schwierigste Teil eines
 * Testtags ist nicht das Messen, sondern die Organisation davor — fünfzehn
 * Leute, fünf Stationen, zwei Stunden Hallenzeit. Wer das auf Papier plant,
 * pflegt danach zwei Wahrheiten.
 */
export function TestDayScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { role, athletes, testDays, saveTestDay } = useAppData()

  const roster = useMemo(() => athletes.filter((a) => !a.archived), [athletes])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [plannedOn, setPlannedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [batterySlug, setBatterySlug] = useState('')
  const [picked, setPicked] = useState<string[]>(() => roster.map((a) => a.id))
  const [stationMinutes, setStationMinutes] = useState(20)

  const battery = TEST_BATTERIES.find((b) => b.slug === batterySlug) ?? null
  const stations = battery?.testSlugs ?? []
  const canCreate = stations.length > 0 && picked.length > 0

  const create = () => {
    if (!canCreate) return
    const id = newId()
    saveTestDay({
      id,
      title: title.trim(),
      plannedOn,
      batterySlug: battery?.slug ?? null,
      testSlugs: stations,
      athleteIds: picked,
      stationMinutes,
      conditions: { surface: '', temperatureC: null, equipment: '' },
      createdAt: new Date().toISOString(),
      completedAt: null,
    })
    setOpen(false)
    setTitle('')
  }

  if (role !== 'coach') {
    return (
      <>
        <BackLink />
        <EmptyState title={t('testDay.plural')} body={t('testDay.needCoach')} />
      </>
    )
  }

  return (
    <>
      <BackLink />
      <ScreenHeader
        eyebrow={t('coachDash.title')}
        title={t('testDay.plural')}
        intro={t('testDay.intro')}
        action={
          <Button variant="primary" onClick={() => setOpen((v) => !v)}>
            <Plus size={14} aria-hidden />
            {t('testDay.new')}
          </Button>
        }
      />

      {open && (
        <Panel className="mb-4">
          <PanelHeader title={t('testDay.new')} />
          <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
            <label className="text-[13px]">
              <span className="label-tag">{t('testDay.name')}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
              />
            </label>
            <label className="text-[13px]">
              <span className="label-tag">{t('testDay.date')}</span>
              <input
                type="date"
                value={plannedOn}
                onChange={(e) => setPlannedOn(e.target.value)}
                className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
              />
            </label>
            <label className="text-[13px]">
              <span className="label-tag">{t('testDay.battery')}</span>
              <select
                value={batterySlug}
                onChange={(e) => setBatterySlug(e.target.value)}
                className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
              >
                <option value="">{t('testDay.batteryFree')}</option>
                {TEST_BATTERIES.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {pick(b.name, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px]">
              <span className="label-tag">{t('testDay.stationMinutes')}</span>
              <input
                type="number"
                min={5}
                max={120}
                value={stationMinutes}
                onChange={(e) => setStationMinutes(Number(e.target.value) || 20)}
                className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
              />
            </label>
          </div>

          <div className="border-t border-line px-4 py-3">
            <span className="label-tag">{t('testDay.participants')}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {roster.map((athlete) => {
                const on = picked.includes(athlete.id)
                return (
                  <label
                    key={athlete.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-[13px] ${on ? 'border-[var(--line-strong)]' : 'border-line text-ink-secondary'}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPicked((prev) =>
                          prev.includes(athlete.id)
                            ? prev.filter((id) => id !== athlete.id)
                            : [...prev, athlete.id],
                        )
                      }
                    />
                    {athlete.name || athlete.profile.firstName || athlete.id}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="border-t border-line px-4 py-3">
            {stations.length === 0 ? (
              <p className="text-[12px] text-ink-muted">{t('testDay.needStations')}</p>
            ) : (
              <p className="text-[12px] text-ink-secondary">
                {stations.map((slug) => pick(getTest(slug)?.shortName, locale) ?? slug).join(' · ')}
              </p>
            )}
            {picked.length === 0 && (
              <p className="mt-1 text-[12px] text-ink-muted">{t('testDay.needParticipants')}</p>
            )}
            <Button variant="primary" className="mt-3" disabled={!canCreate} onClick={create}>
              {t('testDay.create')}
            </Button>
          </div>
        </Panel>
      )}

      {testDays.length === 0 ? (
        <EmptyState title={t('testDay.plural')} body={t('testDay.none')} />
      ) : (
        <Panel>
          <PanelHeader title={t('testDay.plural')} />
          <ul className="divide-y divide-line">
            {[...testDays]
              .sort((a, b) => b.plannedOn.localeCompare(a.plannedOn))
              .map((day) => {
                const plan = runPlan(day)
                return (
                  <li key={day.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-[14px] font-medium">
                        {day.title || formatDate(day.plannedOn, locale)}
                      </p>
                      <p className="text-[12px] text-ink-muted">
                        {formatDate(day.plannedOn, locale)} ·{' '}
                        {t('testDay.stations')}: {plan.stations.length} ·{' '}
                        {t('testDay.participants')}: {day.athleteIds.length}
                        {day.completedAt
                          ? ` · ${t('testDay.completed', { date: formatDate(day.completedAt, locale) })}`
                          : ''}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/trainer/testtag/${day.id}`}>{t('testDay.open')}</Link>
                    </Button>
                  </li>
                )
              })}
          </ul>
        </Panel>
      )}
    </>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
      <Link to="/trainer">
        <ArrowLeft size={14} aria-hidden />
        {t('coachDash.title')}
      </Link>
    </Button>
  )
}
