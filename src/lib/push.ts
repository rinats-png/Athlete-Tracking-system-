import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Push-Benachrichtigungen (Web Push).
 *
 * Das Gerät meldet sich beim Push-Dienst seines Browsers an und hinterlegt
 * die Adresse in `push_subscriptions`. Verschickt wird nur über die Edge
 * Function `push` — für fällige Nachmessungen, Nachrichten des Admins und
 * Nachrichten eines verbundenen Trainers.
 *
 * Für fällige Nachmessungen erfährt der Server NUR das nächste
 * Fälligkeitsdatum. Welcher Test, welche Werte: bleibt auf dem Gerät.
 *
 * Auf dem iPhone geht Web Push nur aus der installierten App (Home-Bildschirm),
 * nicht aus Safari heraus.
 */

/** Öffentlicher VAPID-Schlüssel. Öffentlich und darf es sein; der private liegt im Vault. */
export const VAPID_PUBLIC_KEY =
  'BBDbagV03QOENKN_AuBJCLjsKoHsCHsRHStHjjCO_tZ3TzmVJfO4Y6hiXVh69eE_nPh_6hV_sOYMA1RuA4pHoFc'

const FLAG_KEY = 'kydon.push.v1'
/** Ereignis, sobald Push eingeschaltet wurde — dann wird das Datum gemeldet. */
export const PUSH_CHANGED = 'kydon-push-changed'

export type PushState = 'unsupported' | 'needs_install' | 'signed_out' | 'denied' | 'off' | 'on'

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function readFlag(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === 'on'
  } catch {
    return false
  }
}

function writeFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG_KEY, 'on')
    else localStorage.removeItem(FLAG_KEY)
  } catch {
    /* ohne Speicher gilt Push als aus */
  }
}

/** Nur die lokale Merkung — schnell, ohne Netz. */
export function pushFlag(): boolean {
  return readFlag()
}

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return isIos() && !isStandalone() ? 'needs_install' : 'unsupported'
  if (!(await currentUserId())) return 'signed_out'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription && readFlag() ? 'on' : 'off'
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Einschalten. Nur auf eine ausdrückliche Handlung hin aufrufen — ein
 * ungefragter Berechtigungsdialog wird weggeklickt und bleibt dann verweigert.
 */
export async function enablePush(locale: string): Promise<PushState> {
  if (!pushSupported()) return isIos() && !isStandalone() ? 'needs_install' : 'unsupported'
  const userId = await currentUserId()
  if (!userId) return 'signed_out'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))
  const json = subscription.toJSON()
  const supabase = await getSupabase()
  if (!supabase || !json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'off'
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      locale: locale.slice(0, 2),
    },
    { onConflict: 'endpoint' },
  )
  if (error) return 'off'
  writeFlag(true)
  window.dispatchEvent(new Event(PUSH_CHANGED))
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  writeFlag(false)
  if (!pushSupported()) return 'unsupported'
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    const supabase = await getSupabase()
    await supabase?.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe().catch(() => false)
  }
  const supabase = await getSupabase()
  const userId = await currentUserId()
  if (supabase && userId) await supabase.from('push_due').delete().eq('user_id', userId)
  return 'off'
}

/**
 * Das nächste Fälligkeitsdatum an den Server melden (oder löschen).
 * Gemeldet wird 9 Uhr Ortszeit am Tag der Fälligkeit.
 */
export async function syncPushDue(dueOn: string | null): Promise<void> {
  if (!readFlag()) return
  const userId = await currentUserId()
  const supabase = await getSupabase()
  if (!userId || !supabase) return
  if (!dueOn) {
    await supabase.from('push_due').delete().eq('user_id', userId)
    return
  }
  const dueAt = new Date(`${dueOn}T09:00:00`).toISOString()
  const { data } = await supabase.from('push_due').select('due_at').eq('user_id', userId).maybeSingle()
  if (data && new Date(data.due_at).toISOString() === dueAt) return
  await supabase.from('push_due').upsert({ user_id: userId, due_at: dueAt, sent_for: null })
}

type SendResult = { ok: boolean; status: number; sent?: number; recipients?: number }

async function invoke(body: Record<string, unknown>): Promise<SendResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, status: 0 }
  const { data, error } = await supabase.functions.invoke('push', { body })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status ?? 0
    return { ok: false, status }
  }
  return { ok: true, status: 200, ...(data as object) }
}

export const sendTestPush = () => invoke({ action: 'test' })
export const sendBroadcast = (title: string, body: string) => invoke({ action: 'broadcast', title, body })
export const sendCoachPush = (athleteIds: string[], body: string) => invoke({ action: 'coach', athleteIds, body })

export interface LinkedAthlete {
  athlete_id: string
  display_name: string | null
  has_push: boolean
}

export async function myLinkedAthletes(): Promise<LinkedAthlete[]> {
  const supabase = await getSupabase()
  if (!supabase || !(await currentUserId())) return []
  const { data, error } = await supabase.rpc('push_my_athletes')
  return error ? [] : ((data as LinkedAthlete[]) ?? [])
}
