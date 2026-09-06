import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { consentStatus } from '@/domain/consent'
import { formatDate } from '@/lib/format'
import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Die Einwilligung zu einem Athleten.
 *
 * Bewusst knapp: ein Haken, ein Name, ein Datum. Alles darüber hinaus wäre
 * eine Datensammlung über Menschen, die die App gar nicht führt (§50) — und
 * ein eingescannter Elternbrief wäre mehr Risiko als Nutzen.
 */
export function ConsentPanel({
  athlete,
  onChange,
}: {
  athlete: StoredAthlete
  onChange: (consent: StoredAthlete['consent']) => void
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const status = consentStatus(athlete)
  const consent = athlete.consent

  return (
    <div className="mt-2 border border-line px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-tag">{t('consent.title')}</span>
        <span
          className={`text-[12px] ${status.state === 'granted' ? 'text-ink-secondary' : 'text-ink'}`}
        >
          {t(`consent.state.${status.state}`)}
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        {status.ageYears == null
          ? t('consent.noBirthDate')
          : status.needsGuardian
            ? t('consent.needsGuardian')
            : t('consent.hint')}
      </p>

      <label className="mt-2 block text-[12px]">
        <span className="label-tag">{t('consent.by')}</span>
        <input
          type="text"
          value={consent.grantedBy}
          maxLength={120}
          aria-label={`${t('consent.by')}: ${athlete.name || athlete.id}`}
          onChange={(e) => onChange({ ...consent, grantedBy: e.target.value })}
          className="mt-1 h-11 w-full border border-line bg-surface-sunken px-2.5 text-[16px]"
        />
      </label>

      <label className="mt-2 flex min-h-11 items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          className="size-5"
          checked={consent.forMinor}
          onChange={(e) => onChange({ ...consent, forMinor: e.target.checked })}
        />
        {t('consent.forMinor')}
      </label>

      <div className="mt-2 flex flex-wrap gap-2">
        {consent.grantedAt == null ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!consent.grantedBy.trim()}
            onClick={() =>
              onChange({ ...consent, grantedAt: new Date().toISOString(), withdrawnAt: null })
            }
          >
            {t('consent.grant')}
          </Button>
        ) : consent.withdrawnAt == null ? (
          <Button
            variant="ghost"
            size="sm"
            className="min-w-11 justify-center"
            onClick={() => onChange({ ...consent, withdrawnAt: new Date().toISOString() })}
          >
            {t('consent.withdraw')}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="min-w-11 justify-center"
            onClick={() => onChange({ ...consent, withdrawnAt: null })}
          >
            {t('consent.restore')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => window.print()} className="no-print">
          <Printer size={13} aria-hidden />
          {t('consent.form')}
        </Button>
      </div>

      {consent.grantedAt && (
        <p className="mt-1 text-[11px] text-ink-muted">
          {t('consent.grantedOn', { date: formatDate(consent.grantedAt, locale) })}
          {consent.withdrawnAt &&
            ` · ${t('consent.withdrawnOn', { date: formatDate(consent.withdrawnAt, locale) })}`}
        </p>
      )}

      <p className="mt-1 text-[11px] text-ink-muted">{t('consent.noAdvice')}</p>
    </div>
  )
}

/**
 * Der Vordruck zum Unterschreiben.
 *
 * Nur im Druck sichtbar. Er bleibt beim Trainer — die App speichert weder
 * Unterschrift noch Dokument.
 */
export function ConsentForm({ athlete }: { athlete: StoredAthlete }) {
  const { t } = useTranslation()
  const locale = useLocale()

  return (
    <section className="hidden break-after-page px-2 py-6 print:block">
      <h2 className="font-display text-[22px] font-bold">{t('consent.formTitle')}</h2>
      <p className="mt-3 max-w-[70ch] text-[12px] leading-relaxed">{t('consent.formBody')}</p>

      <dl className="mt-6 space-y-6 text-[12px]">
        {[
          [t('consent.formAthlete'), athlete.name || athlete.profile.firstName || ''],
          [
            t('consent.formBirth'),
            athlete.profile.birthDate ? formatDate(athlete.profile.birthDate, locale) : '',
          ],
          [t('consent.formGuardian'), ''],
          [t('consent.formRelation'), ''],
          [t('consent.formPlaceDate'), ''],
          [t('consent.formSignature'), ''],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-black/40 pb-1">
            <dt className="text-[10px] tracking-[0.1em] uppercase">{label}</dt>
            <dd className="min-h-6 pt-1">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
