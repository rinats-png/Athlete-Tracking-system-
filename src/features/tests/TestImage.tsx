import { useTranslation } from 'react-i18next'
import { testImageUrl } from '@/data/testImages'

/**
 * Bild zu einem Test oder Beobachtungswert.
 *
 * Wird erst geladen, wenn es in den Sichtbereich kommt (`loading="lazy"`);
 * bis dahin hält der Rahmen mit dem Seitenverhältnis des Bildes den Platz
 * frei — die Seite springt nicht. Ohne Netz und ohne Zwischenspeicher fehlt
 * das Bild schlicht; die Vorschrift darunter ist vollständig ohne es.
 */
export function TestImage({ id, name }: { id: string; name: string }) {
  const { t } = useTranslation()
  const src = testImageUrl(id)
  if (!src) return null
  return (
    <figure className="border-t border-line px-4 py-3">
      <img
        src={src}
        alt={t('procedure.imageAlt', { name })}
        width={1024}
        height={620}
        loading="lazy"
        decoding="async"
        className="mx-auto block aspect-[1024/620] h-auto w-full max-w-[440px] rounded-md bg-[var(--surface-sunken)] object-cover"
      />
    </figure>
  )
}
