import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useBilling } from '@/features/billing/BillingProvider'
import { useLocale } from '@/features/shared/useLocale'
import { COACH_TIERS, coachTier, type CoachTierId } from '@/data/pricing'
import { changeDirection, proratedUpgradeEur, type LimitStatus } from '@/domain/upgrade'
import {
  applyPlanChange,
  cancelScheduledChange,
  previewPlanChange,
  setAutoUpgrade,
  type PlanChangeError,
  type PlanChangePreview,
} from '@/lib/coachStatus'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'

/**
 * Die eigene Trainerstufe: Zählstand, Frist, Wechsel.
 *
 * Ein Wechsel geht immer über eine VORSCHAU: erst die Summe, dann der Knopf.
 * Die Summe kommt von Stripe (anteilig, auf die Sekunde); fehlt sie, rechnet
 * das Gerät selbst und sagt, dass es eine Schätzung ist. Nie ein Knopf, der
 * Geld bewegt, ohne dass die Zahl daneben steht.
 */
export function CoachPlanPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const billing = useBilling()
  const { coach, limit } = billing
  if (!billing.enabled || !coach || !limit) return null

  const tier = coachTier(coach.tier)
  const money = (v: number) => formatNumber(v, locale, Number.isInteger(v) ? 0 : 2)
  const share = Math.min(100, Math.round((coach.measured / Math.max(1, coach.limit)) * 100))

  return (
    <Panel data-testid="coach-plan">
      <PanelHeader
        title={t('coachPlan.title', { tier: pick(tier.name, locale) })}
        subtitle={coach.isOwner ? t('coachPlan.subtitleOwner') : t('coachPlan.subtitleMember')}
      />
      <div className="space-y-3 px-4 py-4 text-[13px] leading-relaxed">
        <div>
          <p className="readout tabular-nums">{t('coachPlan.measured', { count: coach.measured, limit: coach.limit })}</p>
          <div className="mt-1.5 h-1.5 w-full bg-surface-sunken" aria-hidden>
            <div className={`h-full ${limit.state === 'ok' ? 'bg-accent' : limit.state === 'near' ? 'bg-warning' : 'bg-critical'}`} style={{ width: `${share}%` }} />
          </div>
          {coach.windowStart && (
            <p className="mt-1 text-[12px] text-ink-muted">{t('coachPlan.window', { date: formatDate(coach.windowStart, locale) })}</p>
          )}
        </div>

        <LimitNotice limit={limit} />

        {coach.scheduledTier && coach.isOwner && (
          <ScheduledNotice />
        )}

        {coach.isOwner ? <ChangePlan money={money} /> : <p className="text-ink-secondary">{t('coachPlan.memberHint')}</p>}

        {coach.isOwner && coach.hasSubscription && (
          <label className="flex items-start gap-2 border-t border-line pt-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={coach.autoUpgrade}
              onChange={async (e) => {
                const r = await setAutoUpgrade(e.target.checked)
                if (r.ok) void billing.refresh()
              }}
            />
            <span>
              <span className="block">{t('coachPlan.autoUpgrade')}</span>
              <span className="block text-[12px] text-ink-muted">{t('coachPlan.autoUpgradeHint')}</span>
            </span>
          </label>
        )}
      </div>
    </Panel>
  )
}

/** Der Hinweis, je nach Lage. Auch als Leiste über Trainerbildschirmen nutzbar. */
export function LimitNotice({ limit, compact = false }: { limit: LimitStatus; compact?: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  if (limit.state === 'ok' || (compact && limit.state === 'near')) return null
  const next = limit.nextTier ? pick(limit.nextTier.name, locale) : ''
  const tone =
    limit.state === 'near' ? 'border-line-strong' : limit.state === 'grace' ? 'border-warning bg-warning/10' : 'border-critical bg-critical/10'
  const text =
    limit.state === 'near'
      ? t('coachPlan.near', { count: limit.measured, limit: limit.limit })
      : limit.state === 'grace'
        ? t('coachPlan.grace', { count: limit.measured, limit: limit.limit, tier: next, days: limit.daysLeft ?? 0 })
        : limit.state === 'blocked'
          ? t('coachPlan.blocked', { count: limit.measured, limit: limit.limit, tier: next })
          : t('coachPlan.beyond', { count: limit.measured })
  return (
    <div role="status" data-testid={`limit-${limit.state}`} className={`border-l-2 px-3 py-2 text-[13px] leading-relaxed ${tone}`}>
      <p>{text}</p>
      {compact && limit.state !== 'near' && (
        <Link to="/profil#stufe" className="mt-1 inline-block text-[12px] underline underline-offset-2">
          {limit.state === 'beyond' ? t('coachPlan.toEnquiry') : t('coachPlan.toUpgrade', { tier: next })}
        </Link>
      )}
    </div>
  )
}

function ScheduledNotice() {
  const { t } = useTranslation()
  const locale = useLocale()
  const billing = useBilling()
  const [busy, setBusy] = useState(false)
  const coach = billing.coach!
  return (
    <div className="border-l-2 border-line-strong px-3 py-2">
      <p>
        {t('coachPlan.scheduled', {
          tier: pick(coachTier(coach.scheduledTier!).name, locale),
          date: coach.periodEnd ? formatDate(coach.periodEnd, locale) : '—',
        })}
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="-ml-3 mt-1"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await cancelScheduledChange()
          await billing.refresh()
          setBusy(false)
        }}
      >
        {t('coachPlan.cancelScheduled')}
      </Button>
    </div>
  )
}

function ChangePlan({ money }: { money: (v: number) => string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const billing = useBilling()
  const coach = billing.coach!
  const limit = billing.limit!
  const [target, setTarget] = useState<CoachTierId | null>(null)
  const [preview, setPreview] = useState<PlanChangePreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<PlanChangeError | null>(null)
  const [done, setDone] = useState<'up' | 'down' | null>(null)

  // Ohne Abo gibt es nichts zu wechseln: der Weg ist die Kasse.
  if (!coach.hasSubscription) {
    const suggestion = limit.nextTier ?? COACH_TIERS[1]
    return (
      <div>
        <p className="text-ink-secondary">{t('coachPlan.noSubscription')}</p>
        <Button asChild size="sm" variant="primary" className="mt-2">
          <Link to={`/preise?plan=${suggestion.id}`}>{t('coachPlan.toUpgrade', { tier: pick(suggestion.name, locale) })}</Link>
        </Button>
      </div>
    )
  }

  const choose = async (id: CoachTierId) => {
    setTarget(id)
    setPreview(null)
    setError(null)
    setDone(null)
    setBusy(true)
    const r = await previewPlanChange(id)
    setBusy(false)
    if (r.ok) setPreview(r.preview)
    else setError(r.reason)
  }

  const confirm = async () => {
    if (!target) return
    setBusy(true)
    const r = await applyPlanChange(target)
    setBusy(false)
    if (!r.ok) {
      setError(r.reason)
      return
    }
    setDone(changeDirection(coach.tier, target) === 'down' ? 'down' : 'up')
    setTarget(null)
    setPreview(null)
    void billing.refresh()
  }

  // Die eigene Schätzung, falls Stripe keine Vorschau geliefert hat.
  const estimate =
    preview && target && preview.amountEur == null && preview.periodStart && preview.periodEnd
      ? proratedUpgradeEur(coach.tier, target, preview.interval, new Date(preview.periodStart * 1000), new Date(preview.periodEnd * 1000))
      : null

  const others = COACH_TIERS.filter((tier) => tier.yearlyEur != null && tier.id !== coach.tier)

  return (
    <div className="space-y-2 border-t border-line pt-3" id="stufe">
      <p className="label-tag">{t('coachPlan.change')}</p>
      <div className="flex flex-wrap gap-2">
        {others.map((tier) => {
          const up = changeDirection(coach.tier, tier.id) === 'up'
          return (
            <Button
              key={tier.id}
              size="sm"
              variant={limit.nextTier?.id === tier.id ? 'primary' : 'outline'}
              disabled={busy}
              aria-pressed={target === tier.id}
              onClick={() => void choose(tier.id)}
            >
              {up ? '↑' : '↓'} {pick(tier.name, locale)} · {t('coachPlan.athletes', { count: tier.athletesPerYear })}
            </Button>
          )
        })}
      </div>

      {target && preview && (
        <div className="panel space-y-2 border border-line p-3" role="alertdialog" data-testid="plan-preview">
          {preview.direction === 'up' ? (
            <p>
              {preview.amountEur != null
                ? t('coachPlan.previewUp', { tier: pick(coachTier(target).name, locale), amount: money(preview.amountEur) })
                : t('coachPlan.previewUpEstimate', { tier: pick(coachTier(target).name, locale), amount: money(estimate ?? 0) })}
            </p>
          ) : (
            <p>
              {t('coachPlan.previewDown', {
                tier: pick(coachTier(target).name, locale),
                date: preview.effectiveAt ? formatDate(preview.effectiveAt, locale) : '—',
              })}
            </p>
          )}
          <p className="text-[12px] text-ink-muted">
            {t('coachPlan.thenYearly', {
              amount: money((preview.interval === 'monthly' ? coachTier(target).monthlyEur : coachTier(target).yearlyEur) ?? 0),
              unit: preview.interval === 'monthly' ? t('coachPlan.perMonth') : t('coachPlan.perYear'),
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" disabled={busy} onClick={() => void confirm()} data-testid="plan-confirm">
              {preview.direction === 'up' ? t('coachPlan.confirmUp') : t('coachPlan.confirmDown')}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setTarget(null)}>
              {t('coachPlan.cancel')}
            </Button>
          </div>
        </div>
      )}

      {done && (
        <p role="status" className="border-l-2 border-good bg-good/10 px-3 py-2">
          {done === 'up' ? t('coachPlan.doneUp') : t('coachPlan.doneDown')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-warning">
          {t(`coachPlan.error.${error}`)}
        </p>
      )}
      <p className="text-[12px] text-ink-muted">{t('coachPlan.rules')}</p>
    </div>
  )
}
