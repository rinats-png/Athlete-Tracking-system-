import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useLocale } from '@/features/shared/useLocale'
import { procedureFor } from '@/data/testProcedure'
import type { Bilingual, TestProcedure } from '@/data/testProcedure'
import type { TestDefinition } from '@/data/testCatalog'
import { pick } from '@/i18n/pick'
import type { AppLocale } from '@/i18n/locales'
import { TestFigure } from './figures/TestFigure'

/**
 * Die Durchführungsvorschrift zu einem Test.
 *
 * Abschnitte in der Reihenfolge, in der sie gebraucht werden: erst die
 * Vorbereitung, dann die Versuche, dann die beiden Fragen, die während des
 * Tests aufkommen (zählt das? wann höre ich auf?), und zuletzt das, was
 * beim nächsten Mal wieder gleich sein muss.
 *
 * Eine aus dem Testmodus abgeleitete Vorschrift ist als solche
 * gekennzeichnet. Ohne diese Kennzeichnung läse sich ein allgemeiner
 * Hinweis wie ein geprüftes Protokoll.
 */
export function ProcedurePanel({ test }: { test: TestDefinition }) {
  const { t } = useTranslation()
  const { source } = procedureFor(test)

  return (
    <Panel>
      <PanelHeader
        title={t('procedure.title')}
        subtitle={t('procedure.intro')}
        action={source === 'generic' ? <span className="label-tag">{t('procedure.genericTag')}</span> : undefined}
      />
      {source === 'generic' && (
        <p className="border-b border-line px-4 py-2 text-[12px] text-ink-muted">{t('procedure.genericHint')}</p>
      )}
      <ProcedureBody test={test} />
    </Panel>
  )
}

/**
 * Dieselbe Vorschrift während der Durchführung: zugeklappt, weil dort das
 * Formular die Hauptsache ist — aber erreichbar, ohne die Seite zu wechseln
 * und die begonnene Eingabe zu verlieren.
 */
export function ProcedureDetails({ test }: { test: TestDefinition }) {
  const { t } = useTranslation()
  const { source } = procedureFor(test)

  return (
    <details className="border-t border-line">
      <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-semibold">
        {t('procedure.title')}
        {source === 'generic' && <span className="label-tag ml-2">{t('procedure.genericTag')}</span>}
      </summary>
      <ProcedureBody test={test} />
    </details>
  )
}

function ProcedureBody({ test }: { test: TestDefinition }) {
  const { procedure } = procedureFor(test)
  return <ProcedureContent procedure={procedure} />
}

/** Der Inhalt einer Vorschrift — für Tests und für Beobachtungswerte gleich. */
export function ProcedureContent({ procedure }: { procedure: TestProcedure }) {
  const { t } = useTranslation()
  const locale = useLocale()

  return (
    <>
      {procedure.goal && (
        <p className="border-t border-line px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
          <span className="label-tag mr-2">{t('procedure.goal')}</span>
          {pick(procedure.goal, locale)}
        </p>
      )}
      {procedure.figure && <TestFigure id={procedure.figure.id} alt={pick(procedure.figure.alt, locale)} />}
      <dl className="divide-y divide-line border-t border-line">
        {procedure.setup && <Block label={t('procedure.setup')} items={[procedure.setup]} locale={locale} />}
        {procedure.steps && procedure.steps.length > 0 && (
          <Steps label={t('procedure.steps')} items={procedure.steps} locale={locale} />
        )}
        {procedure.timeSpec && <Block label={t('procedure.time')} items={[procedure.timeSpec]} locale={locale} />}
        {procedure.distanceSpec && (
          <Block label={t('procedure.distance')} items={[procedure.distanceSpec]} locale={locale} />
        )}
        <Block label={t('procedure.prepare')} items={procedure.prepare} locale={locale} />
        <Block label={t('procedure.attempts')} items={procedure.attempts ? [procedure.attempts] : []} locale={locale} />
        <Block label={t('procedure.valid')} items={procedure.valid} locale={locale} />
        <Block label={t('procedure.abort')} items={procedure.abort} locale={locale} />
        <Block label={t('procedure.standardise')} items={procedure.standardise} locale={locale} />
        {procedure.scoring && (
          <Block
            label={t('procedure.scoring')}
            items={[procedure.scoring]}
            locale={locale}
            note={t('procedure.scoringNote')}
          />
        )}
      </dl>
      {procedure.origin && (
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">
          {t('procedure.origin', { origin: procedure.origin })}
        </p>
      )}
    </>
  )
}

function Block({
  label,
  items,
  locale,
  note,
}: {
  label: string
  items: Bilingual[]
  locale: AppLocale
  note?: string
}) {
  // Ein leerer Block wäre eine Überschrift über nichts.
  if (items.length === 0) return null
  return (
    <div className="px-4 py-3">
      <dt className="label-tag">{label}</dt>
      <dd className="mt-1.5">
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--line-strong)]" />
              <span>{pick(item, locale)}</span>
            </li>
          ))}
        </ul>
        {note && <p className="mt-2 text-[11px] text-ink-muted">{note}</p>}
      </dd>
    </div>
  )
}

function Steps({ label, items, locale }: { label: string; items: Bilingual[]; locale: AppLocale }) {
  return (
    <div className="px-4 py-3">
      <dt className="label-tag">{label}</dt>
      <dd className="mt-1.5">
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-secondary marker:text-ink-muted">
          {items.map((item, i) => (
            <li key={i}>{pick(item, locale)}</li>
          ))}
        </ol>
      </dd>
    </div>
  )
}
