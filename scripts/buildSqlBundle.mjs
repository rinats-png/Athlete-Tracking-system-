/**
 * Sammeldatei der offenen Migrationen für den SQL-Editor von Supabase.
 *
 * Fügt die unten genannten Migrationen in der RICHTIGEN Reihenfolge zu einer
 * Datei zusammen: supabase/einspielen/offene_migrationen.sql. Die Einzeldateien
 * bleiben die Quelle der Wahrheit; ein Prüffall stellt sicher, dass die
 * Sammeldatei sie unverändert enthält (npm run sql:bundle erzeugt sie neu).
 *
 * Alle Migrationen sind so geschrieben, dass ein zweites Ausführen nichts
 * kaputt macht («if not exists», «drop … if exists», cron.schedule mit
 * festem Namen). Welche schon laufen, muss trotzdem niemand prüfen.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

export const OPEN_MIGRATIONS = [
  '20261004100000_shared_checkins.sql',
  '20261004110000_ai_usage.sql',
  '20261004120000_push_weekly.sql',
  '20261005100000_plan_assignments.sql',
  '20261005110000_push_plan_offer.sql',
]

export function buildBundle(read = (f) => readFileSync(`supabase/migrations/${f}`, 'utf8')) {
  const head = `-- =============================================================================
-- KYDON: offene Migrationen in einer Datei (für den SQL-Editor in Supabase)
--
-- Reihenfolge ist wichtig und hier schon richtig. Erzeugt mit
-- scripts/buildSqlBundle.mjs aus den Einzeldateien in supabase/migrations/.
-- Nicht von Hand ändern: die Einzeldateien sind die Quelle.
--
-- Enthalten:
${OPEN_MIGRATIONS.map((f) => `--   ${f}`).join('\n')}
--
-- Mehrfaches Ausführen ist unschädlich. Voraussetzung: pg_cron, pg_net und der
-- Vault-Eintrag push_cron_secret sind eingerichtet (siehe docs/push.md).
-- =============================================================================
`
  const parts = OPEN_MIGRATIONS.map((f) => `\n-- ########## ${f} ##########\n\n${read(f).replace(/\s+$/, '')}\n`)
  return head + parts.join('')
}

if (process.argv[1] && process.argv[1].endsWith('buildSqlBundle.mjs')) {
  mkdirSync('supabase/einspielen', { recursive: true })
  writeFileSync('supabase/einspielen/offene_migrationen.sql', buildBundle())
  console.log('✓ supabase/einspielen/offene_migrationen.sql geschrieben')
}
