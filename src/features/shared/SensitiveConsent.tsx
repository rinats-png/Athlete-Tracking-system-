import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { SENSITIVE_CATEGORIES } from '@/domain/sensitiveData'
import { onSensitiveConsentChange, readSensitiveConsent, type SensitiveConsentKind } from '@/lib/sensitiveConsent'
import { useAppData } from '@/lib/store/AppDataProvider'
import { syncEnabled } from '@/lib/supabase/syncPreference'

/**
 * Die Einwilligung in den Abgleich gesundheitsnaher Angaben (Art. 9 Abs. 2
 * lit. a DSGVO) — bei der Registrierung und im Profil.
 *
 * Gestaltet nach den Anforderungen an eine wirksame Einwilligung (Art. 4
 * Nr. 11, Art. 7 DSGVO):
 *   - FREIWILLIG: das Konto entsteht auch ohne; dann bleiben genau diese
 *     Angaben auf dem Gerät, alles andere wird abgeglichen. Keine Kopplung an
 *     den Vertrag (Art. 7 Abs. 4).
 *   - INFORMIERT: die vier Bereiche stehen hier, nicht nur in der Erklärung.
 *   - AUSDRÜCKLICH UND EINDEUTIG: ein eigener Haken, nichts vorausgewählt.
 *   - WIDERRUFBAR: der Weg steht dabei; im Profil ein Tipp.
 * Das Mindestalter von 16 (Art. 8 DSGVO) bestätigt die Person selbst. Ein
 * Trainer willigt nicht für andere ein, er BESTÄTIGT, dass die Einwilligungen
 * seiner Athleten vorliegen — das verlangt der AV-Vertrag ohnehin.
 */

function Explanation({ kind }: { kind: SensitiveConsentKind }) {
  const { t } = useTranslation()
  return (
    <>
      <p className="text-ink-secondary">{t(kind === 'coach' ? 'sensitiveConsent.introCoach' : 'sensitiveConsent.intro')}</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-ink-secondary" data-testid="sensitive-categories">
        {SENSITIVE_CATEGORIES.map((c) => (
          <li key={c}>{t(`sensitiveConsent.cat.${c}`)}</li>
        ))}
      </ul>
      <p className="mt-1.5 text-ink-muted">{t('sensitiveConsent.without')}</p>
      <p className="mt-1 text-ink-muted">{t('sensitiveConsent.healthLayer')}</p>
    </>
  )
}

export interface SensitiveChoice {
  granted: boolean
  ageConfirmed: boolean
}

/** Bei der Registrierung: ein eigener, freiwilliger Block über dem Absenden. */
export function SensitiveConsentField({
  role,
  value,
  onChange,
}: {
  role: 'athlete' | 'coach'
  value: SensitiveChoice
  onChange: (next: SensitiveChoice) => void
}) {
  const { t } = useTranslation()
  const kind: SensitiveConsentKind = role === 'coach' ? 'coach' : 'self'
  return (
    <fieldset className="border border-line px-3 py-3 text-[12px] leading-relaxed" data-testid="sensitive-consent-field">
      <legend className="label-tag px-1">{t('sensitiveConsent.title')}</legend>
      <Explanation kind={kind} />
      <label className="mt-2 flex min-h-11 items-start gap-3 text-[13px] text-ink">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0"
          checked={value.granted}
          data-testid="sensitive-consent-grant"
          onChange={(e) => onChange({ granted: e.target.checked, ageConfirmed: e.target.checked ? value.ageConfirmed : false })}
        />
        <span>{t(kind === 'coach' ? 'sensitiveConsent.checkbox.coach' : 'sensitiveConsent.checkbox.self')}</span>
      </label>
      {value.granted && (
        <label className="flex min-h-11 items-start gap-3 text-[13px] text-ink">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0"
            checked={value.ageConfirmed}
            data-testid="sensitive-consent-age"
            onChange={(e) => onChange({ ...value, ageConfirmed: e.target.checked })}
          />
          <span>{t('sensitiveConsent.age')}</span>
        </label>
      )}
      {value.granted && !value.ageConfirmed && <p className="text-ink-muted">{t('sensitiveConsent.ageNeeded')}</p>}
      <p className="mt-1 text-ink-muted">{t('sensitiveConsent.withdraw')}</p>
    </fieldset>
  )
}

/** Stand, Einwilligen und Widerruf im Profil unter «Daten». */
export function SensitiveConsentSetting() {
  const { t } = useTranslation()
  const { mode, role, store, mergeAthletes, mergeSeriesRows, replacePool, dropAthletes } = useAppData()
  const [record, setRecord] = useState(readSensitiveConsent)
  const [asking, setAsking] = useState(false)
  const [age, setAge] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => onSensitiveConsentChange(() => setRecord(readSensitiveConsent())), [])
  // Die Demo gleicht nie ab — hier gibt es nichts einzuwilligen.
  if (mode === 'demo') return null

  const kind: SensitiveConsentKind = role === 'coach' ? 'coach' : 'self'

  const change = async (granted: boolean) => {
    setBusy(true)
    const [{ setSensitiveConsent }, { syncOnce }] = await Promise.all([
      import('@/lib/supabase/sensitiveConsent'),
      import('@/lib/supabase/sync'),
    ])
    await setSensitiveConsent(granted, kind, granted && age)
    // Gleich abgleichen: nach einem Widerruf sollen die Angaben nicht erst
    // beim nächsten Anlass vom Server verschwinden.
    // Ist der Abgleich ausgeschaltet, bleibt er es: dann gilt die Wahl beim Wiedereinschalten.
    if (syncEnabled()) await syncOnce(store, mergeAthletes, mergeSeriesRows, replacePool, dropAthletes).catch(() => null)
    setBusy(false)
    setAsking(false)
    setAge(false)
  }

  return (
    <div className="text-[13px] leading-relaxed" data-testid="sensitive-setting">
      <p className="font-medium">{t('sensitiveConsent.title')}</p>
      <p className="mt-1 text-ink-muted" data-testid="sensitive-setting-state" data-state={record.state}>
        {t(`sensitiveConsent.state.${record.state}`)}
      </p>
      {record.pending && <p className="mt-1 text-ink-muted">{t('sensitiveConsent.pending')}</p>}
      {record.state === 'granted' ? (
        <Button type="button" variant="outline" size="sm" className="mt-2" disabled={busy} data-testid="sensitive-withdraw" onClick={() => void change(false)}>
          {t('sensitiveConsent.withdrawButton')}
        </Button>
      ) : asking ? (
        <div className="mt-2 rounded-md border border-line p-3 text-[12px]" role="group" aria-label={t('sensitiveConsent.title')}>
          <Explanation kind={kind} />
          <label className="mt-2 flex min-h-11 items-start gap-3 text-[13px] text-ink">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={age} data-testid="sensitive-setting-age" onChange={(e) => setAge(e.target.checked)} />
            <span>{t('sensitiveConsent.age')}</span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!age || busy} data-testid="sensitive-grant" onClick={() => void change(true)}>
              {t(kind === 'coach' ? 'sensitiveConsent.grantCoach' : 'sensitiveConsent.grant')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(false)}>
              {t('sensitiveConsent.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-2" data-testid="sensitive-ask" onClick={() => setAsking(true)}>
          {t('sensitiveConsent.ask')}
        </Button>
      )}
    </div>
  )
}
