import { useTranslation } from 'react-i18next'
import { ChevronDown, Languages } from 'lucide-react'
import { APP_LOCALES, LOCALE_NAMES, toAppLocale } from '@/i18n/locales'

/**
 * Die Sprachwahl.
 *
 * Bei zwei Sprachen waren es zwei Knöpfe. Bei acht ist eine Auswahlliste
 * die ehrlichere Form: acht Knöpfe nebeneinander passen auf kein Telefon,
 * und eine Liste trägt den Eigennamen jeder Sprache — «Svenska», nicht
 * «SV». Die Namen sind bewusst nicht übersetzt: wer Schwedisch sucht,
 * sucht «Svenska», egal in welcher Sprache die App gerade steht.
 *
 * Die Höhe sitzt auf der Auswahlliste selbst, nicht auf dem Rahmen: sie ist
 * die Trefferfläche, und `h-full` innerhalb eines 44 px hohen Rahmens ergab
 * 42 px — zwei zu wenig.
 */
export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const active = toAppLocale(i18n.resolvedLanguage)

  return (
    <label className="inline-flex items-center gap-2 border border-line bg-surface-sunken pl-3 pr-2">
      <Languages size={14} className="shrink-0 text-ink-muted" aria-hidden />
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={active}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label={t('language.label')}
        className="min-h-11 appearance-none bg-transparent pr-6 font-display text-[12px] font-semibold tracking-[0.08em] uppercase text-ink outline-none"
        data-testid="language-select"
      >
        {APP_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="-ml-6 shrink-0 text-ink-muted" aria-hidden />
    </label>
  )
}
