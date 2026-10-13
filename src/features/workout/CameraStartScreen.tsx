import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, X } from 'lucide-react'
import { Thumb } from '@/components/ui/PhotoCard'
import { patternForExercise } from '@/domain/repCounter'
import { customSession } from '@/domain/freeSession'
import { libraryExerciseImage } from '@/data/visuals'
import { useLibrary } from '@/features/library/useLibrary'

/**
 * Schnellstart «Kamera»: eine Übung wählen, deren Bewegungsmuster die
 * Kamera zählen kann (Kniebeuge, Hüftbeugen, Drücken, Ziehen). Daraus wird
 * ein freies Training mit drei Sätzen; der Player öffnet die Kamera sofort.
 */
export function CameraStartScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { exercises } = useLibrary()
  const [query, setQuery] = useState('')
  const countable = useMemo(() => (exercises ?? []).filter((e) => patternForExercise(e.patterns) != null && e.parameters.some((p) => p.startsWith('reps') || p.endsWith('_or_reps'))), [exercises])
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q.length >= 2 ? countable.filter((e) => e.name.toLowerCase().includes(q)) : countable
    return list.slice(0, 30)
  }, [countable, query])

  const start = (id: string, name: string) => {
    const session = customSession(`free-${Date.now().toString(36)}`, name, [{ exerciseId: id, name, sets: 3, reps: null }])
    navigate('/plan/frei', { state: { session, camera: true } })
  }

  return (
    <div data-testid="camera-start">
      <Link to="/plan" className="mb-2 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text"><X size={16} aria-hidden />{t('workout.close')}</Link>
      <h1 className="font-display text-[34px] leading-none font-bold">{t('workout.camera.startTitle')}</h1>
      <p className="mt-1 text-[14px] text-ink-secondary">{t('workout.camera.startIntro')}</p>
      <label className="mt-4 block text-[13px]">
        <span className="label-tag">{t('free.search')}</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="camera-search" className="mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
      </label>
      {!exercises && <p className="mt-3 text-[14px] text-ink-secondary">{t('lib.loading')}</p>}
      <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface">
        {hits.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => start(e.id, e.name)} data-testid={`camera-ex-${e.id}`} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
              <Thumb src={libraryExerciseImage(e.id)} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{e.name}</span>
                <span className="block text-[12px] text-ink-secondary">{t(`workout.camera.pattern.${patternForExercise(e.patterns)}`)}</span>
              </span>
              <Camera size={18} aria-hidden className="text-accent-text" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-ink-muted">{t('workout.camera.privacy')}</p>
    </div>
  )
}

export default CameraStartScreen
