-- =============================================================================
-- Trainerfreigabe je Kategorie — der Schluesselumschlag.
--
-- Bis hierher galt: KEIN Trainerzugriff auf health_entries, auch nicht ueber
-- can_view_athlete. Das war richtig, solange es keinen Umschlag gab: Eine
-- Zugriffsregel haette dem Trainer Chiffrat gezeigt, das er nicht oeffnen
-- kann, und dem Betreiber die Moeglichkeit gegeben, sich selbst zum Trainer
-- zu machen. Diese Regel bleibt unveraendert — health_entries oeffnet sich
-- niemandem ausser dem Eigentuemer.
--
-- Stattdessen gibt es eine ZWEITE Ablage: health_shares. Sie traegt je
-- Athlet, Trainer und Kategorie eine Abschrift, verschluesselt mit einem
-- frisch gewuerfelten Freigabeschluessel, und daneben diesen Schluessel im
-- Umschlag — verschlossen fuer den oeffentlichen Schluessel des Trainers.
-- Der Betreiber sieht zwei Chiffrate und kann keines oeffnen.
--
-- Die Kategorie steht hier IM KLARTEXT, anders als bei health_entries. Das
-- ist kein Versehen: Eine Freigabe existiert nur, weil der Athlet sie
-- ausdruecklich einem bestimmten Menschen erteilt hat, und beide Seiten
-- muessen ohne Schluessel sehen koennen, worueber sie reden — der Trainer
-- in seiner Liste, der Athlet beim Entzug. Wer die Zeile sieht, sieht, DASS
-- eine Kategorie freigegeben wurde; den Inhalt sieht er nicht.
-- =============================================================================

-- --- Das Schluesselpaar am Konto --------------------------------------------
--
-- Der oeffentliche Teil ist offen; damit verschliesst ein Athlet einen
-- Umschlag fuer diesen Trainer. Der private Teil liegt daneben, eingewickelt
-- in den Schluessel aus der Phrase desselben Kontos — fuer den Betreiber
-- wertlos, fuer den Besitzer auf jedem Geraet wiederherstellbar.
alter table public.accounts add column if not exists envelope_public text;
alter table public.accounts add column if not exists envelope_private text;

alter table public.accounts drop constraint if exists accounts_envelope_public_len;
alter table public.accounts add constraint accounts_envelope_public_len
  check (envelope_public is null or char_length(envelope_public) between 100 and 1000);

alter table public.accounts drop constraint if exists accounts_envelope_private_shape;
alter table public.accounts add constraint accounts_envelope_private_shape
  check (envelope_private is null or (envelope_private like 'v1.%' and char_length(envelope_private) <= 8000));

comment on column public.accounts.envelope_public is
  'Oeffentlicher RSA-OAEP-Schluessel (SPKI, Base64). Offen: damit verschliesst ein anderer einen Umschlag fuer dieses Konto.';
comment on column public.accounts.envelope_private is
  'Privater Schluessel, eingewickelt in den Schluessel aus der Phrase dieses Kontos. Ohne Phrase nutzlos.';

-- --- Die Freigaben ----------------------------------------------------------

create table if not exists public.health_shares (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  coach_id   uuid not null references auth.users (id) on delete cascade,
  -- Der lokale Athlet im Bestand des Eigentuemers.
  athlete_id text not null,
  category   text not null,
  -- Der Freigabeschluessel, RSA-OAEP-verschlossen fuer coach_id (Base64).
  envelope   text not null,
  -- Die Abschrift, AES-GCM-verschluesselt mit dem Freigabeschluessel.
  payload    text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, coach_id, athlete_id, category),
  constraint health_shares_category check (category in ('lab', 'symptoms', 'cycle', 'selfImage', 'meds', 'photos')),
  constraint health_shares_athlete_len check (char_length(athlete_id) between 1 and 80),
  constraint health_shares_envelope_len check (char_length(envelope) between 100 and 1000),
  constraint health_shares_shape check (payload like 'v1.%'),
  -- Eine Kategorie mit Fotos ist die groesste: 400 Bilder zu je rund 213 kB
  -- waeren zu viel fuer eine Zeile, deshalb deckelt die App die Abschrift
  -- und der Server prueft es nach.
  constraint health_shares_size check (octet_length(payload) <= 8 * 1024 * 1024),
  -- Niemand gibt sich selbst frei.
  constraint health_shares_not_self check (owner_id <> coach_id)
);

comment on table public.health_shares is
  'Abschrift einer Gesundheitskategorie, verschluesselt fuer genau einen Trainer. Der Betreiber kann sie nicht lesen. Entzug = Zeile loeschen.';

create index if not exists health_shares_coach_idx on public.health_shares (coach_id, updated_at);

drop trigger if exists health_shares_touch on public.health_shares;
create trigger health_shares_touch before update on public.health_shares
  for each row execute function public.touch_updated_at();

alter table public.health_shares enable row level security;

-- Der Athlet: darf alles mit seinen eigenen Freigaben.
drop policy if exists health_shares_select_own on public.health_shares;
create policy health_shares_select_own on public.health_shares
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists health_shares_insert_own on public.health_shares;
create policy health_shares_insert_own on public.health_shares
  for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists health_shares_update_own on public.health_shares;
create policy health_shares_update_own on public.health_shares
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists health_shares_delete_own on public.health_shares;
create policy health_shares_delete_own on public.health_shares
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- Der Trainer: darf LESEN, und nur solange die Verknuepfung aktiv und
-- nicht widerrufen ist. Zwei Schluesselfragen muessen also gleichzeitig ja
-- sagen: die Verknuepfung (hier) und der Umschlag (kryptografisch). Faellt
-- eine weg, ist Schluss.
drop policy if exists health_shares_select_coach on public.health_shares;
create policy health_shares_select_coach on public.health_shares
  for select to authenticated using (
    (select auth.uid()) = coach_id
    and exists (
      -- coach_athlete_links.athlete_id zeigt auf athletes.id, nicht auf ein
      -- Konto. Die Bruecke zum Konto ist athletes.user_id — ohne sie waere
      -- diese Bedingung nie wahr und die Freigabe fuer den Trainer
      -- unsichtbar.
      select 1
      from public.coach_athlete_links l
      join public.athletes a on a.id = l.athlete_id
      where l.coach_id = health_shares.coach_id
        and a.user_id = health_shares.owner_id
        and l.status = 'active'
        and l.revoked_at is null
    )
  );

-- Schreiben darf der Trainer NICHT. Eine Freigabe ist etwas, das man
-- bekommt, nicht etwas, das man sich nimmt.

-- --- Löschung und Aufräumen -------------------------------------------------
--
-- Zwei Ergänzungen, die leicht zu vergessen wären und beide Art. 17 betreffen:
--
--   1. Die Kontolöschung nimmt Freigaben mit — in BEIDE Richtungen. Wer sein
--      Konto löscht, löscht auch das, was er anderen gezeigt hat, und das,
--      was ihm gezeigt wurde.
--   2. Das Aufräumen entfernt Freigaben ohne aktive Verknüpfung. Die
--      Zugriffsregel verbirgt sie schon nach dem Widerruf; eine Zeile, die
--      niemand mehr lesen darf, hat aber auch keinen Grund, zu liegen.

create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_own integer := 0;
  v_managed integer := 0;
  v_docs integer := 0;
  v_series integer := 0;
  v_health integer := 0;
  v_shares integer := 0;
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

  delete from public.health_shares where owner_id = p_user_id or coach_id = p_user_id;
  get diagnostics v_shares = row_count;

  delete from public.athlete_documents where owner_id = p_user_id;
  get diagnostics v_docs = row_count;

  delete from public.accounts where id = p_user_id;
  delete from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'own_athletes', v_own,
    'managed_athletes', v_managed,
    'documents', v_docs,
    'series', v_series,
    'health_entries', v_health,
    'health_shares', v_shares
  );
end;
$function$;

create or replace function public.purge_expired()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_events integer;
  v_invites integer;
  v_links integer;
  v_orphans integer;
  v_tombstones integer;
  v_health integer;
  v_shares integer;
begin
  delete from public.security_events where occurred_at < now() - interval '365 days';
  get diagnostics v_events = row_count;

  delete from public.athlete_invitations
  where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_invites = row_count;

  delete from public.athlete_series
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_tombstones = row_count;

  delete from public.health_entries
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_health = row_count;

  -- Vor dem Aufräumen der Verknüpfungen: eine Freigabe ohne aktive
  -- Verknüpfung ist tot. Erst sie weg, dann die Verknüpfung — sonst wäre
  -- die Bedingung im selben Lauf schon verschwunden.
  delete from public.health_shares s
  where not exists (
    select 1 from public.coach_athlete_links l
    join public.athletes a on a.id = l.athlete_id
    where l.coach_id = s.coach_id
      and a.user_id = s.owner_id
      and l.status = 'active'
      and l.revoked_at is null
  );
  get diagnostics v_shares = row_count;

  delete from public.coach_athlete_links
  where status = 'revoked' and revoked_at is not null and revoked_at < now() - interval '90 days';
  get diagnostics v_links = row_count;

  v_orphans := public.purge_orphaned_athletes();

  return jsonb_build_object(
    'security_events', v_events,
    'athlete_invitations', v_invites,
    'coach_athlete_links', v_links,
    'orphaned_athletes', v_orphans,
    'series_tombstones', v_tombstones,
    'health_tombstones', v_health,
    'health_shares', v_shares
  );
end;
$function$;

-- --- Zwei Auskuenfte, die der Athlet braucht --------------------------------
--
-- `accounts` oeffnet sich nur dem Eigentuemer, und das bleibt so: Wer fremde
-- Kontozeilen lesen kann, kann Konten aufzaehlen. Diese beiden Funktionen
-- geben genau so viel heraus, wie eine Freigabe braucht, und nur an
-- jemanden, der mit dem Trainer tatsaechlich verknuepft ist.

create or replace function public.envelope_public_of(p_coach_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select a.envelope_public
  from public.accounts a
  where a.id = p_coach_id
    and exists (
      select 1
      from public.coach_athlete_links l
      join public.athletes ath on ath.id = l.athlete_id
      where l.coach_id = p_coach_id
        and ath.user_id = (select auth.uid())
        and l.status = 'active'
        and l.revoked_at is null
    );
$function$;

revoke all on function public.envelope_public_of(uuid) from public;
grant execute on function public.envelope_public_of(uuid) to authenticated;

create or replace function public.my_coaches()
returns table (coach_id uuid, display_name text, has_envelope boolean)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select distinct l.coach_id, acc.display_name, acc.envelope_public is not null
  from public.coach_athlete_links l
  join public.athletes ath on ath.id = l.athlete_id
  left join public.accounts acc on acc.id = l.coach_id
  where ath.user_id = (select auth.uid())
    and l.status = 'active'
    and l.revoked_at is null;
$function$;

revoke all on function public.my_coaches() from public;
grant execute on function public.my_coaches() to authenticated;
