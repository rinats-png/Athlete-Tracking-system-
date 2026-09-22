import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { newId } from '@/lib/store/localStore'
import { useAppData } from '@/lib/store/AppDataProvider'
import { photoDays, photosOfDay } from '@/domain/health'
import { PHOTO_POSES, type PhotoPose } from '@/lib/store/schema'
import { HEALTH_LIMITS, preparePhoto, type PhotoError } from '@/lib/photo'
import type { StoredPhotoEntry } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

/**
 * Vergleichsfotos.
 *
 * WARUM DIESER ABSCHNITT ANDERS IST ALS ALLE ANDEREN: Ein Körperfoto ist das
 * empfindlichste Datum in dieser App. Es ist ein Gesundheitsdatum nach Art. 9
 * (Körperbild), es liegt nahe an der Essstörungsdiagnostik, und es ist im
 * Gegensatz zu einer Zahl sofort mit einem Menschen verknüpfbar. Deshalb:
 *
 *   1. Der Abschnitt erscheint NUR mit eigener Einwilligung für «photos» —
 *      wer Laborwerte führt, hat damit nicht in Fotos eingewilligt.
 *   2. Die Zweitschrift trägt das Bild nur VERSCHLÜSSELT, mit der Phrase des
 *      Nutzers (siehe KeyPanel). Ohne Phrase bleibt es auf dem Gerät.
 *   3. Die App VERMISST NICHTS. Sie legt zwei Bilder nebeneinander und sagt
 *      kein Wort dazu. Kein Körperfettanteil, keine Symmetrie, kein
 *      Fortschritt in Prozent — das wäre eine Bewertung (§81, §82).
 *
 * DIE POSE IST DIE GANZE METHODIK. Zwei Fotos sind nur vergleichbar, wenn sie
 * dieselbe Pose zeigen; deshalb wird der Vergleich je Pose gebildet und nie
 * über Posen hinweg. Ein Wechsel der Pose sähe aus wie eine Veränderung des
 * Körpers und wäre keine.
 */
export function PhotoPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, updateHealth } = useAppData()
  const [open, setOpen] = useState(false)

  const days = useMemo(() => photoDays(health.photos), [health.photos])
  const posesUsed = useMemo(
    () => PHOTO_POSES.filter((pose) => health.photos.some((p) => p.pose === pose)),
    [health.photos],
  )

  const remove = (id: string) => updateHealth((h) => ({ ...h, photos: h.photos.filter((p) => p.id !== id) }))

  return (
    <Panel data-testid="photo-panel">
      <PanelHeader
        title={t('health.photos.title')}
        subtitle={t('health.photos.subtitle')}
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => setOpen((v) => !v)}>
            {t('health.photos.add')}
          </Button>
        }
      />
      <div className="px-4 py-3">
        {open && <PhotoForm onDone={() => setOpen(false)} />}

        {days.length === 0 && !open && <p className="text-[13px] text-ink-secondary">{t('health.photos.empty')}</p>}

        {posesUsed.length > 0 && <Compare poses={posesUsed} />}

        {days.map((day) => (
          <div key={day} className="mt-4 border-t border-line pt-3 first:border-t-0" data-testid={`photo-day-${day}`}>
            <p className="label-tag">{formatDate(day, locale)}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {photosOfDay(health.photos, day).map((photo) => (
                <figure key={photo.id} className="w-[132px]">
                  <img
                    src={photo.dataUrl}
                    alt={t('health.photos.alt', { pose: t(`health.poses.${photo.pose}`), date: formatDate(day, locale) })}
                    className="w-full border border-line"
                  />
                  <figcaption className="mt-1 text-[12px] text-ink-secondary">{t(`health.poses.${photo.pose}`)}</figcaption>
                  {photo.note && <p className="mt-1 text-[12px] text-ink-muted">{photo.note}</p>}
                  <Button type="button" variant="ghost" size="sm" className="-ml-3 mt-1" onClick={() => remove(photo.id)}>
                    <Trash2 size={14} aria-hidden />
                    {t('health.photos.remove')}
                  </Button>
                </figure>
              ))}
            </div>
          </div>
        ))}

        <p role="note" className="mt-3 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-ink-secondary" data-testid="photo-safety">
          {t('health.photos.safety')}
        </p>
        <p className="mt-2 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('health.photos.method')}</p>
      </div>
    </Panel>
  )

  /**
   * Zwei Tage derselben Pose nebeneinander.
   *
   * Es steht NICHTS zwischen den Bildern — kein Pfeil, kein Delta, kein Wort.
   * Wer vergleicht, ist der Mensch davor.
   */
  function Compare({ poses }: { poses: PhotoPose[] }) {
    const [pose, setPose] = useState<PhotoPose>(poses[0])
    const forPose = health.photos.filter((p) => p.pose === pose).sort((a, b) => a.day.localeCompare(b.day))
    const [leftId, setLeftId] = useState('')
    const [rightId, setRightId] = useState('')
    const left = forPose.find((p) => p.id === leftId) ?? forPose[0]
    const right = forPose.find((p) => p.id === rightId) ?? forPose[forPose.length - 1]
    if (forPose.length < 2) return null

    return (
      <div className="mb-4 border border-line p-3" data-testid="photo-compare">
        <p className="label-tag">{t('health.photos.compare')}</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('health.photos.compare')}>
          {poses.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={pose === p}
              onClick={() => {
                setPose(p)
                setLeftId('')
                setRightId('')
              }}
              className={cn('readout min-h-11 rounded-pill border px-3 text-[13px]', pose === p ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-muted')}
            >
              {t(`health.poses.${p}`)}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { side: 'left' as const, photo: left, value: leftId || left.id, set: setLeftId },
            { side: 'right' as const, photo: right, value: rightId || right.id, set: setRightId },
          ].map(({ side, photo, value, set }) => (
            <div key={side}>
              <label className="block text-[13px]">
                <span className="label-tag">{t(`health.photos.${side}`)}</span>
                <select value={value} onChange={(e) => set(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-2 text-[16px]">
                  {forPose.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatDate(p.day, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <img
                src={photo.dataUrl}
                alt={t('health.photos.alt', { pose: t(`health.poses.${pose}`), date: formatDate(photo.day, locale) })}
                className="mt-2 w-full border border-line"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  function PhotoForm({ onDone }: { onDone: () => void }) {
    const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
    const [pose, setPose] = useState<PhotoPose>('frontRelaxed')
    const [note, setNote] = useState('')
    const [dataUrl, setDataUrl] = useState('')
    const [error, setError] = useState<PhotoError | null>(null)
    const [busy, setBusy] = useState(false)

    const pick = async (file: File) => {
      setBusy(true)
      setError(null)
      const outcome = await preparePhoto(file, HEALTH_LIMITS)
      setBusy(false)
      if (outcome.dataUrl) setDataUrl(outcome.dataUrl)
      else setError(outcome.error)
    }

    const save = () => {
      if (!dataUrl) return
      const at = new Date().toISOString()
      const entry: StoredPhotoEntry = {
        id: newId(),
        day,
        pose,
        dataUrl,
        note: note.trim().slice(0, 400),
        createdAt: at,
        updatedAt: at,
      }
      updateHealth((h) => ({ ...h, photos: [...h.photos, entry] }))
      onDone()
    }

    return (
      <div className="mb-3 border border-dashed border-line-strong p-3" data-testid="photo-form">
        <label className="block text-[13px]">
          <span className="label-tag">{t('health.day')}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>

        <p className="label-tag mt-3">{t('health.photos.pose')}</p>
        <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label={t('health.photos.pose')}>
          {PHOTO_POSES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={pose === p}
              onClick={() => setPose(p)}
              className={cn('readout min-h-11 rounded-pill border px-3 text-[13px]', pose === p ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-muted')}
            >
              {t(`health.poses.${p}`)}
            </button>
          ))}
        </div>

        {dataUrl ? (
          <div className="mt-3">
            <img src={dataUrl} alt={t('health.photos.preview')} className="max-h-64 w-auto border border-line" />
            <Button type="button" variant="ghost" size="sm" className="-ml-3 mt-1" onClick={() => setDataUrl('')}>
              <Trash2 size={14} aria-hidden />
              {t('health.photos.remove')}
            </Button>
          </div>
        ) : (
          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-ink-secondary">
            <Camera size={16} aria-hidden />
            <span>{busy ? t('health.photos.working') : t('health.photos.choose')}</span>
            <input
              type="file"
              accept="image/*"
              aria-label={t('health.photos.choose')}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void pick(file)
                e.target.value = ''
              }}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="mt-2 text-[12px] text-warning">
            {t(`health.photos.error.${error}`)}
          </p>
        )}

        <label className="mt-3 block text-[13px]">
          <span className="label-tag">{t('health.note')}</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>

        <div className="mt-3 flex gap-2">
          <Button type="button" variant="primary" size="sm" disabled={!dataUrl} onClick={save}>
            {t('actions.save')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {t('actions.cancel')}
          </Button>
        </div>
      </div>
    )
  }
}
