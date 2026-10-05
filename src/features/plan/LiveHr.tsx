import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HeartPulse } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { bluetoothHrSupported, connectHeartRate, type HrConnection } from '@/lib/bluetoothHr'
import { plausibleHr, summarizeHr, zoneStatus, type HrSummary } from '@/domain/liveHr'
import { cn } from '@/lib/utils'

/**
 * Live-Puls im Player: Pulsgurt (wo der Browser Bluetooth kann) oder
 * Handeingabe. Werte bleiben im Arbeitsspeicher; gespeichert werden beim
 * Abschluss nur Mittel und Höchstwert der Einheit, lokal.
 */
export function LiveHr({ hrMax, target, running, onSummary }: { hrMax: number | null; target: { min: number; max: number } | null; running: boolean; onSummary: (s: HrSummary | null) => void }) {
  const { t } = useTranslation()
  const [bpm, setBpm] = useState<number | null>(null)
  const [manual, setManual] = useState('')
  const [device, setDevice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const samples = useRef<number[]>([])
  const conn = useRef<HrConnection | null>(null)
  const runningRef = useRef(running)
  runningRef.current = running

  const push = (v: number) => {
    setBpm(v)
    if (runningRef.current) {
      samples.current.push(v)
      onSummary(summarizeHr(samples.current))
    }
  }

  useEffect(() => () => conn.current?.disconnect(), [])

  const connect = async () => {
    setError(null)
    try {
      conn.current = await connectHeartRate(push, () => {
        setDevice(null)
        setError(t('hr.lost'))
      })
      setDevice(conn.current.deviceName || t('hr.device'))
    } catch (e) {
      // Abbrechen des Auswahlfensters ist kein Fehler.
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) setError(t('hr.failed'))
    }
  }
  const status = bpm == null ? null : zoneStatus(bpm, hrMax, target)

  return (
    <Panel className="mb-4" data-testid="live-hr">
      <PanelHeader title={t('hr.title')} subtitle={device ? t('hr.connected', { name: device }) : undefined} />
      <div className="space-y-3 px-4 pb-4">
        <div className="flex items-center gap-3">
          <HeartPulse size={22} aria-hidden />
          <p className="readout text-[36px] leading-none" data-testid="hr-bpm">{bpm ?? '–'}</p>
          <span className="text-[12px] text-ink-secondary">{t('hr.unit')}</span>
          {status && <span className={cn('inline-flex min-h-6 items-center rounded-pill border px-2.5 text-[11px]', status === 'in' ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')} data-testid="hr-zone">{t(`hr.zone.${status}`, { min: target?.min, max: target?.max })}</span>}
        </div>
        {bluetoothHrSupported() ? (
          !device && <button type="button" data-testid="hr-connect" onClick={() => void connect()} className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{t('hr.connect')}</button>
        ) : (
          <p className="text-[12px] text-ink-secondary" data-testid="hr-unsupported">{t('hr.unsupported')}</p>
        )}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(manual); if (plausibleHr(v)) { push(Math.round(v)); setManual('') } else setError(t('hr.implausible')) }}>
          <label className="text-[13px]">
            <span className="label-tag">{t('hr.manual')}</span>
            <input type="number" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} data-testid="hr-manual" className="mt-1.5 block min-h-11 w-28 rounded-md border border-line bg-surface px-3 text-[16px]" />
          </label>
          <button type="submit" data-testid="hr-manual-add" className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{t('hr.add')}</button>
        </form>
        {hrMax == null && <p className="text-[12px] text-ink-secondary">{t('hr.noMax')}</p>}
        {error && <p role="alert" className="text-[12px] text-accent-text" data-testid="hr-error">{error}</p>}
        <p className="text-[11px] text-ink-muted">{t('hr.note')}</p>
      </div>
    </Panel>
  )
}
