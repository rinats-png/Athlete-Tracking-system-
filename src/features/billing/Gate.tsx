import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useLocale } from '@/features/shared/useLocale'
import { athletePlan, coachTier, type PlanFeature } from '@/data/pricing'
import { smallestPlanWith } from '@/domain/entitlement'
import { pick } from '@/i18n/pick'
import { formatNumber } from '@/lib/format'
import { loadExtra } from '@/i18n'
import { useBilling } from './BillingProvider'

/**
 * Die Schranke.
 *
 * Sie sagt, WOZU das Merkmal gehört («Teil von Plus»), was es kostet, und
 * führt mit einem Tipp zur Preisseite. Sie sagt NICHT «gesperrt», und sie
 * versteckt nichts: der Bildschirm dahinter bleibt als Beschreibung
 * sichtbar, damit klar ist, was man bekommt. Was schon eingetragen ist,
 * bleibt im Bestand und im Export — eine Schranke hält Merkmale zurück,
 * nie Daten (§32).
 *
 * Ohne Bezahlweg (enabled === false) rendert sie nur die Kinder.
 */
export function Gate({ feature, children, compact = false }: { feature: PlanFeature; children: ReactNode; compact?: boolean }) {
  const billing = useBilling()
  if (billing.can(feature)) return <>{children}</>
  return <GateNotice feature={feature} compact={compact} />
}

export function GateNotice({ feature, compact = false }: { feature: PlanFeature; compact?: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { access } = useBilling()
  // Die Merkmalstexte liegen im Zusatzwörterbuch, das sonst der Bildschirm
  // nachlädt — die Schranke steht aber VOR dem Bildschirm.
  const [extraReady, setExtraReady] = useState(false)
  useEffect(() => {
    let alive = true
    void loadExtra().then(() => {
      if (alive) setExtraReady(true)
    })
    return () => {
      alive = false
    }
  }, [])
  const planId = smallestPlanWith(feature, access.role)
  const plan = planId == null ? null : planId.startsWith('coach_') ? coachTier(planId as never) : athletePlan(planId as never)
  const name = plan ? pick(plan.name, locale) : ''
  const price = plan?.yearlyEur != null ? t('billing.perYear', { amount: formatNumber(plan.yearlyEur, locale, 0) }) : plan && 'onceEur' in plan && plan.onceEur != null ? t('billing.once', { amount: formatNumber(plan.onceEur, locale, 0) }) : ''

  if (compact) {
    return (
      <p className="flex items-center gap-2 text-[12px] text-ink-secondary" data-testid={`gate-${feature}`}>
        <Lock size={12} aria-hidden />
        <span>{t('billing.partOf', { plan: name })}</span>
        <Link to={`/preise?plan=${planId ?? ''}`} className="underline underline-offset-2">
          {t('billing.unlock')}
        </Link>
      </p>
    )
  }

  return (
    <Panel float data-testid={`gate-${feature}`}>
      <PanelHeader title={t('billing.partOf', { plan: name })} subtitle={price} />
      <div className="px-4 py-3 text-[13px] leading-relaxed">
        <p className="max-w-[62ch] text-ink-secondary">{extraReady ? t(`pricing.feature.${feature}`) : ''}</p>
        <p className="mt-2 max-w-[62ch] text-ink-muted">{t('billing.dataStays')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="primary" size="sm">
            <Link to={`/preise?plan=${planId ?? ''}`}>{t('billing.unlock')}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/preise">{t('billing.allPlans')}</Link>
          </Button>
        </div>
      </div>
    </Panel>
  )
}
