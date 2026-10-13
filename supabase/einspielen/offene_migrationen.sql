-- =============================================================================
-- KYDON: offene Migrationen in einer Datei (für den SQL-Editor in Supabase)
--
-- Reihenfolge ist wichtig und hier schon richtig. Erzeugt mit
-- scripts/buildSqlBundle.mjs aus den Einzeldateien in supabase/migrations/.
-- Nicht von Hand ändern: die Einzeldateien sind die Quelle.
--
-- Enthalten:
--   20261013100000_sensitive_consents.sql
--
-- EINMAL ausführen. Alles läuft in EINER Transaktion: schlägt ein Schritt
-- fehl, wird nichts übernommen — dann die Fehlermeldung weitergeben, nicht
-- erneut starten. Voraussetzung: pg_cron, pg_net und der Vault-Eintrag
-- push_cron_secret sind eingerichtet (siehe docs/push.md).
-- =============================================================================

begin;

-- ########## 20261013100000_sensitive_consents.sql ##########

-- =============================================================================
-- Einwilligung in den Abgleich gesundheitsnaher Angaben (Art. 9 DSGVO)
--
-- WARUM: Seit das Konto Pflicht ist und der Abgleich von selbst läuft
-- (13.10.2026), ist «Abgleich einschalten» keine Einwilligung mehr. Schlaf,
-- Stress, Herzfrequenz, Körperzusammensetzung und Beschwerden können
-- Gesundheitsdaten sein; sie gehen nur mit ausdrücklicher Einwilligung in den
-- Abgleich (src/domain/sensitiveData.ts). Ohne Eintrag hier filtert die App
-- sie heraus, bevor sie schreibt.
--
-- WARUM AUF DEM SERVER: Art. 7 Abs. 1 DSGVO verlangt den NACHWEIS. Ein Haken
-- im Browser genügt dafür nicht. Gespeichert wird nur, DASS und WANN, welche
-- Fassung des Textes galt, ob die Person ihr Mindestalter (16) bestätigt hat
-- und in welcher Rolle (`self` = eigene Daten, `coach` = Trainer bestätigt,
-- dass die Einwilligungen seiner Athleten vorliegen).
--
-- WIDERRUF: setzt `withdrawn_at`. Die Zeile bleibt — ein Widerruf ist Teil des
-- Nachweises. Mit dem Konto verschwindet sie (on delete cascade).
-- =============================================================================

create table if not exists public.sensitive_consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,
  kind text not null default 'self',
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  age_confirmed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint sensitive_consents_version_len check (char_length(version) between 1 and 20),
  constraint sensitive_consents_kind check (kind in ('self', 'coach'))
);

comment on table public.sensitive_consents is
  'Nachweis der Einwilligung in den Abgleich gesundheitsnaher Angaben (Art. 9 Abs. 2 lit. a, Art. 7 Abs. 1 DSGVO): Fassung, Rolle, Zeitpunkt, Widerruf, Altersbestätigung.';

alter table public.sensitive_consents enable row level security;

drop policy if exists sensitive_consents_select_own on public.sensitive_consents;
create policy sensitive_consents_select_own on public.sensitive_consents
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists sensitive_consents_insert_own on public.sensitive_consents;
create policy sensitive_consents_insert_own on public.sensitive_consents
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists sensitive_consents_update_own on public.sensitive_consents;
create policy sensitive_consents_update_own on public.sensitive_consents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Kein DELETE für Clients: der Nachweis soll nicht verschwinden, solange das
-- Konto besteht. Widerrufen geht über `withdrawn_at`.

revoke all on public.sensitive_consents from anon;
grant select, insert, update on public.sensitive_consents to authenticated;

drop trigger if exists sensitive_consents_touch on public.sensitive_consents;
create trigger sensitive_consents_touch before update on public.sensitive_consents
  for each row execute function public.touch_updated_at();

commit;
