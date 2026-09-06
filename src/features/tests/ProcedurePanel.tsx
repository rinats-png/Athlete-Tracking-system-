import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useLocale } from '@/features/shared/useLocale'
import { procedureFor } from '@/data/testProcedure'
import type { Bilingual } from '@/data/testProcedure'
import type { TestDefinition } from '@/data/testCatalog'

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
  const { t } = useTranslation()
  const locale = useLocale()
  const { procedure } = procedureFor(test)

  return (
    <>
      <dl className="divide-y divide-line border-t border-line">
        <Block label={t('procedure.prepare')} items={procedure.prepare} locale={locale} />
        <Block label={t('procedure.attempts')} items={[procedure.attempts]} locale={locale} />
        <Block label={t('procedure.valid')} items={procedure.valid} locale={locale} />
        <Block label={t('procedure.abort')} items={procedure.abort} locale={locale} />
        <Block label={t('procedure.standardise')} items={procedure.standardise} locale={locale} />
      </dl>
      {procedure.origin && (
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">
          {t('procedure.origin', { origin: procedure.origin })}
        </p>
      )}
    </>
  )
}

function Block({ label, items, locale }: { label: string; items: Bilingual[]; locale: 'de' | 'en' }) {
  return (
    <div className="px-4 py-3">
      <dt className="label-tag">{label}</dt>
      <dd className="mt-1.5">
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--line-strong)]" />
              <span>{item[locale]}</span>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  )
}
