import { useTranslation } from 'react-i18next'
import { TRAINING_RULES, TRAINING_SOURCES } from '@/data/trainingRules'
import { templateById } from '@/data/planTemplates'
import { getTest } from '@/data/testCatalog'
import { pick } from '@/i18n/pick'
import { useLocale } from '@/features/shared/useLocale'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * «Warum diese Einheit?» (Trainingsbereich Etappe 7): die Begründung einer
 * Einheit, ohne Chat und ohne Sprachmodell. Alles stammt aus dem Block und
 * dem Regelregister: Regel und Version, Evidenz, Spezifität, Prüfstatus,
 * Grenzen, Quellen, Messgröße am Blockende, Änderung des Trainers. Wo es
 * keine belegte Dosis gibt (offene oder eigene Einheit), sagt der Text das.
 */
export function SessionWhy({ session, block }: { session: StoredPlannedSession; block: StoredTrainingBlock }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const rule = session.ruleId ? TRAINING_RULES.find((r) => r.id === session.ruleId) : null
  const tpl = templateById(block.templateId)
  const retest = session.retestMetric ? pick(getTest(session.retestMetric)?.name, locale) ?? session.retestMetric : null
  return (
    <details className="mt-2 text-[13px]" data-testid={`why-${session.id}`}>
      <summary className="min-h-11 cursor-pointer py-2 text-accent-text" data-testid={`why-open-${session.id}`}>{t('why.title')}</summary>
      <div className="space-y-2 rounded-md border border-line bg-surface-sunken px-3 py-3">
        <p>{t('why.intent', { intent: t(`plan.intent.${session.primaryIntent}`) })}</p>
        {tpl && <p>{t('why.template', { name: t(`tpl.t.${tpl.id}.name`) })}</p>}
        {rule ? (
          <>
            <p>{t('why.rule', { rule: t(`plan.rules.${rule.id}.title`), version: session.ruleVersion ?? rule.version })}</p>
            <p className="flex flex-wrap gap-1.5 text-[11px]">
              {session.evidenceStrength && <span className="rounded-pill border border-line px-2.5 py-0.5">{t('plan.evidence.strength', { level: t(`plan.strength.${session.evidenceStrength}`) })}</span>}
              {session.evidenceSpecificity && <span className="rounded-pill border border-line px-2.5 py-0.5">{t('plan.evidence.specificity', { level: t(`plan.specificity.${session.evidenceSpecificity}`) })}</span>}
              <span className="rounded-pill border border-line px-2.5 py-0.5">{rule.review.state === 'reviewed' ? t('plan.review.reviewed', { name: rule.review.reviewer, date: rule.review.reviewedOn }) : t('plan.review.unreviewed')}</span>
            </p>
            <div>
              <p className="font-medium">{t('plan.limits')}</p>
              <ul className="list-disc pl-5 text-ink-secondary">{rule.evidence.limitations.map((_, i) => <li key={i}>{t(`plan.rules.${rule.id}.limit${i}`)}</li>)}</ul>
            </div>
            <div>
              <p className="font-medium">{t('plan.sources')}</p>
              <ul className="list-disc pl-5 text-ink-secondary">
                {rule.evidence.sourceIds.map((id) => {
                  const src = TRAINING_SOURCES[id]
                  return <li key={id}>{src.url ? <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{src.citation}</a> : src.citation}</li>
                })}
              </ul>
            </div>
            <p className="text-ink-secondary">{t('why.day')}</p>
          </>
        ) : session.kind === 'own' ? (
          <p data-testid={`why-own-${session.id}`}>{t('why.own')}</p>
        ) : (
          <p data-testid={`why-openline-${session.id}`}>{t('why.open')}</p>
        )}
        {retest && <p>{t('why.retest', { test: retest })}</p>}
        {session.coachModified && <p data-testid={`why-coach-${session.id}`}>{t('why.coach', { reason: session.coachModificationReason ?? '' })}</p>}
      </div>
    </details>
  )
}
