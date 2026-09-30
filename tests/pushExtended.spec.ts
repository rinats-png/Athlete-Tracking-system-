import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_TOPICS,
  PUSH_TOPICS,
  activityPayload,
  agendaPayload,
  isReleaseId,
  releasePayload,
  wantsTopic,
} from '../supabase/functions/_shared/push'
import { agendaDates } from '../src/domain/pushAgenda'

/**
 * Push, zweite Stufe: Themen, Termine, neue App-Fassung, Aktivität an Trainer.
 * Was auf dem Sperrbildschirm steht, bleibt arm: keine Namen, keine Werte.
 */

const LOCALES = ['de', 'en', 'fr', 'es', 'nl', 'sv', 'da', 'nb', 'xx']

test.describe('Inhalt', () => {
  test('Terminmeldungen nennen weder Namen noch Zahlen, in jeder Sprache', () => {
    for (const l of LOCALES) {
      for (const k of ['competition', 'assessment'] as const) {
        const p = agendaPayload(k, l)
        expect(p.title.length, `${l} ${k}`).toBeGreaterThan(3)
        expect(p.body, `${l} ${k}`).not.toMatch(/\d/)
      }
      expect(agendaPayload('competition', l).tag).toBe('kydon-agenda-competition')
    }
    expect(agendaPayload('assessment', 'de').url).toBe('/diagnostik/termine')
  })

  test('die App-Aktualisierung sagt nur «neu», nichts Genaues', () => {
    for (const l of LOCALES) {
      const p = releasePayload(l)
      expect(p.body, l).not.toMatch(/\d/)
      expect(p.tag).toBe('kydon-release')
    }
  })

  test('Aktivität an Trainer: nur die Anzahl, kein Name, kein Test, kein Wert', () => {
    for (const l of LOCALES) {
      const one = activityPayload(l, 1)
      const many = activityPayload(l, 5)
      expect(one.body, l).not.toMatch(/\d/)
      expect(many.body, l).toContain('5')
      for (const p of [one, many]) expect(p.body, l).not.toMatch(/Cooper|Squat|kg|VO2|Sprung|Alex/i)
      expect(one.url).toBe('/trainer')
    }
    expect(activityPayload('de', 3).body).toBe('3 Athleten haben etwas eingetragen.')
  })
})

test.describe('Themen und Kennungen', () => {
  test('ohne Angabe gelten alle Themen; ein abgeschaltetes Thema bekommt nichts', () => {
    expect([...DEFAULT_TOPICS]).toEqual([...PUSH_TOPICS])
    expect(wantsTopic(null, 'release')).toBe(true)
    expect(wantsTopic(['due'], 'release')).toBe(false)
    expect(wantsTopic([], 'due')).toBe(false)
  })

  test('Kennungen einer Fassung: Datum, optional mit Zähler', () => {
    for (const ok of ['2026-09-30', '2026-09-30.2', '2026-12-01.12']) expect(isReleaseId(ok), ok).toBe(true)
    for (const bad of ['', '2026-9-30', 'latest', '2026-09-30.', '2026-09-30.1234', '2026-09-30; drop', 42, null]) expect(isReleaseId(bad), String(bad)).toBe(false)
  })
})

test.describe('Was ansteht', () => {
  const athlete = (competitionOn: string | null, planned: string[] = []) =>
    ({
      profile: { competition: competitionOn ? { name: 'x', on: competitionOn } : null },
      assessments: planned.map((d, i) => ({ id: String(i), performedOn: d, status: 'planned' })),
    }) as never

  test('Wettkampf: der Vortag; heute oder früher: nichts; morgen: heute', () => {
    expect(agendaDates(athlete('2026-10-10'), '2026-10-01').competition).toBe('2026-10-09')
    expect(agendaDates(athlete('2026-10-02'), '2026-10-01').competition).toBe('2026-10-01')
    expect(agendaDates(athlete('2026-10-01'), '2026-10-01').competition).toBeNull()
    expect(agendaDates(athlete('2026-09-01'), '2026-10-01').competition).toBeNull()
    expect(agendaDates(athlete(null), '2026-10-01').competition).toBeNull()
  })

  test('Testtermin: der nächste geplante, nie ein vergangener oder abgeschlossener', () => {
    expect(agendaDates(athlete(null, ['2026-10-20', '2026-10-05', '2026-09-01']), '2026-10-01').assessment).toBe('2026-10-05')
    expect(agendaDates(athlete(null, []), '2026-10-01').assessment).toBeNull()
    const done = { profile: { competition: null }, assessments: [{ id: 'a', performedOn: '2026-10-05', status: 'completed' }] } as never
    expect(agendaDates(done, '2026-10-01').assessment).toBeNull()
  })
})

test.describe('Datenbank (statische Prüfung der Migration)', () => {
  const sql = readFileSync('supabase/migrations/20260930100000_push_topics_activity.sql', 'utf-8')

  test('jede neue Tabelle hat RLS in derselben Migration', () => {
    for (const t of ['push_agenda', 'push_releases', 'push_events', 'push_prefs']) {
      expect(sql, t).toMatch(new RegExp(`create table public\\.${t} `))
      expect(sql, t).toMatch(new RegExp(`alter table public\\.${t} enable row level security`))
    }
  })

  test('Server-Tabellen sind für den Browser gesperrt; eigene Zeilen nur über eigene Regel', () => {
    for (const t of ['push_releases', 'push_events']) expect(sql).toMatch(new RegExp(`revoke all on public\\.${t} from anon, authenticated`))
    for (const t of ['push_agenda', 'push_prefs']) expect(sql).toMatch(new RegExp(`create policy ${t}_own_all on public\\.${t}`))
  })

  test('Auslöser laufen als Definer mit festem search_path und sind nicht aufrufbar', () => {
    for (const fn of ['push_activity_document', 'push_activity_series']) {
      const body = sql.slice(sql.indexOf(`function public.${fn}`))
      expect(body.slice(0, 400), fn).toMatch(/security definer\s+set search_path = public, pg_temp/)
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${fn}\\(\\) from public, anon, authenticated`))
    }
  })

  test('Aktivität geht nur an aktive Verbindungen und respektiert die Einstellung des Athleten', () => {
    expect(sql.match(/l\.status = 'active'/g)?.length).toBe(2)
    expect(sql.match(/push_prefs p where p\.user_id = new\.owner_id/g)?.length).toBe(2)
    expect(sql).toMatch(/n_new - n_old <= 20/)
  })

  test('das Cron-Geheimnis steht nicht in der Datei, nur der Vault-Zugriff', () => {
    expect(sql).toMatch(/decrypted_secret from vault\.decrypted_secrets where name='push_cron_secret'/)
    expect(sql).not.toMatch(/x-cron-secret['"]\s*,\s*'[A-Za-z0-9]{16,}'/)
  })
})
