-- =============================================================================
-- Unnötige Tabellenrechte entziehen: TRUNCATE überall, DELETE ohne Löschregel
--
-- WARUM: Supabase gibt `anon` und `authenticated` auf jeder neuen Tabelle im
-- Schema public standardmässig ALLE Rechte. Die Zeilenregeln (RLS) halten
-- Lesen, Schreiben und Löschen trotzdem dicht — TRUNCATE aber umgeht RLS
-- vollständig. Über die App-Schnittstelle (PostgREST) ist TRUNCATE nicht
-- erreichbar; ein Recht, das niemand braucht, gehört trotzdem nicht vergeben
-- (Live-Audit 13.10.2026, alle 37 Tabellen betroffen).
--
-- WAS GENAU:
--   1. TRUNCATE: entzogen für anon und authenticated, auf allen Tabellen.
--   2. DELETE für anon: entzogen, auf allen Tabellen. Jede Löschregel im
--      Projekt gilt nur für `authenticated` (geprüft am 13.10.2026).
--   3. DELETE für authenticated: entzogen auf den Tabellen OHNE Löschregel.
--      Dort hat RLS jedes Löschen ohnehin auf null Zeilen gesetzt; jetzt
--      sagt die Datenbank es ausdrücklich. Die App löscht in keiner dieser
--      Tabellen (Suche im Code); die Funktionen, die dort löschen
--      (leave_team, purge_expired, delete_account_data …), laufen als
--      Eigentümer (security definer) und behalten ihr Recht. service_role
--      (Edge Functions) ist nicht betroffen.
--   4. Standardrechte für künftige Tabellen: kein TRUNCATE für anon und
--      authenticated, kein DELETE für anon. Wer eine Tabelle mit Löschregel
--      anlegt, braucht nichts zu tun — DELETE für authenticated bleibt Vorgabe.
--
-- Mehrfach ausführbar: REVOKE auf ein nicht vergebenes Recht ist kein Fehler.
-- =============================================================================

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('revoke truncate on table public.%I from anon, authenticated', t.relname);
    execute format('revoke delete on table public.%I from anon', t.relname);
  end loop;
end
$$;

-- Tabellen ohne Löschregel: angemeldete Nutzer löschen hier nichts.
revoke delete on table
  public.ai_consents,
  public.coach_usage,
  public.entitlements,
  public.performance_norms,
  public.plan_assignment_results,
  public.plan_assignments,
  public.profiles,
  public.security_events,
  public.sensitive_consents,
  public.team_invites,
  public.team_members,
  public.teams
from authenticated;

-- Künftige Tabellen (angelegt von postgres, wie alle Migrationen hier).
alter default privileges for role postgres in schema public revoke truncate on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke delete on tables from anon;
