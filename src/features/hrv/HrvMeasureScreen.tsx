import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bluetooth, Check, HeartPulse, Square } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { StatTile } from '@/components/ui/StatTile'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { MetricMeta } from '@/features/shared/MetricMeta'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { bluetoothSupport, connectHeartRate, type BluetoothSupport, type HeartRateConnection } from '@/lib/bluetooth/heartRate'
import { analyzeHrv, HRV_DEFAULT_DURATION_S, HRV_DURATIONS_S, HRV_SETTLE_S, type Beat, type HrvResult } from '@/domain/hrv'
import { HEART_RATE_STRAPS } from '@/data/heartRateStraps'
import { formatDuration, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const CONSENT_KEY = 'kydon.hrv.consent.v1'

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) != null
  } catch {
    return false
  }
}

type Phase = 'idle' | 'connecting' | 'measuring' | 'done'
type Failure = 'cancelled' | 'failed' | 'lost' | 'no_rr' | null

/**
 * HRV-Messung mit dem Brustgurt (Web Bluetooth).
 *
 * ABLAUF: Einwilligung (einmal je Gerät) → Protokoll lesen, Dauer wählen →
 * Gurt verbinden → 30 s Einschwingen → Messen → Ergebnis mit Datenlage →
 * speichern als zwei Beobachtungswerte (RMSSD und Ruhepuls). Von dort fliessen
 * sie in den Tageskontext, gegen die eigene Bandbreite.
 *
 * WARUM EINE EIGENE EINWILLIGUNG: Puls und Herzratenvariabilität sind
 * Gesundheitsdaten (Art. 9 DSGVO). Gemessen wird auf dem Gerät; gespeichert
 * wird nur das Ergebnis, nicht die Schlagfolge.
 *
 * WO ES NICHT GEHT, steht es vorher da: Safari auf iPhone und iPad kennt Web
 * Bluetooth nicht. Der Wert lässt sich dort weiter von Hand eintragen.
 */
export function HrvMeasureScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { addObservation } = useAppData()

  const [consent, setConsent] = useState(readConsent)
  const [support, setSupport] = useState<BluetoothSupport | null>(null)
  const [duration, setDuration] = useState<number>(HRV_DEFAULT_DURATION_S)
  const [phase, setPhase] = useState<Phase>('idle')
  const [failure, setFailure] = useState<Failure>(null)
  const [device, setDevice] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [liveHr, setLiveHr] = useState<number | null>(null)
  const [contact, setContact] = useState<boolean | null>(null)
  const [beatCount, setBeatCount] = useState(0)
  const [result, setResult] = useState<HrvResult | null>(null)
  const [saved, setSaved] = useState(false)

  const beats = useRef<Beat[]>([])
  const start = useRef(0)
  const connection = useRef<HeartRateConnection | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    void bluetoothSupport().then(setSupport)
  }, [])

  const stopTimer = () => {
    if (timer.current != null) window.clearInterval(timer.current)
    timer.current = null
  }

  const finish = useCallback(() => {
    stopTimer()
    connection.current?.disconnect()
    connection.current = null
    const r = analyzeHrv(beats.current)
    setResult(r)
    setFailure(beats.current.length === 0 ? 'no_rr' : null)
    setPhase('done')
  }, [])

  // Aufräumen beim Verlassen des Bildschirms.
  useEffect(() => () => {
    stopTimer()
    connection.current?.disconnect()
  }, [])

  const begin = async () => {
    setFailure(null)
    setResult(null)
    setSaved(false)
    setPhase('connecting')
    beats.current = []
    setBeatCount(0)
    setLiveHr(null)
    setContact(null)
    try {
      const conn = await connectHeartRate(
        (m) => {
          const at = Date.now() - start.current
          for (const rr of m.rr) beats.current.push({ at, rr })
          setBeatCount(beats.current.length)
          setLiveHr(m.hr)
          setContact(m.contact)
        },
        () => {
          // Verbindung verloren, bevor die Zeit um war.
          if (timer.current != null) {
            stopTimer()
            connection.current = null
            setFailure('lost')
            setPhase('idle')
          }
        },
      )
      connection.current = conn
      setDevice(conn.deviceName)
      start.current = Date.now()
      setElapsed(0)
      setPhase('measuring')
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - start.current) / 1000)
        setElapsed(s)
        if (s >= duration) finish()
      }, 250)
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      setFailure(name === 'NotFoundError' || name === 'AbortError' ? 'cancelled' : 'failed')
      setPhase('idle')
    }
  }

  const cancel = () => {
    stopTimer()
    connection.current?.disconnect()
    connection.current = null
    setPhase('idle')
  }

  const save = () => {
    if (!result || result.rejected || result.rmssd.value == null) return
    const observedAt = new Date().toISOString()
    const note = t('hrv.savedNote', { seconds: result.analysisSeconds, artifacts: formatNumber(result.artifactPct, locale, 1) })
    addObservation({ key: 'hrv_rmssd_ms', observedAt, value: Math.round(result.rmssd.value), device, note })
    if (result.meanHr != null) addObservation({ key: 'resting_hr_bpm', observedAt, value: result.meanHr, device, note })
    setSaved(true)
  }

  const giveConsent = () => {
    try {
      localStorage.setItem(CONSENT_KEY, new Date().toISOString())
    } catch {
      /* Ohne Speicher gilt die Einwilligung nur für diese Sitzung. */
    }
    setConsent(true)
  }

  const settling = elapsed < HRV_SETTLE_S
  const remaining = Math.max(0, duration - elapsed)

  return (
    <>
      <ScreenHeader eyebrow={t('hrv.eyebrow')} title={t('hrv.title')} intro={t('hrv.intro')} />

      {support === 'unsupported' && (
        <Panel className="mb-4" data-testid="hrv-unsupported">
          <PanelHeader title={t('hrv.unsupported.title')} />
          <p className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
            {t('hrv.unsupported.body')}{' '}
            <Link to="/beobachtung" className="underline underline-offset-2">
              {t('hrv.unsupported.manual')}
            </Link>
          </p>
        </Panel>
      )}
      {support === 'no_adapter' && (
        <p className="mb-4 text-[13px] text-warning" data-testid="hrv-no-adapter">
          {t('hrv.noAdapter')}
        </p>
      )}

      {!consent ? (
        <Panel className="mb-4" data-testid="hrv-consent">
          <PanelHeader title={t('hrv.consent.title')} />
          <div className="space-y-2 px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
            <p>{t('hrv.consent.body')}</p>
            <p>{t('hrv.consent.storage')}</p>
            <Button variant="primary" size="md" onClick={giveConsent}>
              <Check size={15} aria-hidden />
              {t('hrv.consent.agree')}
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel ticked float className="mb-4" data-testid="hrv-measure">
          <PanelHeader title={t('hrv.protocol.title')} subtitle={t('hrv.protocol.subtitle')} />
          {phase === 'idle' && (
            <div className="space-y-4 px-4 py-4">
              <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-ink-secondary">
                <li>{t('hrv.protocol.step1')}</li>
                <li>{t('hrv.protocol.step2')}</li>
                <li>{t('hrv.protocol.step3')}</li>
                <li>{t('hrv.protocol.step4', { settle: HRV_SETTLE_S })}</li>
              </ol>
              <SegmentedControl
                label={t('hrv.duration')}
                value={String(duration)}
                onChange={(v) => setDuration(Number(v))}
                options={HRV_DURATIONS_S.map((d) => ({ value: String(d), label: t('hrv.minutes', { count: d / 60 }) }))}
              />
              {failure && (
                <p role="alert" className="text-[13px] text-warning" data-testid="hrv-failure">
                  {t(`hrv.failure.${failure}`)}
                </p>
              )}
              <Button variant="primary" size="md" onClick={begin} disabled={support === 'unsupported'}>
                <Bluetooth size={15} aria-hidden />
                {t('hrv.connect')}
              </Button>
            </div>
          )}

          {phase === 'connecting' && <p className="px-4 py-6 text-[13px] text-ink-secondary">{t('hrv.connecting')}</p>}

          {phase === 'measuring' && (
            <div className="px-4 py-5" data-testid="hrv-live">
              <p className="label-tag">{settling ? t('hrv.settling') : t('hrv.measuring')}</p>
              <p className="readout mt-1 font-display text-[44px] font-bold tabular-nums" aria-live="off">
                {formatDuration(remaining)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]">
                <span className="inline-flex items-center gap-1.5">
                  <HeartPulse size={15} className="text-accent" aria-hidden />
                  <span className="readout tabular-nums">{liveHr ?? '—'}</span> bpm
                </span>
                <span className="text-ink-muted">{t('hrv.beats', { count: beatCount })}</span>
                <span className="text-ink-muted">{device}</span>
              </div>
              {contact === false && <p className="mt-2 text-[12px] text-warning">{t('hrv.noContact')}</p>}
              <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={cancel}>
                <Square size={13} aria-hidden />
                {t('hrv.cancel')}
              </Button>
            </div>
          )}

          {phase === 'done' && result && (
            <div data-testid="hrv-result">
              <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
                <StatTile label={t('hrv.result.rmssd')} value={result.rmssd.value == null ? '—' : formatNumber(result.rmssd.value, locale, 0)} unit="ms" emphasis />
                <StatTile label={t('hrv.result.hr')} value={result.meanHr == null ? '—' : String(result.meanHr)} unit="bpm" />
                <StatTile label={t('hrv.result.analysed')} value={String(result.analysisSeconds)} unit="s" />
                <StatTile label={t('hrv.result.artifacts')} value={formatNumber(result.artifactPct, locale, 1)} unit="%" />
              </div>
              <div className="border-t border-line px-4 py-3">
                <MetricMeta metric={result.rmssd} />
                {failure === 'no_rr' ? (
                  <p role="alert" className="mt-2 text-[13px] text-warning">{t('hrv.failure.no_rr')}</p>
                ) : result.rejected ? (
                  <p role="alert" className="mt-2 text-[13px] text-warning" data-testid="hrv-rejected">
                    {t(`hrv.rejected.${result.rejected}`)}
                  </p>
                ) : saved ? (
                  <p className="mt-2 text-[13px]" data-testid="hrv-saved">
                    {t('hrv.saved')}{' '}
                    <Link to="/tagebuch" className="underline underline-offset-2">
                      {t('hrv.toContext')}
                    </Link>
                  </p>
                ) : (
                  <Button variant="primary" size="md" className="mt-2" onClick={save}>
                    <Check size={15} aria-hidden />
                    {t('hrv.save')}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="mt-2 ml-2" onClick={() => setPhase('idle')}>
                  {t('hrv.again')}
                </Button>
              </div>
            </div>
          )}
          <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('hrv.method')}</p>
        </Panel>
      )}

      <Panel className="mb-4" data-testid="hrv-straps">
        <PanelHeader title={t('hrv.straps.title')} subtitle={t('hrv.straps.why')} />
        <ul className="divide-y divide-line">
          {HEART_RATE_STRAPS.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-[13px]" data-strap={s.id}>
              <span>
                <span className="block">
                  {s.id === 'watch' ? t('hrv.straps.watch') : s.name}
                  {s.recommended && <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-accent-text">{t('hrv.straps.recommended')}</span>}
                </span>
                <span className="block text-[11px] text-ink-muted">{t(`hrv.strapNote.${s.note}`)}</span>
              </span>
              <span className={cn('rounded-pill border px-2 py-0.5 text-[11px]', s.rr ? 'border-accent/60' : 'border-line text-ink-muted')}>
                {s.rr ? t('hrv.straps.hrv') : t('hrv.straps.hrOnly')}
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('hrv.straps.browsers')}</p>
      </Panel>

      <p className="mb-6 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('hrv.noAdvice')}</p>
    </>
  )
}
