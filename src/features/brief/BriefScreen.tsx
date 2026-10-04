import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { mondayBrief } from '@/domain/mondayBrief'
import { getTest } from '@/data/testCatalog'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { PhraseButton } from '@/components/PhraseButton'
import { phraseEnabled } from '@/lib/supabase/phrase'

/**
 * Montagsbrief: eine Seite, die Fakten der Woche in der Sprache des Nutzers
 * ausschreibt. Kein Rat, keine Wertung — der nächste Schritt ist eine Messung.
 */
export function BriefScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, diary, workouts } = useAppData()
  const brief = useMemo(
    () => mondayBrief({ athlete: { profile: data.profile, results: data.results, workouts, diary }, reminders: reminderSettingsOf(data.profile) }),
    [data.profile, data.results, workouts, diary],
  )
  const name = (slug: unknown) => pick(getTest(String(slug))?.name, locale) ?? String(slug)
  const d = (day: string) => formatDate(`${day}T12:00:00Z`, locale)
  const f = (key: string) => brief.facts.find((x) => x.key === key)
  const num = (v: unknown, digits = 1) => formatNumber(Number(v), locale, digits)

  const form = f('form')!
  const finding = f('finding')
  const load = f('load') ?? f('loadNoBaseline')!
  const next = f('nextOverdue') ?? f('nextMissing') ?? f('nextNone')!
  const checkins = f('checkins')!
  const plan = f('plan')
  const countdown = f('countdown')

  return (
    <div data-testid="monday-brief">
      <ScreenHeader eyebrow={t('brief.eyebrow')} title={t('brief.title')} intro={t('brief.range', { from: d(brief.from), to: d(brief.to) })} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel data-testid="brief-form">
          <PanelHeader title={t('brief.form.title')} />
          <p className="px-4 pb-4 text-[14px]">{t('brief.form.text', { level: t(`performance.level.${String(form.params.level)}`) })}</p>
        </Panel>
        <Panel data-testid="brief-finding">
          <PanelHeader title={t('brief.finding.title')} />
          <p className="px-4 pb-4 text-[14px]">
            {finding
              ? t('brief.finding.text', { name: name(finding.params.slug), percent: num(finding.params.percent), detectable: num(finding.params.detectable) })
              : t('brief.finding.none')}
          </p>
        </Panel>
        <Panel data-testid="brief-load">
          <PanelHeader title={t('brief.load.title')} />
          <div className="px-4 pb-4 text-[14px]">
            <p>{load.key === 'load' ? t('brief.load.compare', { week: num(load.params.week, 0), mean: num(load.params.mean, 0) }) : t('brief.load.noBaseline', { week: num(load.params.week, 0) })}</p>
            <p className="mt-1 text-ink-secondary">{t('brief.checkins', { count: Number(checkins.params.days) })}</p>
            <p className="mt-2 text-[11px] text-ink-muted">{t('brief.load.note')}</p>
          </div>
        </Panel>
        {(plan || countdown) && (
          <Panel data-testid="brief-plan">
            <PanelHeader title={t('brief.plan.title')} />
            <div className="space-y-1 px-4 pb-4 text-[14px]">
              {countdown && <p>{t(countdown.params.name ? 'brief.plan.countdownNamed' : 'brief.plan.countdown', { days: Number(countdown.params.days), name: String(countdown.params.name) })}</p>}
              {plan && Number(plan.params.sessionsTarget) >= 0 && (
                <p>{t('brief.plan.sessions', { actual: Number(plan.params.sessions), target: Number(plan.params.sessionsTarget) })}</p>
              )}
              {plan && Number(plan.params.loadTarget) >= 0 && (
                <p>{t('brief.plan.load', { actual: num(plan.params.load, 0), target: num(plan.params.loadTarget, 0) })}</p>
              )}
              {plan && <p className="pt-1 text-[11px] text-ink-muted">{t('brief.plan.note')}</p>}
            </div>
          </Panel>
        )}
        <Panel data-testid="brief-next">
          <PanelHeader title={t('brief.next.title')} />
          <div className="px-4 pb-4 text-[14px]">
            <p>
              {next.key === 'nextOverdue' && t('brief.next.overdue', { name: name(next.params.slug), days: Number(next.params.days) })}
              {next.key === 'nextMissing' && t('brief.next.missing', { name: name(next.params.slug) })}
              {next.key === 'nextNone' && t('brief.next.none')}
            </p>
            {next.key !== 'nextNone' && (
              <Link to={`/tests/${String(next.params.slug)}`} className="mt-1 inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
                {t('brief.next.open')}
              </Link>
            )}
          </div>
        </Panel>
      </div>
      {phraseEnabled() && (
        <Panel className="mt-4" data-testid="brief-phrase">
          <PhraseButton kind="brief" facts={brief.facts} />
        </Panel>
      )}
      <p className="mt-3 text-[11px] text-ink-muted">{t('brief.note')}</p>
    </div>
  )
}
