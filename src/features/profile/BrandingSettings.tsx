import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Upload } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'

/** Über dieser Grösse wird ein Logo abgelehnt statt den Bestand zu sprengen. */
const MAX_LOGO_BYTES = 250_000

/**
 * White-Label für Berichte.
 *
 * Rein kosmetisch und rein lokal: Name, Logo, Fusszeile. Nichts davon
 * verlässt das Gerät, und nichts davon verändert eine Zahl im Bericht — ein
 * Bericht, dessen Werte vom Absender abhängen, wäre wertlos.
 */
export function BrandingSettings() {
  const { t } = useTranslation()
  const { data, saveBranding } = useAppData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const pickLogo = (file: File) => {
    setError(null)
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      setError('report.logoType')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('report.logoTooLarge')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : null
      if (value) saveBranding({ logoDataUrl: value })
    }
    reader.onerror = () => setError('report.logoUnreadable')
    // Als Data-URL, damit das Logo mit dem Bestand exportiert wird und der
    // Bericht auch offline und ohne Serverzugriff vollständig ist.
    reader.readAsDataURL(file)
  }

  return (
    <Panel>
      <PanelHeader title={t('report.branding')} subtitle={t('report.brandingHint')} />
      <div className="space-y-4 px-4 py-4">
        <label className="block">
          <span className="label-tag">{t('report.organisation')}</span>
          <input
            type="text"
            value={data.branding.organisation}
            maxLength={80}
            placeholder={t('app.name')}
            onChange={(e) => saveBranding({ organisation: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>

        <div>
          <span className="label-tag">{t('report.logo')}</span>
          <div className="mt-1.5 flex items-center gap-3">
            {data.branding.logoDataUrl ? (
              <img
                src={data.branding.logoDataUrl}
                alt={t('report.logoAlt')}
                className="max-h-11 max-w-[120px] border border-line object-contain"
              />
            ) : (
              <span className="text-[13px] text-ink-muted">{t('report.noLogo')}</span>
            )}
            {/* Kein eigenes Bedienelement: der sichtbare Knopf löst ihn aus.
                Deshalb ausdrücklich nicht fokussierbar und für die
                Hilfstechnik unsichtbar — sonst stünde ein 1x1-Ziel im Weg. */}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) pickLogo(file)
                e.target.value = ''
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload size={13} aria-hidden />
              {t('report.chooseLogo')}
            </Button>
            {data.branding.logoDataUrl && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('report.removeLogo')}
                onClick={() => saveBranding({ logoDataUrl: null })}
              >
                <Trash2 size={14} aria-hidden />
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-1.5 text-[12px] text-critical">
              {t(error, { max: Math.round(MAX_LOGO_BYTES / 1000) })}
            </p>
          )}
        </div>

        <label className="block">
          <span className="label-tag">{t('report.footer')}</span>
          <input
            type="text"
            value={data.branding.footer}
            maxLength={200}
            placeholder={t('report.footerPlaceholder')}
            onChange={(e) => saveBranding({ footer: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>

        <p className="text-[12px] leading-relaxed text-ink-muted">{t('report.brandingNote')}</p>
      </div>
    </Panel>
  )
}
