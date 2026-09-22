import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Lock } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { useAppData } from '@/lib/store/AppDataProvider'
import { allConsents, entryCount, grantConsent, withdrawConsent } from '@/domain/health'
import { HEALTH_CONSENT_VERSION, type HealthCategory } from '@/lib/store/schema'
import { cn } from '@/lib/utils'

/**
 * Einwilligung je Kategorie — der Eingang zur Gesundheitsschicht.
 *
 * DREI DINGE, DIE HIER ANDERS SIND als bei jedem anderen Schalter der App:
 *
 *   1. OHNE HAKEN IST DIE KATEGORIE NICHT DA, nicht ausgegraut. Der
 *      Bildschirm dahinter erscheint gar nicht erst — eine gesperrte
 *      Eingabemaske wäre eine Einladung, die Einwilligung als Formalie zu
 *      behandeln.
 *   2. DER WIDERRUF LÖSCHT SOFORT. Er sagt vorher, wie viele Einträge
 *      verschwinden, und danach sind sie weg. Nicht ausgeblendet: weg.
 *   3. DIE FASSUNG ZÄHLT MIT. Ändert sich der Text, gilt die alte Zustimmung
 *      nicht weiter — die App fragt erneut.
 */
export function ConsentPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, updateHealth } = useAppData()
  const [confirming, setConfirming] = useState<HealthCategory | null>(null)
  const rows = allConsents(health)

  return (
    <Panel ticked data-testid="health-consent">
      <PanelHeader title={t('health.consent.title')} subtitle={t('health.consent.subtitle', { version: HEALTH_CONSENT_VERSION })} />
      <div className="px-4 py-3">
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">{t('health.consent.intro')}</p>
        <ul className="mt-3 divide-y divide-line">
          {rows.map((row) => {
            const count = entryCount(health, row.category)
            const granted = row.state === 'granted'
            return (
              <li key={row.category} className="py-3" data-testid={`consent-${row.category}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[14px]">
                      {granted ? <Check size={15} className="shrink-0 text-accent-text" aria-hidden /> : <Lock size={14} className="shrink-0 text-ink-muted" aria-hidden />}
                      {t(`health.categories.${row.category}`)}
                    </p>
                    <p className="mt-0.5 max-w-[56ch] text-[12px] leading-relaxed text-ink-muted">{t(`health.consentText.${row.category}`)}</p>
                    <p className="mt-1 text-[12px] text-ink-secondary">
                      {row.state === 'granted' && t('health.consent.granted', { date: formatDate(row.grantedAt!, locale) })}
                      {row.state === 'missing' && t('health.consent.missing')}
                      {row.state === 'withdrawn' && t('health.consent.withdrawn')}
                      {row.state === 'outdated' && t('health.consent.outdated')}
                    </p>
                  </div>
                  {granted ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirming(confirming === row.category ? null : row.category)}
                    >
                      {t('health.consent.withdraw')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => updateHealth((h) => grantConsent(h, row.category, new Date().toISOString()))}
                    >
                      {t('health.consent.grant')}
                    </Button>
                  )}
                </div>
                {confirming === row.category && (
                  <div className={cn('mt-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-relaxed')} role="alert">
                    <p>{t('health.consent.confirm', { count })}</p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          updateHealth((h) => withdrawConsent(h, row.category, new Date().toISOString()))
                          setConfirming(null)
                        }}
                      >
                        {t('health.consent.confirmYes')}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                        {t('actions.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-3 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('health.consent.local')}</p>
      </div>
    </Panel>
  )
}
