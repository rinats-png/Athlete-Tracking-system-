import { useTranslation } from 'react-i18next'
import { toAppLocale, type AppLocale } from '@/i18n/locales'

/** Die Anzeigesprache als Kennung — an einer Stelle statt in jedem Screen. */
export function useLocale(): AppLocale {
  const { i18n } = useTranslation()
  return toAppLocale(i18n.resolvedLanguage)
}
