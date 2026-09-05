import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import {
  COACH_TIERS,
  INSTITUTION_PROFILES,
  REPORT_BUNDLES,
  buildEnquiryText,
  coachTierFor,
  perAthleteEur,
  pricePerReportEur,
  savingPercent,
  ENQUIRY_EMAIL,
  type InstitutionTrack,
} from '@/data/pricing'
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
  const eur = (value: number, digits = 2) => formatNumber(value, locale, digits)
  const tier = coachTierFor(athletes.length)

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

      {/* --- Reports ------------------------------------------------------ */}
      <h2 className="font-display mb-1 text-[19px] font-bold">{t('pricing.reportsTitle')}</h2>
      <p className="mb-3 max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">
        {t('pricing.reportsIntro')} {t('pricing.reportsWhy')}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {REPORT_BUNDLES.map((bundle) => (
          <Panel key={bundle.id} float={bundle.id === 'four'}>
            <PanelHeader
              title={bundle.name[locale]}
              subtitle={t('pricing.bundlePrice', { amount: eur(bundle.priceEur) })}
            />
            <div className="px-4 py-3 text-[13px] leading-relaxed">
              <p className="readout tabular-nums">
                {t('pricing.perReport', { amount: eur(pricePerReportEur(bundle)) })}
              </p>
              {savingPercent(bundle) > 0 && (
                <p className="mt-1 text-ink-secondary">
                  {t('pricing.saving', { percent: savingPercent(bundle) })}
                </p>
              )}
            </div>
          </Panel>
        ))}
      </div>

      {/* --- Trainer ------------------------------------------------------ */}
      <h2 className="font-display mt-8 mb-1 text-[19px] font-bold">{t('pricing.coachTitle')}</h2>
      <p className="mb-3 max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">
        {t('pricing.coachIntro')}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {COACH_TIERS.map((coach) => (
          <Panel key={coach.id}>
            <PanelHeader
              title={coach.name[locale]}
              subtitle={t('pricing.perMonth', { amount: eur(coach.monthlyEur) })}
            />
            <div className="px-4 py-3 text-[13px] leading-relaxed">
              <p>{t('pricing.athleteSlots', { count: coach.athletes })}</p>
              <p className="readout mt-1 tabular-nums text-ink-secondary">
                {t('pricing.perAthlete', { amount: eur(perAthleteEur(coach)) })}
              </p>
            </div>
          </Panel>
        ))}
      </div>
      {role === 'coach' && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
          {tier
            ? t('pricing.yourTier', {
                count: athletes.length,
                tier: tier.name[locale],
                amount: eur(tier.monthlyEur),
              })
            : t('pricing.yourTierNone', { count: athletes.length })}
        </p>
      )}

      {/* --- Vereine und Einrichtungen ------------------------------------ */}
      <h2 className="font-display mt-8 mb-1 text-[19px] font-bold">
        {t('pricing.institutionTitle')}
      </h2>
      <p className="mb-3 max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">
        {t('pricing.institutionIntro')} {t('pricing.institutionNoJudgement')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {INSTITUTION_PROFILES.map((profile) => (
          <Panel key={profile.track}>
            <PanelHeader title={profile.name[locale]} subtitle={t('pricing.onRequestShort')} />
            <ul className="space-y-2 px-4 py-3 text-[13px] leading-relaxed">
              {profile.criteria.map((criterion) => (
                <li key={criterion.de} className="flex gap-2">
                  <Check size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
                  <span>{criterion[locale]}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <EnquiryForm />

      <Panel className="mt-8">
        <PanelHeader title={t('pricing.promises')} />
        <ul className="space-y-2 px-4 py-3 text-[13px] leading-relaxed">
          <li>{t('pricing.promiseExport')}</li>
          <li>{t('pricing.promiseOffline')}</li>
          <li>{t('pricing.promiseNoExpiry')}</li>
          <li>{t('pricing.promiseNoAds')}</li>
        </ul>
      </Panel>
    </>
  )
}

/**
 * Die Anfrage.
 *
 * Sie verschickt nichts. Die App hat keinen Server, an den sie senden könnte,
 * und ein Formular, das nur so tut, als ginge etwas raus, wäre schlimmer als
 * gar keins. Stattdessen entsteht ein Text, den der Absender sieht, bevor er
 * ihn kopiert — damit ist erkennbar, was preisgegeben wird. Über einzelne
 * Athleten steht darin nichts (§50).
 */
function EnquiryForm() {
  const { t } = useTranslation()
  const locale = useLocale()
  const [track, setTrack] = useState<InstitutionTrack>('nonprofit')
  const [organisation, setOrganisation] = useState('')
  const [athletes, setAthletes] = useState('')
  const [coaches, setCoaches] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)

  const toCount = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  const text = useMemo(
    () =>
      buildEnquiryText(
        { track, organisation, athletes: toCount(athletes), coaches: toCount(coaches), note },
        locale,
      ),
    [track, organisation, athletes, coaches, note, locale],
  )

  const field = 'w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]'

  return (
    <Panel className="mt-4">
      <PanelHeader title={t('pricing.enquiryTitle')} subtitle={t('pricing.enquiryIntro')} />
      <div className="space-y-3 px-4 py-4">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="label-tag mb-1">{t('pricing.institutionTitle')}</legend>
          {INSTITUTION_PROFILES.map((profile) => (
            <Button
              key={profile.track}
              type="button"
              size="sm"
              variant={track === profile.track ? 'primary' : 'outline'}
              aria-pressed={track === profile.track}
              onClick={() => {
                setTrack(profile.track)
                setCopied(false)
              }}
            >
              {profile.name[locale]}
            </Button>
          ))}
        </fieldset>

        <label className="block">
          <span className="label-tag">{t('pricing.enquiryOrg')}</span>
          <input
            className={field}
            value={organisation}
            maxLength={120}
            onChange={(e) => {
              setOrganisation(e.target.value)
              setCopied(false)
            }}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label-tag">{t('pricing.enquiryAthletes')}</span>
            <input
              className={field}
              inputMode="numeric"
              value={athletes}
              maxLength={5}
              onChange={(e) => {
                setAthletes(e.target.value)
                setCopied(false)
              }}
            />
          </label>
          <label className="block">
            <span className="label-tag">{t('pricing.enquiryCoaches')}</span>
            <input
              className={field}
              inputMode="numeric"
              value={coaches}
              maxLength={5}
              onChange={(e) => {
                setCoaches(e.target.value)
                setCopied(false)
              }}
            />
          </label>
        </div>

        <label className="block">
          <span className="label-tag">{t('pricing.enquiryNote')}</span>
          <textarea
            className={`${field} resize-y`}
            rows={3}
            maxLength={600}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setCopied(false)
            }}
          />
        </label>

        <p className="text-[12px] leading-relaxed text-ink-muted">
          {t('pricing.enquiryNoAthleteData')}
        </p>

        <pre className="readout max-h-56 overflow-auto border border-line bg-surface-sunken px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap">
          {text}
        </pre>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => {
              void navigator.clipboard?.writeText(text).then(
                () => setCopied(true),
                // Ohne Zwischenablage-Recht bleibt der Text sichtbar und
                // markierbar — die Anfrage geht deshalb nicht verloren.
                () => setCopied(false),
              )
            }}
          >
            {t('pricing.enquiryCopy')}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={`mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(
                text.split('\n')[0],
              )}&body=${encodeURIComponent(text)}`}
            >
              {t('pricing.enquiryMail')}
            </a>
          </Button>
          {copied && (
            <span role="status" className="self-center text-[13px] text-accent-text">
              {t('pricing.enquiryCopied')}
            </span>
          )}
        </div>
      </div>
    </Panel>
  )
}
