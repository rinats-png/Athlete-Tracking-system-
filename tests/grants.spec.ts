import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'

/**
 * Tabellenrechte (supabase/migrations/20261013110000_revoke_truncate_delete.sql).
 *
 * DELETE für angemeldete Nutzer wird nur dort entzogen, wo es KEINE
 * Löschregel gibt. Träfe der Entzug eine Tabelle mit Löschregel, bräche ein
 * Weg in der App — Freigabe entziehen, Push ausschalten, Athlet löschen —,
 * und zwar erst live. Dieser Fall liest alle Migrationen und hält das fest.
 */
const DIR = 'supabase/migrations'
const sql = (f: string) =>
  readFileSync(`${DIR}/${f}`, 'utf8')
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n')

function tablesWithDeletePolicy(): Set<string> {
  const out = new Set<string>()
  for (const f of readdirSync(DIR).filter((f) => f.endsWith('.sql'))) {
    const re = /create\s+policy\s+\S+\s+on\s+(?:public\.)?([a-z_]+)\s+for\s+(delete|all)\b/gi
    for (const m of sql(f).matchAll(re)) out.add(m[1])
  }
  return out
}

const MIGRATION = '20261013110000_revoke_truncate_delete.sql'

function revokedFromAuthenticated(): string[] {
  const m = sql(MIGRATION).match(/revoke\s+delete\s+on\s+table\s+([\s\S]*?)\s+from\s+authenticated\s*;/i)
  expect(m, 'Entzugsliste nicht gefunden').toBeTruthy()
  return m![1].split(',').map((s) => s.trim().replace(/^public\./, ''))
}

test('DELETE wird nur auf Tabellen ohne Löschregel entzogen', () => {
  const withPolicy = tablesWithDeletePolicy()
  // Plausibel: die bekannten Löschwege sind als Regel da.
  for (const t of ['push_subscriptions', 'health_shares', 'shared_checkins', 'athlete_documents', 'push_agenda']) {
    expect(withPolicy.has(t), t).toBe(true)
  }
  for (const t of revokedFromAuthenticated()) expect(withPolicy.has(t), `${t} hat eine Löschregel`).toBe(false)
})

test('TRUNCATE geht an niemanden ausser dem Eigentümer, auch nicht bei künftigen Tabellen', () => {
  const s = sql(MIGRATION)
  expect(s).toMatch(/revoke truncate on table public\.%I from anon, authenticated/)
  expect(s).toMatch(/alter default privileges for role postgres in schema public revoke truncate on tables from anon, authenticated/)
  expect(s).not.toMatch(/service_role/)
})
