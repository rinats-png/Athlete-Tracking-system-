import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useBilling } from '@/features/billing/BillingProvider'
import { consentStatus } from '@/domain/consent'
import { TEST_CATALOG, getTest } from '@/data/testCatalog'
import { bestInputIndex, doneOnDay, kioskResult, kioskSupported, MAX_ATTEMPTS, nextOpen, type AttemptInput } from '@/domain/kiosk'
import { formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Kiosk-Modus (Produktdoktrin §16): ein Gerät an der Station.
 *
 * Kein Dashboard, keine Navigation, kein Abmelden je Athlet. Athlet antippen,
 * bis zu drei Versuche, ungültige markieren, der beste gültige zählt, weiter
 * zum nächsten. Läuft ohne Netz; alles bleibt auf dem Gerät. Gespeichert wird
 * mit den Rohversuchen, ungültige bleiben stehen (nichts wird gelöscht).
 */
const parse = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(n) ? n : null
}

const blank = () => Array.from({ length: MAX_ATTEMPTS }, () => ({ text: '', valid: true }))

export function KioskScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const { role, athletes, testDays, recordKioskResult } = useAppData()
  const billing = useBilling()
  const [params] = useSearchParams()
  const [slug, setSlug] = useState(() => {
    const wanted = params.get('test')
    return wanted && getTest(wanted) ? wanted : ''
  })
  const [day, setDay] = useState(() => params.get('tag') ?? new Date().toISOString().slice(0, 10))
  const [selected, setSelected] = useState<string | null>(null)
  const [fields, setFields] = useState(blank)
  const [flash, setFlash] = useState<string | null>(null)

  const test = slug ? getTest(slug) : undefined
  const roster = useMemo(() => {
    const dayPlan = testDays.find((d) => d.plannedOn === day && d.testSlugs.includes(slug))
    const all = athletes.filter((a) => !a.archived)
    return dayPlan ? all.filter((a) => dayPlan.athleteIds.includes(a.id)) : all
  }, [athletes, testDays, day, slug])
  const done = useMemo(() => doneOnDay(roster, slug, day), [roster, slug, day])
  const order = useMemo(() => roster.map((a) => a.id), [roster])
  const selectedAthlete = roster.find((a) => a.id === selected) ?? null
  const dayPlan = testDays.find((d) => d.plannedOn === day && d.testSlugs.includes(slug))

  if (role !== 'coach') {
    return <EmptyState title={t('group.soloTitle')} body={t('group.soloBody')} action={<Button asChild variant="primary" size="md"><Link to="/profil">{t('coachDash.switchMode')}</Link></Button>} />
  }

  const inputs: AttemptInput[] = fields.map((f) => ({ value: parse(f.text), valid: f.valid }))
  const preview = slug ? kioskResult(slug, inputs) : null
  const bestIdx = slug ? bestInputIndex(slug, inputs) : -1
  const blocked = (a: (typeof roster)[number]) => !consentStatus(a).mayRecord || !billing.mayMeasure(a)

  const pick1 = (id: string) => {
    setSelected(id)
    setFields(blank())
    setFlash(null)
  }

  const save = () => {
    if (!test || !selectedAthlete || !preview) return
    const performedAt = new Date(`${day}T12:00:00`).toISOString()
    const ok = recordKioskResult(selectedAthlete.id, slug, performedAt, preview, dayPlan?.conditions)
    if (!ok) return
    const value = Object.values(preview.values)[0]
    setFlash(t('kiosk.saved', { name: selectedAthlete.name || t('group.unnamed'), value: formatNumber(value, locale, 2), unit: test.primaryUnit }))
    const nowDone = new Set(done).add(selectedAthlete.id)
    const next = nextOpen(order.filter((id) => !blocked(roster.find((a) => a.id === id)!)), nowDone, selectedAthlete.id)
    setFields(blank())
    setSelected(next)
  }

  const exit = () => navigate(dayPlan ? `/trainer/testtag/${dayPlan.id}` : '/trainer/testtag')

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]" data-testid="kiosk">
      <header className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="label-tag">{t('kiosk.title')}</p>
          <p className="truncate font-display text-[22px] leading-tight font-bold">{test ? `${pick(test.name, locale)} · ${test.primaryUnit}` : t('kiosk.chooseTest')}</p>
        </div>
        <Button variant="outline" size="md" onClick={exit} data-testid="kiosk-exit">
          <X size={16} aria-hidden />
          {t('kiosk.exit')}
        </Button>
      </header>

      {!test && (
        <div className="space-y-3" data-testid="kiosk-setup">
          <label className="block">
            <span className="label-tag">{t('table.test')}</span>
            <select className="mt-1 min-h-14 w-full border border-line bg-surface px-3 text-[16px]" value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="kiosk-test">
              <option value="">{t('group.chooseTest')}</option>
              {TEST_CATALOG.filter((e) => kioskSupported(e.slug)).map((e) => (
                <option key={e.slug} value={e.slug}>{pick(e.name, locale)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-tag">{t('group.day')}</span>
            <input type="date" className="mt-1 min-h-14 w-full border border-line bg-surface px-3 text-[16px]" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <p className="text-[12px] text-ink-muted">{t('kiosk.supportedNote')}</p>
        </div>
      )}

      {test && !kioskSupported(slug) && (
        <EmptyState title={t('kiosk.unsupportedTitle')} body={t('kiosk.unsupportedBody')} action={<Button asChild variant="primary" size="md"><Link to={`/trainer/gruppentest?test=${slug}&tag=${day}`}>{t('group.title')}</Link></Button>} />
      )}

      {test && kioskSupported(slug) && (
        <>
          <div className="mb-3" aria-live="polite">
            <div className="flex items-center justify-between text-[13px] text-ink-secondary">
              <span data-testid="kiosk-progress">{t('kiosk.progress', { done: done.size, total: roster.length })}</span>
              {flash && <span role="status" className="text-accent-text" data-testid="kiosk-flash">{flash}</span>}
            </div>
            <div className="mt-1.5 h-2 rounded-pill bg-surface-sunken" aria-hidden>
              <i className="block h-full rounded-pill bg-accent" style={{ width: `${roster.length === 0 ? 0 : (done.size / roster.length) * 100}%` }} />
            </div>
          </div>

          {roster.length === 0 && <p className="py-6 text-[15px] text-ink-secondary">{t('group.noAthletes')}</p>}

          {!selectedAthlete && roster.length > 0 && done.size === roster.length && (
            <div className="rounded-lg border border-line p-6 text-center" data-testid="kiosk-all-done">
              <p className="font-display text-[26px] font-bold">{t('kiosk.allDone')}</p>
              <p className="mt-1 text-[14px] text-ink-secondary">{t('kiosk.allDoneBody')}</p>
              <Button asChild variant="primary" size="lg" className="mt-4"><Link to="/trainer/gruppenbericht">{t('kiosk.report')}</Link></Button>
            </div>
          )}

          {!selectedAthlete && roster.length > 0 && done.size < roster.length && (
            <>
              <Button variant="primary" size="lg" className="mb-3 min-h-16 w-full text-[18px]" onClick={() => { const n = nextOpen(order.filter((id) => !blocked(roster.find((a) => a.id === id)!)), done, null); if (n) pick1(n) }} data-testid="kiosk-next-open">
                {t('kiosk.nextOpen')}
                <ChevronRight size={20} aria-hidden />
              </Button>
              <ul className="grid gap-2 sm:grid-cols-2" data-testid="kiosk-list">
                {roster.map((a) => {
                  const isDone = done.has(a.id)
                  const isBlocked = blocked(a)
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        disabled={isBlocked}
                        onClick={() => pick1(a.id)}
                        data-testid={`kiosk-athlete-${a.id}`}
                        className={cn('flex min-h-16 w-full items-center gap-3 rounded-lg border px-4 text-left text-[17px]', isDone ? 'border-accent bg-accent-quiet' : 'border-line bg-surface', isBlocked && 'opacity-50')}
                      >
                        <span className="min-w-0 flex-1 truncate">{a.name || t('group.unnamed')}</span>
                        {isDone && <Check size={20} aria-hidden className="text-accent-text" />}
                        {isBlocked && <span className="text-[11px] text-ink-muted">{t('kiosk.blocked')}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {selectedAthlete && (
            <section data-testid="kiosk-entry" aria-label={selectedAthlete.name}>
              <p className="font-display text-[34px] leading-tight font-bold" data-testid="kiosk-athlete-name">{selectedAthlete.name || t('group.unnamed')}</p>
              <ul className="mt-3 space-y-3">
                {fields.map((f, i) => {
                  const isBest = bestIdx === i
                  const invalid = !f.valid
                  return (
                    <li key={i} className={cn('rounded-lg border p-3', isBest ? 'border-accent bg-accent-quiet' : 'border-line')} data-testid={`kiosk-attempt-${i + 1}`}>
                      <div className="flex items-center justify-between">
                        <span className="label-tag">{t('kiosk.attempt', { n: i + 1 })}</span>
                        {isBest && <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-text" data-testid="kiosk-best"><Check size={14} aria-hidden />{t('kiosk.best')}</span>}
                        {invalid && <span className="text-[12px] text-ink-muted">{t('kiosk.invalid')}</span>}
                      </div>
                      <div className="mt-2 flex items-stretch gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t('kiosk.attempt', { n: i + 1 })} (${test.primaryUnit})`}
                          value={f.text}
                          onChange={(e) => setFields((cur) => cur.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                          className={cn('min-h-16 w-full min-w-0 flex-1 border border-line bg-surface px-4 text-[30px] readout', invalid && 'line-through opacity-60')}
                          data-testid={`kiosk-input-${i + 1}`}
                        />
                        <button
                          type="button"
                          aria-pressed={invalid}
                          onClick={() => setFields((cur) => cur.map((x, j) => (j === i ? { ...x, valid: !x.valid } : x)))}
                          className={cn('min-h-16 min-w-24 rounded-md border px-3 text-[14px]', invalid ? 'border-ink-secondary bg-surface-sunken' : 'border-line')}
                          data-testid={`kiosk-invalid-${i + 1}`}
                        >
                          {t('kiosk.markInvalid')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="primary" size="lg" className="min-h-16 text-[18px]" disabled={!preview} onClick={save} data-testid="kiosk-save">
                  {t('kiosk.saveNext')}
                </Button>
                <Button variant="outline" size="lg" className="min-h-16" onClick={() => setSelected(null)} data-testid="kiosk-back">
                  {t('kiosk.backToList')}
                </Button>
              </div>
              <p className="mt-3 text-[12px] text-ink-muted">{t('kiosk.rule')}</p>
            </section>
          )}
        </>
      )}

      <p className="mt-auto pt-6 text-[11px] text-ink-muted">{t('kiosk.offline')}</p>
    </div>
  )
}
