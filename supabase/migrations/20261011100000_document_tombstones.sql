-- =============================================================================
-- Grabsteine für ganze Athleten-Dokumente (Umbauplan Sprint 0, 11.10.2026)
--
-- DAS PROBLEM: Ein Athlet, den jemand auf einem Gerät löscht, verschwand nur
-- dort. Auf dem Server blieb sein Dokument stehen, und der nächste Abgleich
-- holte ihn zurück — auch auf das Gerät, auf dem er gerade gelöscht wurde.
-- Für die Zeitreihen gibt es Grabsteine seit 20260921120000_athlete_series;
-- für das Dokument selbst fehlte der Weg.
--
-- WIE ES JETZT GEHT: Löschen ist ein Grabstein, kein Loch. Das Gerät setzt
-- `deleted_at`; jedes andere Gerät sieht den Grabstein beim nächsten Abgleich
-- und entfernt den Athleten ebenfalls. Ein echtes DELETE ginge daran vorbei:
-- das zweite Gerät hielte den fehlenden Datensatz für «noch nie hochgeladen»
-- und schriebe ihn neu.
--
-- DATENSPARSAMKEIT: Mit dem Grabstein leert der Server den Inhalt
-- (`document = '{}'`) und setzt alle Zeitreihen-Zeilen des Athleten auf
-- Grabstein mit leerem Inhalt. Was bleibt, ist eine Kennung mit Zeitstempel —
-- nach 90 Tagen löscht `purge_expired()` auch die.
--
-- ZUGRIFF: unverändert. Setzen darf den Grabstein, wer das Dokument ändern
-- darf (`documents_update_pool`, Team-Bestand über `can_use_pool`); echtes
-- Löschen bleibt dem Inhaber vorbehalten (`documents_delete_own`). Die neue
-- Spalte braucht keine eigene Richtlinie — RLS gilt je Zeile, und die
-- Zeilen-Richtlinien bleiben dieselben.
-- =============================================================================

alter table public.athlete_documents
  add column if not exists deleted_at timestamptz;

comment on column public.athlete_documents.deleted_at is
  'Grabstein: gesetzt = Athlet gelöscht. Inhalt wird beim Setzen geleert; nach 90 Tagen entfernt purge_expired() die Zeile.';

-- --- Inhalt beim Grabstein leeren, Zeitreihen mitnehmen ------------------------

create or replace function public.athlete_document_tombstone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.deleted_at is not null and (old.deleted_at is null or old.deleted_at is distinct from new.deleted_at) then
    new.document := '{}'::jsonb;
    update public.athlete_series
       set deleted_at = coalesce(deleted_at, new.deleted_at),
           payload = '{}'::jsonb
     where owner_id = new.owner_id
       and athlete_id = new.athlete_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.athlete_document_tombstone() from public, anon, authenticated;

drop trigger if exists athlete_documents_tombstone on public.athlete_documents;
create trigger athlete_documents_tombstone
  before update of deleted_at on public.athlete_documents
  for each row execute function public.athlete_document_tombstone();

-- --- Aufbewahrung: Dokument-Grabsteine nach 90 Tagen -----------------------------
--
-- Dieselbe Frist wie bei den Zeitreihen: lange genug, dass jedes Gerät den
-- Grabstein gesehen hat. Die Funktion ist die Fassung aus
-- 20260923100000_analytics_events.sql plus die Dokument-Grabsteine.

create or replace function public.purge_expired()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_events integer; v_invites integer; v_links integer; v_orphans integer;
  v_tombstones integer; v_health integer; v_shares integer; v_analytics integer;
  v_documents integer;
begin
  delete from public.security_events where occurred_at < now() - interval '365 days';
  get diagnostics v_events = row_count;

  delete from public.athlete_invitations
  where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_invites = row_count;

  delete from public.athlete_series
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_tombstones = row_count;

  delete from public.athlete_documents
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_documents = row_count;

  delete from public.health_entries
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_health = row_count;

  delete from public.health_shares s
  where not exists (
    select 1 from public.coach_athlete_links l
    join public.athletes a on a.id = l.athlete_id
    where l.coach_id = s.coach_id and a.user_id = s.owner_id
      and l.status = 'active' and l.revoked_at is null
  );
  get diagnostics v_shares = row_count;

  -- Nutzungsereignisse: 90 Tage, wie in der Datenschutzerklärung zugesagt.
  delete from public.analytics_events where created_at < now() - interval '90 days';
  get diagnostics v_analytics = row_count;

  delete from public.coach_athlete_links
  where status = 'revoked' and revoked_at is not null and revoked_at < now() - interval '90 days';
  get diagnostics v_links = row_count;

  v_orphans := public.purge_orphaned_athletes();

  return jsonb_build_object(
    'security_events', v_events, 'athlete_invitations', v_invites,
    'coach_athlete_links', v_links, 'orphaned_athletes', v_orphans,
    'series_tombstones', v_tombstones, 'document_tombstones', v_documents,
    'health_tombstones', v_health, 'health_shares', v_shares,
    'analytics_events', v_analytics
  );
end;
$function$;

revoke execute on function public.purge_expired() from public, anon, authenticated;

-- --- Zeitplan ---------------------------------------------------------------------
--
-- Bis heute rief niemand `purge_expired()` auf: der Live-Audit vom 11.10.2026
-- fand keinen Cron-Eintrag. Damit galten die zugesagten Fristen (Nutzungs-
-- ereignisse 90 Tage, Sicherheitsereignisse 365 Tage) nur auf dem Papier.

select cron.unschedule(jobid) from cron.job where jobname = 'purge-expired-daily';
select cron.schedule('purge-expired-daily', '37 3 * * *', $$select public.purge_expired()$$);
