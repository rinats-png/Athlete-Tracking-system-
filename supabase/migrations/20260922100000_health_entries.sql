-- =============================================================================
-- Gesundheitsschicht auf dem Server — als Chiffrat (S5, Art. 9 DSGVO)
--
-- WAS DER SERVER HIER SIEHT: eine Kennung, einen Zeitstempel, einen Block
-- Chiffrat. KEINE Kategorie, KEINEN Tag, KEINEN Messwert. Dass jemand
-- ueberhaupt Zyklusdaten fuehrt, ist selbst eine Information — sie bleibt im
-- Chiffrat. Deshalb hat diese Tabelle bewusst WENIGER Spalten als
-- `athlete_series`: dort trennt `kind` die Arten, hier darf nichts trennen.
--
-- DER SCHLUESSEL IST NIE HIER. Er entsteht auf dem Geraet aus einer Phrase,
-- die der Mensch verwahrt (src/lib/health/crypto.ts). Der Server bekommt nur
-- den Salz und eine Probe — beides nutzlos ohne die Phrase.
--
-- WARUM DAS NOETIG IST: Fuer besondere Kategorien nach Art. 9 ist «unsere
-- Zugriffsregeln erlauben es nicht» keine befriedigende Antwort auf die
-- Frage, wer mitlesen kann. RLS schuetzt vor anderen Nutzern; Verschluesselung
-- schuetzt auch vor dem Betreiber.
-- =============================================================================

create table if not exists public.health_entries (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  athlete_id text not null,
  entry_id   text not null,
  -- 'v1.<iv>.<ciphertext>', beides Base64. Der Server prueft nur die Form.
  payload    text not null,
  device_id  text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, athlete_id, entry_id),
  constraint health_entries_id_len check (char_length(athlete_id) between 1 and 80 and char_length(entry_id) between 1 and 120),
  constraint health_entries_shape check (payload like 'v1.%'),
  -- Ein Laborbefund mit Praeanalytik liegt bei wenigen hundert Byte; eine
  -- Peak Week mit sechzig Tagen bei etwa 20 kB. 256 kB ist Luft.
  constraint health_entries_size check (octet_length(payload) <= 256 * 1024)
);

comment on table public.health_entries is
  'Gesundheitsschicht je Athlet, Ende-zu-Ende verschluesselt. Der Betreiber kann den Inhalt nicht lesen; Kategorie und Tag stehen im Chiffrat.';

create index if not exists health_entries_owner_updated_idx
  on public.health_entries (owner_id, updated_at);

drop trigger if exists health_entries_touch on public.health_entries;
create trigger health_entries_touch before update on public.health_entries
  for each row execute function public.touch_updated_at();

-- --- Zugriff: ausschliesslich der Eigentuemer ------------------------------
--
-- KEIN TRAINERZUGRIFF, auch nicht ueber can_view_athlete. Eine Freigabe je
-- Kategorie braucht einen Umschlag mit dem Schluessel des Trainers; das ist
-- nicht gebaut. Bis dahin gibt es keinen Weg, und das ist die sichere Seite.

alter table public.health_entries enable row level security;

drop policy if exists health_select_own on public.health_entries;
create policy health_select_own on public.health_entries
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists health_insert_own on public.health_entries;
create policy health_insert_own on public.health_entries
  for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists health_update_own on public.health_entries;
create policy health_update_own on public.health_entries
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists health_delete_own on public.health_entries;
create policy health_delete_own on public.health_entries
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- --- Salz und Probe am Konto ------------------------------------------------
--
-- Der Salz ist nicht geheim, er muss nur gleich bleiben: sonst kaeme aus
-- derselben Phrase auf einem zweiten Geraet ein anderer Schluessel. Die Probe
-- ist ein bekannter Text, mit dem Schluessel verschluesselt — damit ein
-- zweites Geraet pruefen kann, ob die eingetippte Phrase stimmt.

alter table public.accounts
  add column if not exists health_salt text,
  add column if not exists health_verifier text;

alter table public.accounts drop constraint if exists accounts_health_salt_len;
alter table public.accounts add constraint accounts_health_salt_len
  check (health_salt is null or char_length(health_salt) between 16 and 64);
alter table public.accounts drop constraint if exists accounts_health_verifier_shape;
alter table public.accounts add constraint accounts_health_verifier_shape
  check (health_verifier is null or (health_verifier like 'v1.%' and char_length(health_verifier) <= 512));

comment on column public.accounts.health_salt is 'Salz fuer die Schluesselableitung der Gesundheitsschicht. Nicht geheim, aber unveraenderlich, solange Daten verschluesselt sind.';
comment on column public.accounts.health_verifier is 'Bekannter Text, mit dem abgeleiteten Schluessel verschluesselt. Erlaubt einem zweiten Geraet die Pruefung der Phrase.';

-- --- Kontoloeschung und Aufbewahrung ----------------------------------------

create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_own integer := 0;
  v_managed integer := 0;
  v_docs integer := 0;
  v_series integer := 0;
  v_health integer := 0;
begin
  if p_user_id is null then
    raise exception 'kein Konto angegeben' using errcode = '22004';
  end if;

  delete from public.athletes a
  where a.user_id is null
    and exists (
      select 1 from public.coach_athlete_links l
      where l.athlete_id = a.id and l.coach_id = p_user_id
    );
  get diagnostics v_managed = row_count;

  delete from public.athletes where user_id = p_user_id;
  get diagnostics v_own = row_count;

  delete from public.athlete_series where owner_id = p_user_id;
  get diagnostics v_series = row_count;

  delete from public.health_entries where owner_id = p_user_id;
  get diagnostics v_health = row_count;

  delete from public.athlete_documents where owner_id = p_user_id;
  get diagnostics v_docs = row_count;

  delete from public.accounts where id = p_user_id;
  delete from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'own_athletes', v_own,
    'managed_athletes', v_managed,
    'documents', v_docs,
    'series', v_series,
    'health_entries', v_health
  );
end;
$$;

revoke execute on function public.delete_account_data(uuid) from public, anon, authenticated;

create or replace function public.purge_expired()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_events integer;
  v_invites integer;
  v_links integer;
  v_orphans integer;
  v_tombstones integer;
  v_health integer;
begin
  delete from public.security_events where occurred_at < now() - interval '365 days';
  get diagnostics v_events = row_count;

  delete from public.athlete_invitations
  where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_invites = row_count;

  delete from public.coach_athlete_links
  where status = 'revoked' and revoked_at is not null and revoked_at < now() - interval '90 days';
  get diagnostics v_links = row_count;

  delete from public.athlete_series
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_tombstones = row_count;

  delete from public.health_entries
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_health = row_count;

  v_orphans := public.purge_orphaned_athletes();

  return jsonb_build_object(
    'security_events', v_events,
    'athlete_invitations', v_invites,
    'coach_athlete_links', v_links,
    'orphaned_athletes', v_orphans,
    'series_tombstones', v_tombstones,
    'health_tombstones', v_health
  );
end;
$$;

revoke execute on function public.purge_expired() from public, anon, authenticated;
