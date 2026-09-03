import { useTranslation } from 'react-i18next'
import type { AppLocale } from '@/types/domain'

/** Die Anzeigesprache als Kennung — an einer Stelle statt in jedem Screen. */
export function useLocale(): AppLocale {
  const { i18n } = useTranslation()
  return i18n.resolvedLanguage === 'en' ? 'en' : 'de'
}
