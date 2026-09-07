import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { OPERATOR, PROCESSORS, missingOperatorFields } from '@/data/operator'
import { privacyDocument, termsDocument, type LegalDocument } from './texts'
import { pick } from '@/i18n/pick'
import { LEGAL_LOCALES } from '@/i18n/locales'

/**
 * Impressum, Datenschutzerklärung, Nutzungsbedingungen.
 *
 * EIN BILDSCHIRM FÜR DREI DOKUMENTE, weil sie dasselbe Gerüst haben und sich
 * gegenseitig verlinken. Sie liegen in einem nachgeladenen Baustein: sie
 * werden selten gelesen und sollen nicht in jedem Programmstart mitbezahlt
 * werden.
 *
 * FEHLENDE PFLICHTANGABEN WERDEN GEZEIGT, nicht überspielt. Ein Impressum,
 * das vollständig aussieht und keines ist, wäre die schlechteste aller
 * Möglichkeiten — für den Betreiber, der es übersieht, und für den Nutzer,
 * der glaubt, er habe einen Ansprechpartner.
 */

export function ImprintScreen() {
  const { t } = useTranslation()
  const missing = missingOperatorFields()

  const rows: { label: string; value: string }[] = [
    { label: t('legal.imprint.name'), value: OPERATOR.name },
    { label: t('legal.imprint.address'), value: [OPERATOR.street, OPERATOR.city, OPERATOR.country].filter(Boolean).join(', ') },
    { label: t('legal.imprint.email'), value: OPERATOR.email },
    { label: t('legal.imprint.phone'), value: OPERATOR.phone },
    { label: t('legal.imprint.represented'), value: OPERATOR.represented },
    { label: t('legal.imprint.register'), value: OPERATOR.register },
    { label: t('legal.imprint.vat'), value: OPERATOR.vatId },
  ]

  return (
    <Frame title={t('legal.imprint.title')} intro={t('legal.imprint.intro')}>
      <LanguageNote />
      {missing.length > 0 && (
        <p
          role="alert"
          className="mb-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] leading-relaxed"
        >
          {t('legal.imprint.incomplete', {
            fields: missing.map((f) => t(`legal.imprint.${f === 'street' || f === 'city' ? 'address' : f}`)).join(', '),
          })}
        </p>
      )}
      <Panel>
        <PanelHeader title={t('legal.imprint.provider')} />
        <dl className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-[13px]">
              <dt className="label-tag min-w-[12rem]">{row.label}</dt>
              <dd className={row.value ? '' : 'text-warning'}>
                {row.value || t('legal.imprint.missing')}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
      <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">{t('legal.imprint.note')}</p>
    </Frame>
  )
}

export function PrivacyScreen() {
  const locale = useLocale()
  const { t } = useTranslation()
  return (
    <DocumentScreen document={privacyDocument(locale)}>
      <Panel className="mt-4">
        <PanelHeader title={t('legal.processors')} />
        <ul className="divide-y divide-line">
          {PROCESSORS.map((processor) => (
            <li key={processor.name} className="px-4 py-3 text-[13px] leading-relaxed">
              <p className="font-medium">{processor.name}</p>
              <p className="text-ink-secondary">{pick(processor.purpose, locale)}</p>
              <p className="text-ink-muted">{pick(processor.location, locale)}</p>
              <a
                href={processor.privacyUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[12px] underline underline-offset-2"
              >
                {processor.privacyUrl}
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </DocumentScreen>
  )
}

export function TermsScreen() {
  const locale = useLocale()
  return <DocumentScreen document={termsDocument(locale)} />
}

function DocumentScreen({
  document,
  children,
}: {
  document: LegalDocument
  children?: React.ReactNode
}) {
  return (
    <Frame title={document.title} intro={document.intro}>
      <LanguageNote />
      <p className="readout mb-4 text-[12px] text-ink-muted">{document.updated}</p>
      <div className="space-y-4">
        {document.sections.map((section) => (
          <Panel key={section.heading}>
            <PanelHeader title={section.heading} />
            <div className="space-y-2 px-4 py-3 text-[13px] leading-relaxed">
              {section.body.filter(Boolean).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.list && (
                <ul className="list-disc space-y-1 pl-5">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        ))}
      </div>
      {children}
    </Frame>
  )
}

/**
 * Die Rechtstexte gibt es nur deutsch und englisch. In jeder anderen
 * Sprache steht das oben auf der Seite — eine englische Datenschutzerklärung
 * unter schwedischer Navigation soll nicht aussehen wie ein Versehen.
 */
function LanguageNote() {
  const { t } = useTranslation()
  const locale = useLocale()
  if (LEGAL_LOCALES.includes(locale)) return null
  return (
    <p
      role="note"
      data-testid="legal-language-note"
      className="mb-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] leading-relaxed text-ink-secondary"
    >
      {t('legal.languageNote')}
    </p>
  )
}

function Frame({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  // Der Pfad direkt aus der Adresse: diese Seiten werden auch VOR dem Router
  // gezeigt (aus der Anmeldung und von der Landeseite heraus), und dort gibt
  // es kein `useLocation`.
  const pathname = typeof window === 'undefined' ? '' : window.location.pathname
  const links = [
    { to: '/impressum', label: t('legal.imprint.title') },
    { to: '/datenschutz', label: t('legal.privacy.title') },
    { to: '/nutzungsbedingungen', label: t('legal.terms.title') },
  ]
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <a href="/">
          <ArrowLeft size={14} aria-hidden />
          {t('legal.back')}
        </a>
      </Button>
      <ScreenHeader eyebrow={t('legal.eyebrow')} title={title} intro={intro} />
      <nav aria-label={t('legal.eyebrow')} className="mb-5 flex flex-wrap gap-2">
        {links.map((link) => (
          <Button
            key={link.to}
            asChild
            size="sm"
            variant={pathname === link.to ? 'primary' : 'outline'}
          >
            <a href={link.to}>{link.label}</a>
          </Button>
        ))}
      </nav>
      {children}
    </>
  )
}
