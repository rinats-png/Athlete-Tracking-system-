import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { answer, askableTests, QUESTIONS, type Fact, type QuestionKey } from '@/domain/askKydon'
import { getTest } from '@/data/testCatalog'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Fragen an KYDON (Produktdoktrin §30): feste Fragen, deterministische
 * Antworten. Die Fakten kommen aus `domain/askKydon`, hier werden sie nur in
 * der Sprache des Nutzers ausgeschrieben.
 */
export function AskScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, workouts } = useAppData()
  const tests = useMemo(() => askableTests(data.results), [data.results])
  const [question, setQuestion] = useState<QuestionKey>('changed')
  const [slug, setSlug] = useState<string | null>(null)
  const needsTest = QUESTIONS.find((q) => q.key === question)?.needsTest ?? false
  const testSlug = slug ?? tests[0] ?? null

  const result = useMemo(
    () => answer(question, { athlete: { profile: data.profile, results: data.results, workouts }, reminders: reminderSettingsOf(data.profile), testSlug }),
    [question, data.profile, data.results, workouts, testSlug],
  )
  const name = (s: string) => pick(getTest(s)?.name, locale) ?? s

  const text = (f: Fact): string => {
    const p: Record<string, unknown> = { ...f.params }
    if (typeof p.slug === 'string') p.name = name(p.slug)
    let key = `ask.fact.${f.key}`
    if (f.key === 'verdict' || f.key === 'changed') key = `ask.fact.${f.key}_${String(p.verdict)}`
    if (f.key === 'level') return t('ask.fact.level', { level: t(`performance.level.${String(p.level)}`) })
    if (f.key === 'component') p.name = t(`ask.comp.${String(p.name)}`)
    return t(key, p)
  }

  return (
    <div data-testid="ask-screen">
      <ScreenHeader eyebrow={t('ask.eyebrow')} title={t('ask.title')} intro={t('ask.intro')} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('ask.title')}>
        {QUESTIONS.map((q) => (
          <button
            key={q.key}
            type="button"
            data-testid={`ask-q-${q.key}`}
            aria-pressed={question === q.key}
            onClick={() => setQuestion(q.key)}
            className={cn('min-h-11 rounded-pill border px-4 text-[13px]', question === q.key ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line hover:bg-surface-sunken')}
          >
            {t(`ask.q.${q.key}`)}
          </button>
        ))}
      </div>

      {needsTest && (
        <div className="mb-4">
          {tests.length === 0 ? (
            <p className="text-[13px] text-ink-secondary">{t('ask.noTests')}</p>
          ) : (
            <label className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-ink-secondary">{t('ask.chooseTest')}</span>
              <select data-testid="ask-test" value={testSlug ?? ''} onChange={(e) => setSlug(e.target.value)} className="min-h-11 rounded-md border border-line bg-surface px-3">
                {tests.map((s) => (
                  <option key={s} value={s}>
                    {name(s)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <Panel data-testid="ask-answer">
        <PanelHeader title={t(`ask.q.${question}`)} />
        <ul className="space-y-2 px-4 pb-3 text-[14px] leading-relaxed">
          {result.facts.map((f, i) => (
            <li key={`${f.key}-${i}`}>{text(f)}</li>
          ))}
        </ul>
        {result.link && (
          <p className="px-4 pb-3">
            <Link to={result.link} className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
              {t('ask.details')}
            </Link>
          </p>
        )}
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('ask.note')}</p>
      </Panel>
    </div>
  )
}
