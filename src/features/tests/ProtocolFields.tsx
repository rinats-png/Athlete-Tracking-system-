import { useTranslation } from 'react-i18next'
import { PROTOCOL_VERSION } from '@/data/protocolV1'
import type { ProtocolSpec } from '@/data/protocolV1'
import { pick } from '@/i18n/pick'
import { useLocale } from '@/features/shared/useLocale'
import type { ProtocolInfo } from '@/lib/store/schema'

/**
 * Protokollangaben einer Messung (Testdokumentation v1.0).
 *
 * Die Methode ist Pflicht und deshalb vorbelegt: mit der Standardmethode des
 * Protokolls. Wer anders misst, stellt um — und bekommt gesagt, was das für
 * die Vergleichbarkeit heisst. Tester, Abweichung und Abbruchgrund sind
 * freiwillig, aber sichtbar: eine leere Abweichung heisst «nach Protokoll».
 */
export function ProtocolFields({
  spec,
  value,
  onChange,
}: {
  spec: ProtocolSpec
  value: Partial<ProtocolInfo>
  onChange: (patch: Partial<ProtocolInfo>) => void
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const method = (value.method ?? spec.methods[0]) as ProtocolSpec['methods'][number]
  const note = spec.methodNote?.[method]

  return (
    <div className="space-y-3 border-t border-line pt-3" data-testid="protocol-fields">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-tag">{t('protocol.title')}</span>
        <span className="text-[12px] text-ink-muted">
          {t('protocol.version', { version: PROTOCOL_VERSION })}
        </span>
      </div>

      <label className="block">
        <span className="label-tag">{t('protocol.method')}</span>
        <select
          value={method}
          onChange={(e) => onChange({ method: e.target.value })}
          className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
        >
          {spec.methods.map((m) => (
            <option key={m} value={m}>
              {t(`protocol.methods.${m}`)}
            </option>
          ))}
        </select>
      </label>
      {note && (
        <p className="border-l-2 border-line px-3 text-[12px] leading-snug text-ink-secondary">
          {pick(note, locale)}
        </p>
      )}

      <label className="block">
        <span className="label-tag">{t('protocol.tester')}</span>
        <input
          type="text"
          value={value.tester ?? ''}
          maxLength={80}
          placeholder={t('protocol.testerPlaceholder')}
          onChange={(e) => onChange({ tester: e.target.value })}
          className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
        />
      </label>

      <label className="block">
        <span className="label-tag">{t('protocol.deviation')}</span>
        <textarea
          value={value.deviation ?? ''}
          maxLength={300}
          rows={2}
          placeholder={t('protocol.deviationPlaceholder')}
          onChange={(e) => onChange({ deviation: e.target.value })}
          className="mt-1.5 w-full resize-y border border-line bg-surface-sunken px-3 py-2 text-[16px]"
        />
      </label>

      <label className="block">
        <span className="label-tag">{t('protocol.abortReason')}</span>
        <input
          type="text"
          value={value.abortReason ?? ''}
          maxLength={300}
          placeholder={t('protocol.abortPlaceholder')}
          onChange={(e) => onChange({ abortReason: e.target.value })}
          className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
        />
      </label>
    </div>
  )
}
