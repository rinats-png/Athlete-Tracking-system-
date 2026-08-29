import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { DeltaBadge } from '@/components/ui/DeltaBadge'
import { formatDate, formatMeasurement, type UnitSystem } from '@/lib/format'
import type { AppLocale, TestSummary } from '@/types/domain'

export function RecentTests({
  tests,
  locale,
  units = 'metric',
}: {
  tests: TestSummary[]
  locale: AppLocale
  units?: UnitSystem
}) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="label-tag px-4 py-2 font-semibold">{t('table.test')}</th>
            <th className="label-tag py-2 pr-3 font-semibold">{t('table.date')}</th>
            <th className="label-tag py-2 pr-3 text-right font-semibold">{t('table.result')}</th>
            <th className="label-tag py-2 pr-3 text-right font-semibold">{t('table.change')}</th>
            <th className="label-tag py-2 pr-4 text-right font-semibold">{t('table.rpe')}</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => {
            const measurement = formatMeasurement(test.value, test.unit, locale, units)
            const derived = Object.entries(test.derived)[0]

            return (
              <tr key={test.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{test.name}</span>
                    {test.isPersonalBest && (
                      <span
                        title={t('badges.personalBest')}
                        className="inline-flex items-center gap-1 text-accent-text"
                      >
                        <Star size={12} fill="currentColor" strokeWidth={0} aria-hidden />
                        <span className="sr-only">{t('badges.personalBest')}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-muted">
                    {t(`dimensions.${test.dimension}`)}
                    {derived && (
                      <>
                        {' · '}
                        <span className="readout">
                          {derived[1].value} {derived[1].unit}
                        </span>
                      </>
                    )}
                  </span>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap text-ink-secondary">
                  {formatDate(test.performedAt, locale)}
                </td>
                <td className="readout py-2.5 pr-3 text-right whitespace-nowrap">
                  {measurement.value}
                  {measurement.unit && (
                    <span className="ml-1 text-[11px] text-ink-muted">{measurement.unit}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <DeltaBadge
                    value={test.deltaPercent}
                    locale={locale}
                    invert={test.direction === 'lower_is_better'}
                    className="justify-end"
                  />
                </td>
                <td className="readout py-2.5 pr-4 text-right text-ink-secondary">
                  {test.rpe ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
