import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { PLANS, coachMonthlyEur } from '@/data/pricing'
import { formatNumber } from '@/lib/format'

/**
 * Was BASELINE kosten wird.
 *
 * Bewusst als Auskunft und nicht als Kaufabschluss: es gibt keine
 * Zahlungsabwicklung. Der Bildschirm sagt das oben, bevor jemand nach einem
 * Knopf sucht, den es nicht gibt.
 */
export function PricingScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { athletes, role } = useAppData()

  const price = (value: number) =>
    t('pricing.perMonth', { amount: formatNumber(value, locale, 2) })

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/profil">
          <ArrowLeft size={14} aria-hidden />
          {t('nav.profile')}
        </Link>
      </Button>
      <ScreenHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.title')}
        intro={t('pricing.intro')}
      />

      <p
        role="status"
        className="mb-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] leading-relaxed text-ink-secondary"
      >
        {t('pricing.notYet')}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {PLANS.map((plan) => (
          <Panel key={plan.id}>
            <PanelHeader
              title={plan.name[locale]}
              subtitle={
                plan.monthlyEur == null
                  ? t('pricing.onRequest')
                  : plan.monthlyEur === 0
                    ? t('pricing.free')
                    : price(plan.monthlyEur)
              }
            />
            <ul className="space-y-2 px-4 py-3 text-[13px] leading-relaxed">
              {plan.features.map((feature) => (
                <li key={feature.de} className="flex gap-2">
                  <Check size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
                  <span>{feature[locale]}</span>
                </li>
              ))}
            </ul>
            {plan.id === 'coach' && role === 'coach' && (
              <p className="border-t border-line px-4 py-3 text-[13px] text-ink-secondary">
                {t('pricing.yourCoachCost', {
                  count: athletes.length,
                  amount: formatNumber(coachMonthlyEur(athletes.length), locale, 2),
                })}
              </p>
            )}
          </Panel>
        ))}
      </div>

      <Panel className="mt-4">
        <PanelHeader title={t('pricing.promises')} />
        <ul className="space-y-2 px-4 py-3 text-[13px] leading-relaxed">
          <li>{t('pricing.promiseExport')}</li>
          <li>{t('pricing.promiseOffline')}</li>
          <li>{t('pricing.promiseNoAds')}</li>
        </ul>
      </Panel>
    </>
  )
}
