import type { Landmark } from '@/domain/repCounter'

/**
 * Pose-Erkennung auf dem Gerät (MediaPipe Pose Landmarker, Modell «lite»).
 *
 * DATENSCHUTZ: das Kamerabild bleibt im Speicher des Browsers und wird Bild
 * für Bild nur an die Erkennung gegeben. Nichts wird gespeichert, nichts
 * verlässt das Gerät; heraus kommen 33 Körperpunkte je Bild, und auch die
 * werden nur gezählt, nicht aufbewahrt.
 *
 * AUSLIEFERUNG: Bibliothek, WebAssembly und Modell kommen von der eigenen
 * Herkunft (public/mediapipe, public/models). Der Code wird erst geladen,
 * wenn jemand die Kamera öffnet — nicht im Startpaket.
 *
 * Lizenz: @mediapipe/tasks-vision Apache-2.0; Modell siehe docs/kamera-zaehler.md.
 */
export interface PoseDetector {
  detect(video: HTMLVideoElement, timeMs: number): Landmark[] | null
  close(): void
}

let loading: Promise<PoseDetector> | null = null

export function loadPoseDetector(): Promise<PoseDetector> {
  loading ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks('/mediapipe')
    const options = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate },
      runningMode: 'VIDEO' as const,
      numPoses: 1,
    })
    // GPU ist schneller; wo WebGL fehlt oder versagt, rechnet die CPU.
    const landmarker = await PoseLandmarker.createFromOptions(fileset, options('GPU')).catch(() => PoseLandmarker.createFromOptions(fileset, options('CPU')))
    return {
      detect(video, timeMs) {
        const r = landmarker.detectForVideo(video, timeMs)
        const first = r.landmarks?.[0]
        return first ? first.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })) : null
      },
      close() {
        landmarker.close()
        loading = null
      },
    }
  })()
  loading.catch(() => {
    loading = null
  })
  return loading
}
