import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Printer } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { progressOf, runPlan, stationForGroup } from '@/domain/testDay'
import { procedureFor } from '@/data/testProcedure'
import { formatDate } from '@/lib/format'
import type { AppLocale } from '@/types/domain'
import type { StoredTestDay } from '@/lib/store/localStore'

/**
 * Ein Testtag in der Durchführung.
 *
 * Drei Dinge, in der Reihenfolge, in der sie gebraucht werden: der Laufplan
 * (wer steht wann wo), die Stationsblätter fürs Klemmbrett, und je Station
 * der Weg in die Erfassung.
 *
 * Die Stationsblätter tragen die Durchführungsvorschrift mit — an der
 * Station steht oft nicht der, der den Test ausgesucht hat, und «drei
 * Versuche mit voller Pause» entscheidet darüber, ob am Ende Schnelligkeit
 * oder Ermüdung gemessen wurde.
 */
export function TestDayDetailScreen() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const { role, athletes, testDays, saveTestDay, deleteTestDay } = useAppData()

  const day = testDays.find((d) => d.id === id) ?? null
  const plan = useMemo(() => (day ? runPlan(day) : null), [day])
  const progress = useMemo(() => (day ? progressOf(day, athletes) : []), [day, athletes])

  const nameOf = (athleteId: string) => {
    const athlete = athletes.find((a) => a.id === athleteId)
    return athlete?.name || athlete?.profile.firstName || athleteId
  }

  if (role !== 'coach' || !day || !plan) {
    return (
      <>
        <BackLink />
        <EmptyState title={t('testDay.title')} body={t('testDay.notFound')} />
      </>
    )
  }

  return (
    <>
      <div className="no-print">
        <BackLink />
      </div>
      <ScreenHeader
        eyebrow={formatDate(day.plannedOn, locale)}
        title={day.title || t('testDay.title')}
        intro={t('testDay.duration', { minutes: plan.totalMinutes })}
        action={
          <Button variant="primary" className="no-print" onClick={() => window.print()}>
            <Printer size={14} aria-hidden />
            {t('testDay.sheets')}
          </Button>
        }
      />

      {/* --- Laufplan ------------------------------------------------- */}
      <Panel className="mb-4">
        <PanelHeader title={t('testDay.plan')} subtitle={t('testDay.planHint')} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-tag px-3 py-2 font-semibold">{t('testDay.round')}</th>
                {plan.groups.map((group, i) => (
                  <th key={i} className="label-tag px-3 py-2 font-semibold">
                    {t('testDay.group', { n: i + 1 })}
                    <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">
                      {group.map(nameOf).join(', ') || '—'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.stations.map((_, roundIndex) => {
                const round = roundIndex + 1
                return (
                  <tr key={round} className="border-b border-line/60">
                    <td className="px-3 py-2">
                      <span className="readout">{round}</span>
                      <span className="ml-2 text-[11px] text-ink-muted">
                        {t('testDay.fromMinute', { minutes: roundIndex * day.stationMinutes })}
                      </span>
                    </td>
                    {plan.groups.map((_, groupIndex) => {
                      const station = stationForGroup(plan, groupIndex + 1, round)
                      return (
                        <td key={groupIndex} className="px-3 py-2">
                          {station ? getTest(station.slug)?.shortName[locale] ?? station.slug : '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* --- Bedingungen des Tages ------------------------------------- */}
      <Panel className="mb-4 no-print">
        <PanelHeader title={t('testDay.conditions')} subtitle={t('testDay.conditionsHint')} />
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-3">
          <label className="text-[13px]">
            <span className="label-tag">{t('testDay.surface')}</span>
            <input
              type="text"
              value={day.conditions.surface}
              onChange={(e) =>
                saveTestDay({ ...day, conditions: { ...day.conditions, surface: e.target.value } })
              }
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
            />
          </label>
          <label className="text-[13px]">
            <span className="label-tag">{t('testDay.temperature')}</span>
            <input
              type="number"
              min={-30}
              max={55}
              value={day.conditions.temperatureC ?? ''}
              onChange={(e) =>
                saveTestDay({
                  ...day,
                  conditions: {
                    ...day.conditions,
                    temperatureC: e.target.value === '' ? null : Number(e.target.value),
                  },
                })
              }
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
            />
          </label>
          <label className="text-[13px]">
            <span className="label-tag">{t('testDay.equipmentField')}</span>
            <input
              type="text"
              value={day.conditions.equipment}
              onChange={(e) =>
                saveTestDay({ ...day, conditions: { ...day.conditions, equipment: e.target.value } })
              }
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
            />
          </label>
        </div>
        <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">
          {day.conditions.surface || day.conditions.equipment || day.conditions.temperatureC != null
            ? t('testDay.conditionsApplied')
            : t('testDay.conditionsMissing')}
        </p>
      </Panel>

      {/* --- Stationen mit Fortschritt --------------------------------- */}
      <Panel className="mb-4 no-print">
        <PanelHeader title={t('testDay.stations')} subtitle={t('testDay.sheetsHint')} />
        <ul className="divide-y divide-line">
          {plan.stations.map((station) => {
            const state = progress.find((p) => p.slug === station.slug)
            const done = state != null && state.planned > 0 && state.measured === state.planned
            return (
              <li key={station.slug} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[14px] font-medium">
                    <span className="readout mr-2">{station.number}</span>
                    {getTest(station.slug)?.name[locale] ?? station.slug}
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    {t('testDay.progress')}:{' '}
                    {t('testDay.progressOf', {
                      measured: state?.measured ?? 0,
                      planned: state?.planned ?? 0,
                    })}
                  </p>
                </div>
                <Button asChild variant={done ? 'ghost' : 'outline'} size="sm">
                  <Link to={`/trainer/gruppentest?test=${station.slug}&tag=${day.plannedOn}`}>
                    {done && <Check size={14} aria-hidden />}
                    {t('testDay.capture')}
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-line px-4 py-3">
          {day.completedAt ? (
            <p className="text-[13px] text-ink-secondary">
              {t('testDay.completed', { date: formatDate(day.completedAt, locale) })}
            </p>
          ) : (
            <>
              <p className="text-[12px] text-ink-muted">{t('testDay.incomplete')}</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={() => saveTestDay({ ...day, completedAt: new Date().toISOString() })}
              >
                {t('testDay.complete')}
              </Button>
            </>
          )}
        </div>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[12px] text-ink-muted">{t('testDay.deleteHint')}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 min-w-11 justify-center"
            onClick={() => deleteTestDay(day.id)}
          >
            {t('testDay.delete')}
          </Button>
        </div>
      </Panel>

      {/* --- Stationsblätter, nur im Druck ----------------------------- */}
      <div className="hidden print:block">
        {plan.stations.map((station) => (
          <StationSheet
            key={station.slug}
            day={day}
            number={station.number}
            slug={station.slug}
            names={day.athleteIds.map(nameOf)}
            locale={locale}
          />
        ))}
      </div>
    </>
  )
}

/**
 * Ein Blatt je Station, für das Klemmbrett.
 *
 * Mit der Durchführungsvorschrift auf dem Blatt: an der Station steht oft
 * nicht derjenige, der den Test ausgewählt hat.
 */
function StationSheet({
  day,
  number,
  slug,
  names,
  locale,
}: {
  day: StoredTestDay
  number: number
  slug: string
  names: string[]
  locale: AppLocale
}) {
  const { t } = useTranslation()
  const test = getTest(slug)
  if (!test) return null
  const { procedure } = procedureFor(test)

  return (
    <section className="break-after-page px-2 py-4">
      <p className="readout text-[10px] tracking-[0.2em] uppercase">
        {day.title || t('testDay.title')} · {day.plannedOn}
      </p>
      <h2 className="font-display mt-1 text-[22px] font-bold">
        {t('testDay.sheetTitle', { n: number, test: test.name[locale] })}
      </h2>
      <p className="mt-1 text-[12px]">{test.equipment[locale]}</p>

      <dl className="mt-3 border-t border-line pt-2 text-[11px] leading-relaxed">
        <dt className="font-semibold">{t('procedure.attempts')}</dt>
        <dd className="mb-1">{procedure.attempts[locale]}</dd>
        <dt className="font-semibold">{t('procedure.valid')}</dt>
        <dd>{procedure.valid.map((v) => v[locale]).join(' ')}</dd>
      </dl>

      <table className="mt-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-black/60 text-left">
            <th className="py-1.5 pr-2">{t('testDay.participants')}</th>
            <th className="w-32 py-1.5 pr-2">
              {t('testDay.sheetValue')} ({test.primaryUnit})
            </th>
            <th className="py-1.5">{t('testDay.sheetNote')}</th>
          </tr>
        </thead>
        <tbody>
          {names.map((name, i) => (
            <tr key={i} className="border-b border-black/20">
              <td className="py-3 pr-2">{name}</td>
              <td className="py-3 pr-2" />
              <td className="py-3" />
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
      <Link to="/trainer/testtag">
        <ArrowLeft size={14} aria-hidden />
        {t('testDay.plural')}
      </Link>
    </Button>
  )
}
