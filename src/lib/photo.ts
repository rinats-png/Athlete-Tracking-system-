import { MAX_PHOTO_CHARS } from '@/lib/store/schema'

/**
 * Ein Belegbild aufnehmefertig machen.
 *
 * Ein Kamerabild eines heutigen Telefons ist 3–8 MB. Ungeprüft im Bestand
 * abgelegt sprengt es die Speicherquote des Browsers — und dann lässt sich
 * NICHTS mehr speichern, auch kein Messwert. Der Schaden träfe also die
 * Daten, die das Bild belegen sollte.
 *
 * Deshalb wird jedes Bild verkleinert, bevor es überhaupt in den Bestand
 * kommt: längste Kante auf {@link MAX_EDGE}, als JPEG, und wenn es dann noch
 * zu gross ist, in Stufen stärker verdichtet. Bleibt es zu gross, wird es
 * abgelehnt statt beschnitten — ein unlesbarer Beleg ist kein Beleg.
 *
 * Das Bild bleibt auf dem Gerät wie alle anderen Daten (§50). Es wird nicht
 * hochgeladen und nicht ausgewertet.
 */

/** Längste Kante nach dem Verkleinern. Reicht, um ein Display abzulesen. */
export const MAX_EDGE = 1024
const QUALITIES = [0.72, 0.6, 0.45, 0.32]

export type PhotoError = 'not_an_image' | 'unreadable' | 'too_large'

export interface PhotoOutcome {
  dataUrl: string | null
  error: PhotoError | null
}

function loadImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    image.src = url
  })
}

export async function preparePhoto(file: File): Promise<PhotoOutcome> {
  if (!file.type.startsWith('image/')) return { dataUrl: null, error: 'not_an_image' }

  const image = await loadImage(file)
  if (!image || image.naturalWidth === 0) return { dataUrl: null, error: 'unreadable' }

  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) return { dataUrl: null, error: 'unreadable' }
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  for (const quality of QUALITIES) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_PHOTO_CHARS) return { dataUrl, error: null }
  }
  return { dataUrl: null, error: 'too_large' }
}
