import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { ageAllows, hasConsent } from '@/domain/health'
import { HEALTH_MIN_AGE } from '@/lib/store/schema'
import { ConsentPanel } from './ConsentPanel'
import { KeyPanel } from './KeyPanel'
import { LabPanel } from './LabPanel'
import { CyclePanel, SelfImagePanel, SymptomPanel } from './DailyPanels'
import { MedsPanel } from './MedsPanel'
import { PhotoPanel } from './PhotoPanel'
import { EnergyPanel } from './EnergyPanel'

/**
 * Die Gesundheitsschicht (S5).
 *
 * DREI TORE STEHEN VOR DIESEM BILDSCHIRM, und jedes hat einen anderen Grund:
 *
 *   1. DIE STUFE (Elite) — eine Bezahlschranke wie jede andere, gesetzt an
 *      der Route.
 *   2. DAS ALTER (ab 18) — hier. Die Einwilligung Erziehungsberechtigter in
 *      Art.-9-Daten ist eine Frage, die diese App nicht beantworten muss,
 *      wenn sie sie vermeidet. Im Nachwuchsbereich braucht niemand
 *      Blutwert-Tracking in einer Sport-App.
 *   3. DIE EINWILLIGUNG JE KATEGORIE — im ConsentPanel. Ohne Haken erscheint
 *      der Abschnitt gar nicht.
 *
 * Und eine Aussage, die über allem steht: Die App speichert und zeigt. Sie
 * erkennt nichts, stuft nichts ein, warnt nicht und sagt nichts voraus.
 */
export function HealthScreen() {
  const { t } = useTranslation()
  const { data, health } = useAppData()
  const allowed = ageAllows(data.profile.birthDate)

  return (
    <>
      <ScreenHeader eyebrow={t('health.eyebrow')} title={t('health.title')} intro={t('health.intro')} />

      <p role="note" className="mb-4 border-l-2 border-line-strong px-3 py-2 text-[13px] leading-relaxed text-ink-secondary" data-testid="health-scope">
        {t('health.scope')}
      </p>

      {!allowed ? (
        <Panel data-testid="health-age-gate">
          <PanelHeader title={t('health.age.title')} subtitle={t('health.age.subtitle', { age: HEALTH_MIN_AGE })} />
          <div className="px-4 py-3 text-[13px] leading-relaxed">
            <p className="max-w-[62ch] text-ink-secondary">{data.profile.birthDate ? t('health.age.tooYoung', { age: HEALTH_MIN_AGE }) : t('health.age.noBirthDate')}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/profil">{t('nav.profile')}</Link>
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="space-y-4">
          <ConsentPanel />
          <KeyPanel />
          {hasConsent(health, 'lab') && <LabPanel />}
          {hasConsent(health, 'symptoms') && <SymptomPanel />}
          {hasConsent(health, 'cycle') && <CyclePanel />}
          {hasConsent(health, 'selfImage') && <SelfImagePanel />}
          {hasConsent(health, 'meds') && <MedsPanel />}
          {hasConsent(health, 'photos') && <PhotoPanel />}
          <EnergyPanel />
          <Panel>
            <div className="px-4 py-3">
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t('health.toPeak')}</p>
              <Button asChild variant="ghost" size="sm" className="mt-1 -ml-3">
                <Link to="/peakweek">
                  {t('peak.title')}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </>
  )
}
