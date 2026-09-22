import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { keyState } from '@/lib/supabase/healthSync'
import { ensureEnvelope, receivedShares, type ReceivedShare } from '@/lib/supabase/healthShare'

/**
 * Was Athleten diesem Trainer freigegeben haben.
 *
 * DIESER BILDSCHIRM ZEIGT UND SAGT NICHTS DAZU. Er ist die Trainerseite der
 * Gesundheitsschicht und erbt damit deren Linie vollständig: keine
 * Einstufung, kein Grenzwert, keine Ampel (§81, §82). Ein Trainer, der
 * Laborwerte sieht, sieht Zahlen mit Einheit und Referenzbereich des Labors
 * — dasselbe, was der Athlet sieht.
 *
 * UND ER ZEIGT DAS DATUM AN JEDER FREIGABE, gross genug, um es nicht zu
 * übersehen: Eine Freigabe ist eine Abschrift von einem Tag, kein Blick in
 * den heutigen Bestand. Wer danach berät, muss wissen, wie alt das ist, was
 * er da liest.
 *
 * OHNE PHRASE BLEIBT ER LEER. Der Trainer braucht seinen eigenen privaten
 * Schlüssel, um die Umschläge zu öffnen — also hat auch er eine Phrase.
 */
export function SharedWithMeScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const [state, setState] = useState<'checking' | 'locked' | 'off' | 'ready'>('checking')
  const [shares, setShares] = useState<ReceivedShare[]>([])

  const load = async () => {
    const key = await keyState()
    if (key.state === 'unavailable' || key.state === 'not_signed_in') return setState('off')
    if (key.state !== 'unlocked') return setState('locked')
    const envelope = await ensureEnvelope(key.key)
    if (!envelope) return setState('locked')
    setShares(await receivedShares(envelope.privateKey))
    setState('ready')
  }
  useEffect(() => {
    void load()
  }, [])

  return (
    <>
      <ScreenHeader eyebrow={t('health.shared.eyebrow')} title={t('health.shared.title')} intro={t('health.shared.intro')} />

      <p role="note" className="mb-4 border-l-2 border-line-strong px-3 py-2 text-[13px] leading-relaxed text-ink-secondary" data-testid="shared-scope">
        {t('health.shared.scope')}
      </p>

      {state === 'checking' && <p className="text-[13px] text-ink-muted">{t('health.share.checking')}</p>}
      {state === 'off' && <p className="text-[13px] text-ink-secondary">{t('health.key.signedOut')}</p>}
      {state === 'locked' && (
        <Panel data-testid="shared-locked">
          <div className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">{t('health.shared.locked')}</div>
        </Panel>
      )}

      {state === 'ready' && shares.length === 0 && (
        <Panel data-testid="shared-empty">
          <div className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">{t('health.shared.empty')}</div>
        </Panel>
      )}

      <div className="space-y-4">
        {shares.map((share) => (
          <Panel key={`${share.ownerId}:${share.athleteId}:${share.category}`} data-testid={`shared-${share.category}`}>
            <PanelHeader
              title={t(`health.categories.${share.category}`)}
              subtitle={t('health.shared.takenAt', { date: formatDate(share.payload?.takenAt ?? share.updatedAt, locale) })}
            />
            <div className="px-4 py-3 text-[13px] leading-relaxed">
              {share.payload == null ? (
                <p className="text-ink-secondary" data-testid="shared-unreadable">{t('health.shared.unreadable')}</p>
              ) : share.payload.entries.length === 0 ? (
                <p className="text-ink-secondary">{t('health.shared.noEntries')}</p>
              ) : (
                <ul className="space-y-1">
                  {share.payload.entries.map((entry, i) => (
                    <li key={i} className="border-b border-line pb-1 last:border-b-0">
                      <Entry value={entry} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        ))}
      </div>

      {state === 'ready' && shares.length > 0 && (
        <Button type="button" variant="ghost" size="sm" className="mt-4 -ml-3" onClick={() => void load()}>
          {t('health.shared.reload')}
        </Button>
      )}
    </>
  )

  /**
   * Ein Eintrag, ohne zu wissen, welcher Art er ist.
   *
   * Absichtlich stumpf: Was der Athlet eingetragen hat, steht da — Feldname
   * und Wert. Eine kluge Darstellung je Kategorie wäre schöner und wäre der
   * Anfang einer Deutung. Fotos zeigt sie als Bild, alles andere als Text.
   */
  function Entry({ value }: { value: unknown }) {
    if (!value || typeof value !== 'object') return <span className="text-ink-muted">—</span>
    const fields = Object.entries(value as Record<string, unknown>).filter(
      ([key, v]) => !['id', 'createdAt', 'updatedAt'].includes(key) && v !== null && v !== '' && v !== undefined,
    )
    const photo = fields.find(([key]) => key === 'dataUrl')
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {photo && <img src={String(photo[1])} alt="" className="w-[96px] border border-line" />}
        {fields
          .filter(([key]) => key !== 'dataUrl')
          .map(([key, v]) => (
            <span key={key} className="text-[12px]">
              <span className="text-ink-muted">{key}</span> <span className="readout">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </span>
          ))}
      </div>
    )
  }
}
