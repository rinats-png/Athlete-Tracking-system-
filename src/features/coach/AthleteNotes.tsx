import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { formatDate } from '@/lib/format'
import type { AppLocale } from '@/types/domain'

/**
 * Notizen zum Athleten und Änderungsnachweis (§74, §57).
 *
 * Die Notiz ist Freitext und wird von der App nicht ausgewertet — sie
 * gehört dem Trainer, nicht dem Algorithmus.
 *
 * Der Nachweis hält fest, wann was passiert ist, und ausdrücklich nicht,
 * was vorher drinstand: ein Verlaufsspeicher mit allen alten Ständen wäre
 * ein zweiter Bestand mit denselben personenbezogenen Daten, den niemand
 * angefordert hat.
 */
export function AthleteNotes({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const { athleteNotes, saveAthleteNotes, audit } = useAppData()

  return (
    <Panel>
      <PanelHeader title={t('notes.title')} subtitle={t('notes.hint')} />
      <div className="px-4 py-4">
        <label className="block">
          <span className="sr-only">{t('notes.title')}</span>
          <textarea
            value={athleteNotes}
            maxLength={4000}
            rows={4}
            placeholder={t('notes.placeholder')}
            onChange={(e) => saveAthleteNotes(e.target.value)}
            className="w-full resize-y border border-line bg-surface-sunken px-3 py-2 text-[14px]"
          />
        </label>

        <div className="mt-4 border-t border-line pt-3">
          <span className="label-tag">{t('notes.audit')}</span>
          {audit.length === 0 ? (
            <p className="mt-1 text-[12px] text-ink-muted">{t('notes.auditEmpty')}</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {audit.slice(0, 12).map((entry) => (
                <li key={entry.id} className="flex flex-wrap gap-x-2 text-[12px] text-ink-secondary">
                  <span className="readout tabular-nums text-ink-muted">
                    {formatDate(entry.at, locale)}
                  </span>
                  <span>
                    {t(`notes.action.${entry.action}`)} · {t(`notes.entity.${entry.entity}`)}
                  </span>
                  {entry.label && <span className="text-ink-muted">{entry.label}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{t('notes.auditNote')}</p>
        </div>
      </div>
    </Panel>
  )
}
