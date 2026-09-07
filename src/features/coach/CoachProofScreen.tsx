import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Printer } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { coachProof } from '@/domain/coachProof'
import { DETECTION_FACTOR } from '@/domain/change'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pick } from '@/i18n/pick'

/**
 * Wirksamkeitsnachweis — für den Druck gebaut, wie der Bericht.
 *
 * Die Zahlen oben sind die, die jemand einem Vorstand zeigt. Die Tabellen
 * darunter sind die, die er zeigt, wenn nachgefragt wird. Rückgänge und
 * unbelegte Veränderungen stehen mit derselben Schriftgrösse dabei — ein
 * Nachweis, der nur die Gewinne zeigt, ist Werbung.
 */
export function CoachProofScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { athletes, role, store } = useAppData()
  const proof = useMemo(() => coachProof(athletes), [athletes])
  const nothing = proof.athletes.every((a) => a.testsCompared === 0)

  return (
    <>
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/trainer">
            <ArrowLeft size={14} aria-hidden />
            {t('coachDash.title')}
          </Link>
        </Button>
      </div>
      <ScreenHeader
        eyebrow={store.branding.organisation || t('coachDash.title')}
        title={t('coachDash.proof.title')}
        intro={`${t('coachDash.proof.window', { from: formatDate(proof.from, locale), to: formatDate(proof.to, locale) })} · ${t('coachDash.proof.intro')}`}
        action={
          <Button variant="primary" size="sm" onClick={() => window.print()} className="no-print">
            <Printer size={14} aria-hidden />
            {t('coachDash.proof.print')}
          </Button>
        }
      />

      {role !== 'coach' || nothing ? (
        <EmptyState title={t('coachDash.proof.title')} body={t('coachDash.proof.empty')} />
      ) : (
        <>
          <div className="mb-4 grid gap-px bg-line sm:grid-cols-3 lg:grid-cols-6" data-testid="proof-stats">
            <Stat label={t('coachDash.proof.measured')} value={String(proof.athletesMeasured)} />
            <Stat label={t('coachDash.proof.withGain')} value={String(proof.athletesWithGain)} tone="good" />
            <Stat label={t('coachDash.proof.gains')} value={String(proof.totalGains)} tone="good" />
            <Stat label={t('coachDash.proof.drops')} value={String(proof.totalDrops)} tone={proof.totalDrops > 0 ? 'warn' : 'neutral'} />
            <Stat label={t('coachDash.proof.withinNoise')} value={String(proof.totalWithinNoise)} />
            <Stat
              label={t('coachDash.proof.medianGain')}
              value={proof.medianGainPercent == null ? '—' : `+${formatNumber(proof.medianGainPercent, locale, 1)} %`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title={t('coachDash.proof.perAthlete')} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-muted">
                      <th scope="col" className="px-3 py-2 font-medium">{t('coachDash.name')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.compared')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.gains')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.drops')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.withinNoise')}</th>
                      <th scope="col" className="px-3 py-2 font-medium">{t('coachDash.proof.bestGain')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proof.athletes.map((a) => (
                      <tr key={a.athleteId} className="border-b border-line last:border-b-0" data-testid="proof-row">
                        <th scope="row" className="px-3 py-2 text-left font-normal whitespace-nowrap">{a.name || t('coach.unnamed')}</th>
                        <td className="readout px-2 py-2 text-right tabular-nums">{a.testsCompared}</td>
                        <td className="readout px-2 py-2 text-right tabular-nums text-good">{a.gains}</td>
                        <td className={cn('readout px-2 py-2 text-right tabular-nums', a.drops > 0 && 'text-critical')}>{a.drops}</td>
                        <td className="readout px-2 py-2 text-right tabular-nums text-ink-secondary">{a.withinNoise}</td>
                        <td className="px-3 py-2 text-[12px] text-ink-secondary">
                          {a.bestGain
                            ? `${pick(getTest(a.bestGain.testSlug)?.shortName, locale) ?? a.bestGain.testSlug} +${formatNumber(a.bestGain.changePercent, locale, 1)} %`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title={t('coachDash.proof.perTest')} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-muted">
                      <th scope="col" className="px-3 py-2 font-medium">{t('tests.title')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.compared')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.gains')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.drops')}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">{t('coachDash.proof.withinNoise')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proof.tests.map((row) => (
                      <tr key={row.testSlug} className="border-b border-line last:border-b-0">
                        <th scope="row" className="px-3 py-2 text-left font-normal">{pick(getTest(row.testSlug)?.shortName, locale) ?? row.testSlug}</th>
                        <td className="readout px-2 py-2 text-right tabular-nums">{row.compared}</td>
                        <td className="readout px-2 py-2 text-right tabular-nums text-good">{row.gains}</td>
                        <td className={cn('readout px-2 py-2 text-right tabular-nums', row.drops > 0 && 'text-critical')}>{row.drops}</td>
                        <td className="readout px-2 py-2 text-right tabular-nums text-ink-secondary">{row.withinNoise}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}

      <p className="mt-4 max-w-[70ch] text-[12px] leading-relaxed text-ink-muted">
        {t('coachDash.proof.caveat', { factor: formatNumber(DETECTION_FACTOR, locale, 2) })}
      </p>
    </>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return (
    <div className="bg-plane px-4 py-3">
      <span className="label-tag">{label}</span>
      <p
        className={cn(
          'readout mt-1 font-display text-[26px] leading-none font-bold tabular-nums',
          tone === 'good' && 'text-accent-text',
          tone === 'warn' && 'text-warning',
        )}
      >
        {value}
      </p>
    </div>
  )
}
