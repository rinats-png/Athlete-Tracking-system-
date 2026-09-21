import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import {
  ATHLETE_PLANS,
  COACH_TIERS,
  FREE_CORE,
  INSTITUTION_PROFILES,
  athletesMeasuredInWindow,
  buildEnquiryText,
  coachTierFor,
  extraFeatures,
  perAthleteYearEur,
  yearlyCostOfMonthly,
  yearlyCostOfMonthlyCoach,
  ENQUIRY_EMAIL,
  type AthletePlan,
  type CoachTier,
  type InstitutionTrack,
  type PlanFeature,
} from '@/data/pricing'
import { formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { useBilling } from '@/features/billing/BillingProvider'
import { startCheckout, type CheckoutInterval } from '@/lib/billing'
import { currentUser } from '@/lib/supabase/auth'

/**
 * Was KYDON kosten wird.
 *
 * Bewusst als Auskunft und nicht als Kaufabschluss: es gibt keine
 * Zahlungsabwicklung. Der Bildschirm sagt das oben, bevor jemand nach einem
 * Knopf sucht, den es nicht gibt.
 *
 * AUFBAU. Zuerst der kostenlose Kern als eigene Liste — nicht als leere
 * Spalte in einer Vergleichstabelle. Eine Tabelle mit Häkchen und Lücken
 * erzählt «dir fehlt etwas»; eine Liste erzählt «das hast du». Beides ist
 * wahr, aber nur das zweite stimmt mit der Haltung dieses Produkts überein.
 *
 * Danach, was die bezahlten Stufen ZUSÄTZLICH bringen. Auch das bewusst:
 * neben «Plus» nochmals die sechs kostenlosen Merkmale zu wiederholen, sähe
 * nach mehr aus und sagte weniger.
 */
export function PricingScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { athletes, role } = useAppData()
  const eur = (value: number, digits = 2) => formatNumber(value, locale, digits)
  /** Ganze Beträge ohne Nachkommastellen: 29 € liest sich besser als 29,00 €. */
  const money = (value: number) => eur(value, Number.isInteger(value) ? 0 : 2)

  // Die eigene Einstufung aus echten Messdaten, nicht aus der Listenlänge.
  const measured = useMemo(() => athletesMeasuredInWindow(athletes), [athletes])
  const tier = coachTierFor(measured)

  const featureName = (feature: PlanFeature) => t(`pricing.feature.${feature}`)
  // Von einer Schranke hierher: die genannte Stufe steht hervorgehoben.
  const [params] = useSearchParams()
  const wanted = params.get('plan')

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

      <BillingStatus />

      {/* --- Der kostenlose Kern ------------------------------------------ */}
      <Panel float>
        <PanelHeader title={t('pricing.freeTitle')} subtitle={t('pricing.freeSubtitle')} />
        <div className="px-4 py-3">
          <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">
            {t('pricing.freeIntro')}
          </p>
          <ul className="mt-3 grid gap-2 text-[13px] leading-relaxed sm:grid-cols-2">
            {FREE_CORE.map((feature) => (
              <li key={feature} className="flex gap-2">
                <Check size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
                <span>{featureName(feature)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {/* --- Einzelnutzung ------------------------------------------------- */}
      <h2 className="font-display mt-8 mb-1 text-[19px] font-bold">{t('pricing.athleteTitle')}</h2>
      <p className="mb-3 max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">
        {t('pricing.athleteIntro')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {ATHLETE_PLANS.filter((plan) => plan.billing !== 'free').map((plan) => (
          <AthletePlanCard
            key={plan.id}
            plan={plan}
            money={money}
            featureName={featureName}
            locale={locale}
            highlight={wanted === plan.id}
          />
        ))}
      </div>

      {/* --- Trainer ------------------------------------------------------- */}
      <h2 className="font-display mt-8 mb-1 text-[19px] font-bold">{t('pricing.coachTitle')}</h2>
      <p className="mb-3 max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">
        {t('pricing.coachIntro')} {t('pricing.coachCounting')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COACH_TIERS.map((coach) => (
          <CoachTierCard
            key={coach.id}
            tier={coach}
            money={money}
            featureName={featureName}
            locale={locale}
            current={tier?.id === coach.id}
          />
        ))}
      </div>
      {role === 'coach' && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
          {tier
            ? t('pricing.yourTier', {
                count: measured,
                tier: pick(tier.name, locale),
                amount: tier.yearlyEur == null ? t('pricing.free') : `${money(tier.yearlyEur)} €`,
              })
            : t('pricing.yourTierNone', { count: measured })}
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
            <PanelHeader title={pick(profile.name, locale)} subtitle={t('pricing.onRequestShort')} />
            <ul className="space-y-2 px-4 py-3 text-[13px] leading-relaxed">
              {profile.criteria.map((criterion) => (
                <li key={criterion.de} className="flex gap-2">
                  <Check size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
                  <span>{pick(criterion, locale)}</span>
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
          <li>{t('pricing.promiseMeasure')}</li>
          <li>{t('pricing.promiseHistory')}</li>
          <li>{t('pricing.promiseNoAds')}</li>
        </ul>
      </Panel>
    </>
  )
}

function AthletePlanCard({
  plan,
  money,
  featureName,
  locale,
  highlight = false,
}: {
  plan: AthletePlan
  money: (value: number) => string
  featureName: (feature: PlanFeature) => string
  locale: ReturnType<typeof useLocale>
  highlight?: boolean
}) {
  const { t } = useTranslation()
  const monthlyYear = yearlyCostOfMonthly(plan)

  return (
    <Panel float={plan.id === 'plus' || highlight} data-testid={`plan-${plan.id}`}>
      <PanelHeader
        title={pick(plan.name, locale)}
        subtitle={
          plan.billing === 'once'
            ? t('pricing.once', { amount: money(plan.onceEur!) })
            : t('pricing.perYear', { amount: money(plan.yearlyEur!) })
        }
      />
      <div className="px-4 py-3 text-[13px] leading-relaxed">
        <p className="text-ink-secondary">{t(`pricing.athletePlan.${plan.id}`)}</p>

        {plan.monthlyEur != null && monthlyYear != null && (
          // Der Monatspreis steht mit seinem Jahreswert daneben. Wer monatlich
          // zahlen will, soll das können — aber er soll sehen, was es kostet.
          <p className="readout mt-2 tabular-nums text-ink-muted">
            {t('pricing.orMonthly', {
              amount: money(plan.monthlyEur),
              year: money(monthlyYear),
            })}
          </p>
        )}
        {plan.billing === 'once' && (
          <p className="mt-2 text-ink-muted">{t('pricing.terminScope')}</p>
        )}

        <p className="label-tag mt-3">{t('pricing.onTop')}</p>
        <ul className="mt-1 space-y-1.5">
          {extraFeatures(plan).map((feature) => (
            <li key={feature} className="flex gap-2">
              <Check size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
              <span>{featureName(feature)}</span>
            </li>
          ))}
        </ul>
        <BuyButtons id={plan.id} name={pick(plan.name, locale)} yearly={plan.yearlyEur} monthly={plan.monthlyEur} once={plan.onceEur} money={money} />
      </div>
    </Panel>
  )
}

/**
 * Was der Bezahlweg gerade sagt — ganz oben, vor den Karten.
 *
 * Ohne Bezahlweg: der alte Hinweis, dass nichts gekauft werden kann. Mit:
 * die eigene Stufe, das Ergebnis einer Rückkehr von der Kasse
 * (?checkout=success|cancel) und der Hinweis, dass man angemeldet sein
 * muss. Nach «success» wird der Stand einmal frisch geholt — der Webhook
 * ist meist schneller als der Mensch, aber nicht immer; dafür der Knopf.
 */
function BillingStatus() {
  const { t } = useTranslation()
  const locale = useLocale()
  const billing = useBilling()
  const [params] = useSearchParams()
  const checkout = params.get('checkout')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!billing.enabled) return
    let alive = true
    void currentUser().then((u) => {
      if (alive) setSignedIn(u != null)
    })
    if (checkout === 'success') void billing.refresh()
    return () => {
      alive = false
    }
    // Einmal beim Öffnen und bei Rückkehr von der Kasse — nicht bei jeder Änderung des Stands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing.enabled, checkout])

  if (!billing.enabled) {
    return (
      <p role="status" className="mb-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] leading-relaxed text-ink-secondary">
        {t('pricing.notYet')}
      </p>
    )
  }

  const { access, state } = billing
  const name =
    access.role === 'coach'
      ? access.coachTier === 'coach_free'
        ? null
        : pick(COACH_TIERS.find((c) => c.id === access.coachTier)!.name, locale)
      : access.athletePlan === 'free'
        ? null
        : state.coachGrant && access.athletePlan === 'plus' && state.entitlements.length === 0
          ? t('billing.viaCoach')
          : pick(ATHLETE_PLANS.find((p) => p.id === access.athletePlan)!.name, locale)

  return (
    <div className="mb-4 space-y-2 text-[13px] leading-relaxed" data-testid="billing-status">
      {checkout === 'success' && (
        <p role="status" className="border-l-2 border-good bg-good/10 px-3 py-2 text-ink-secondary">
          {t('billing.checkoutSuccess')}
        </p>
      )}
      {checkout === 'cancel' && (
        <p role="status" className="border-l-2 border-line-strong px-3 py-2 text-ink-secondary">
          {t('billing.checkoutCancel')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="readout">{name ? t('billing.yourPlan', { plan: name }) : t('billing.yourPlanFree')}</p>
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => void billing.refresh()}>
          {t('billing.refresh')}
        </Button>
      </div>
      {signedIn === false && <p className="text-ink-secondary">{t('billing.signInFirst')}</p>}
      <p className="text-[12px] text-ink-muted">{t('billing.stripeNote')}</p>
    </div>
  )
}

/**
 * Die Kaufknöpfe einer Karte. Nur mit Bezahlweg; die Karte ist sonst eine
 * Auskunft. Ein Tipp legt bei Stripe eine Kasse an und geht dorthin —
 * Kartendaten sieht diese App nie.
 */
function BuyButtons({ id, name, yearly, monthly, once, money }: { id: string; name: string; yearly: number | null; monthly: number | null; once: number | null; money: (v: number) => string }) {
  const { t } = useTranslation()
  const billing = useBilling()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!billing.enabled) return null
  const isCurrent = billing.access.athletePlan === id || billing.access.coachTier === id

  const go = async (interval: CheckoutInterval) => {
    setBusy(true)
    setError(null)
    const r = await startCheckout(id as never, interval)
    setBusy(false)
    if (r.ok) {
      window.location.assign(r.url)
      return
    }
    setError(t(`billing.${r.reason === 'not_signed_in' ? 'signInFirst' : r.reason === 'offline' ? 'offline' : r.reason === 'unavailable' ? 'unavailable' : 'failed'}`))
  }

  return (
    <div className="mt-3 space-y-2">
      {isCurrent && <p className="label-tag">{t('billing.current')}</p>}
      <div className="flex flex-wrap gap-2">
        {once != null ? (
          <Button variant="primary" size="sm" disabled={busy || isCurrent} onClick={() => void go('once')}>
            {t('billing.chooseOnce', { plan: name, amount: money(once) })}
          </Button>
        ) : yearly != null ? (
          <Button variant="primary" size="sm" disabled={busy || isCurrent} onClick={() => void go('yearly')}>
            {t('billing.chooseYearly', { plan: name, amount: money(yearly) })}
          </Button>
        ) : null}
        {monthly != null && (
          <Button variant="outline" size="sm" disabled={busy || isCurrent} onClick={() => void go('monthly')}>
            {t('billing.chooseMonthly', { amount: money(monthly) })}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[12px] text-warning">
          {error}
        </p>
      )}
    </div>
  )
}

function CoachTierCard({
  tier,
  money,
  featureName,
  locale,
  current,
}: {
  tier: CoachTier
  money: (value: number) => string
  featureName: (feature: PlanFeature) => string
  locale: ReturnType<typeof useLocale>
  current: boolean
}) {
  const { t } = useTranslation()
  const perAthlete = perAthleteYearEur(tier)
  const monthlyYear = yearlyCostOfMonthlyCoach(tier)
  // Gegenüber der jeweils kleineren Stufe — so steht in jeder Karte nur das,
  // was diese Stufe hinzufügt, statt viermal derselben Liste.
  const index = COACH_TIERS.indexOf(tier)
  const previous = index > 0 ? COACH_TIERS[index - 1] : null
  const added = previous
    ? tier.features.filter((feature) => !previous.features.includes(feature))
    : []

  return (
    <Panel float={current}>
      <PanelHeader
        title={pick(tier.name, locale)}
        subtitle={
          tier.yearlyEur == null
            ? t('pricing.free')
            : t('pricing.perYear', { amount: money(tier.yearlyEur) })
        }
      />
      <div className="px-4 py-3 text-[13px] leading-relaxed">
        <p>{t('pricing.athletesMeasured', { count: tier.athletesPerYear })}</p>
        {perAthlete != null && (
          <p className="readout mt-1 tabular-nums text-ink-secondary">
            {t('pricing.perAthleteYear', { amount: money(perAthlete) })}
          </p>
        )}
        {tier.monthlyEur != null && monthlyYear != null && (
          <p className="readout mt-1 tabular-nums text-ink-muted">
            {t('pricing.orMonthly', { amount: money(tier.monthlyEur), year: money(monthlyYear) })}
          </p>
        )}
        {tier.coachSeats > 1 && (
          <p className="mt-1 text-ink-secondary">{t('pricing.seats', { count: tier.coachSeats })}</p>
        )}
        {previous == null ? (
          <ul className="mt-3 space-y-1.5">
            {(['groupTest', 'csvImport', 'coachProof', 'unlimitedReports'] as PlanFeature[]).map(
              (feature) => (
                <li key={feature} className="flex gap-2">
                  <Check size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
                  <span>{featureName(feature)}</span>
                </li>
              ),
            )}
          </ul>
        ) : added.length > 0 ? (
          <>
            <p className="label-tag mt-3">{t('pricing.onTopOf', { tier: pick(previous.name, locale) })}</p>
            <ul className="mt-1 space-y-1.5">
              {added.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
                  <span>{featureName(feature)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-ink-secondary">
            {t('pricing.sameAs', { tier: pick(previous.name, locale) })}
          </p>
        )}
        {tier.yearlyEur != null && <BuyButtons id={tier.id} name={pick(tier.name, locale)} yearly={tier.yearlyEur} monthly={tier.monthlyEur} once={null} money={money} />}
      </div>
    </Panel>
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
              {pick(profile.name, locale)}
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
