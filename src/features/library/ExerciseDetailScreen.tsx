import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { resolveByName, substitutes } from '@/domain/library'
import { REGISTRY_TO_LEGACY } from '@/data/library/legacyExerciseMap'
import { exerciseImageUrl } from '@/data/exerciseImages'
import { useExerciseText, useLibrary } from './useLibrary'
import { CoachPill, ComplexityDot, GermanOnlyNote } from './bits'

/**
 * Übungsdetail: der kanonische Datensatz der Übungsdatenbank. Ausführung als
 * Schritte, Belastungshinweise oben («prüfen / Variante wählen», keine
 * Diagnose), erlaubte Eingabefelder, Varianten-Graph und Ersatz nach
 * Bewegungsmuster. Der Transfer-Text ist Recherche, keine geprüfte
 * Sportzuordnung — so steht es auch da.
 */
export function ExerciseDetailScreen() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { exercises } = useLibrary()
  const e = exercises?.find((x) => x.id === id) ?? null
  const subs = useMemo(() => (e && exercises ? substitutes(e, exercises) : []), [e, exercises])
  const text = useExerciseText(e?.category, e?.id)

  if (!exercises) return <p className="text-[14px] text-ink-secondary" data-testid="lib-loading">{t('lib.loading')}</p>
  if (!e) return <EmptyState title={t('lib.notFound')} body={t('lib.notFoundBody')} />
  if (text === undefined) return <p className="text-[14px] text-ink-secondary" data-testid="lib-loading">{t('lib.loading')}</p>
  const x = text ?? { steps: [], cues: '', errors: '', muscles: '', abilities: '', sportsNote: '', transfer: '', sources: [] }

  const legacy = REGISTRY_TO_LEGACY[e.id]
  const img = legacy ? exerciseImageUrl(legacy) : null
  const variant = (name: string) => {
    const hit = resolveByName(name, exercises)
    return hit ? <Link to={`/plan/uebungen/${hit.id}`} className="text-accent-text underline underline-offset-2">{name}</Link> : <span>{name}</span>
  }

  return (
    <div data-testid="exercise-detail">
      <ScreenHeader eyebrow={t(`lib.cat.${e.category}`)} title={e.name} intro={e.section} />
      <GermanOnlyNote />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1"><ComplexityDot level={e.complexity} />{t(`lib.complexity.${e.complexity}`)}</span>
        <CoachPill gate={e.coachGate} />
        {e.coachGate === 'SELF_GUIDED_WITH_CUES' && <span className="rounded-pill border border-line px-3 py-1">{t('lib.coach.SELF_GUIDED_WITH_CUES')}</span>}
      </div>

      {e.caution.length > 0 && (
        <div data-testid="ex-caution" className="mb-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px]">
          <p className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle size={16} aria-hidden className="text-warning" />{t('lib.cautionTitle')}</p>
          <ul className="space-y-1 text-ink-secondary">{e.caution.map((c) => <li key={c}>{t(`lib.caution.${c}`)}</li>)}</ul>
          <p className="mt-1 text-[12px] text-ink-muted">{t('lib.cautionNote')}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel data-testid="ex-steps">
          <PanelHeader title={t('lib.execution')} />
          <div className="px-4 pb-4">
            {img && <img src={img} alt="" width={320} height={200} loading="lazy" className="mb-3 h-40 w-full rounded object-cover" />}
            <ol className="space-y-2 text-[14px]">
              {x.steps.map((s, i) => (
                <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-quiet text-[12px] text-accent-text">{i + 1}</span><span>{s}</span></li>
              ))}
            </ol>
            {x.cues && <p className="mt-3 text-[13px]"><span className="label-tag">{t('lib.cues')}</span><br />{x.cues}</p>}
            {x.errors && <p className="mt-3 text-[13px]"><span className="label-tag">{t('lib.errors')}</span><br />{x.errors}</p>}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title={t('lib.muscles')} />
            <div className="space-y-2 px-4 pb-4 text-[14px]"><p>{x.muscles}</p><p className="text-ink-secondary">{x.abilities}</p></div>
          </Panel>

          <Panel data-testid="ex-params">
            <PanelHeader title={t('lib.parameters')} />
            <div className="px-4 pb-4">
              <p className="mb-2 text-[12px] text-ink-secondary">{t('lib.parametersNote')}</p>
              <ul className="flex flex-wrap gap-2">{e.parameters.map((p) => <li key={p} className="rounded-pill border border-line px-3 py-1 text-[12px]">{t(`lib.param.${p}`)}</li>)}</ul>
              <p className="mt-3 text-[12px] text-ink-secondary">{t('lib.equipment')}: {e.equipment.map((q) => t(`lib.eq.${q}`)).join(', ')}</p>
              <p className="mt-1 text-[12px] text-ink-secondary">{t('lib.patterns')}: {e.patterns.map((p) => t(`lib.pattern.${p}`)).join(', ')}</p>
            </div>
          </Panel>

          <Panel data-testid="ex-variants">
            <PanelHeader title={t('lib.variants')} />
            <div className="space-y-2 px-4 pb-4 text-[14px]">
              <p><span className="label-tag">{t('lib.regression')}</span><br />{e.regressions.length ? e.regressions.map((r, i) => <span key={r}>{i > 0 && ' · '}{variant(r)}</span>) : '—'}</p>
              <p><span className="label-tag">{t('lib.progression')}</span><br />{e.progressions.length ? e.progressions.map((r, i) => <span key={r}>{i > 0 && ' · '}{variant(r)}</span>) : '—'}</p>
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="mt-4" data-testid="ex-substitutes">
        <PanelHeader title={t('lib.substitutes')} />
        <div className="px-4 pb-4">
          <p className="mb-2 text-[12px] text-ink-secondary">{t('lib.substitutesNote')}</p>
          {subs.length === 0 ? <p className="text-[14px] text-ink-secondary">—</p> : (
            <ul>{subs.map((s) => <li key={s.id}><Link to={`/plan/uebungen/${s.id}`} className="flex min-h-11 items-center gap-2 text-[14px] text-accent-text underline-offset-2 hover:underline"><ComplexityDot level={s.complexity} />{s.name}</Link></li>)}</ul>
          )}
        </div>
      </Panel>

      <Panel className="mt-4" data-testid="ex-transfer">
        <PanelHeader title={t('lib.transfer')} />
        <div className="space-y-3 px-4 pb-4 text-[14px]">
          <p className="text-[12px] text-ink-secondary" data-testid="ex-transfer-note">{t('lib.transferNote')}</p>
          <p>{x.transfer}</p>
          <p className="text-[13px] text-ink-secondary"><span className="label-tag">{t('lib.sportsNote')}</span><br />{x.sportsNote}</p>
          {x.sources.length > 0 && (
            <div>
              <span className="label-tag">{t('lib.sources')}</span>
              <ul className="mt-1 space-y-1">{x.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text underline underline-offset-2">{s.label}<ExternalLink size={12} aria-hidden /></a></li>)}</ul>
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}

export default ExerciseDetailScreen
