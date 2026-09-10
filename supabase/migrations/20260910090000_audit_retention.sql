-- =============================================================================
-- Sicherheitsprotokoll, Aufbewahrungsfristen, Dateitypen
--
-- Schliesst drei Punkte, die im ersten Durchgang offen blieben:
--   Abschnitt 14  Logging & Monitoring  — es gab gar keines
--   Abschnitt 15  Aufbewahrungsfristen  — waren undefiniert
--   Abschnitt 12  SVG im Branding-Bucket
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Das Sicherheitsprotokoll
--
-- WAS HIER HINEINGEHÖRT: Ereignisse, bei denen sich BERECHTIGUNGEN ändern.
-- Wer wurde Trainer, wer bekam Zugriff auf wen, wem wurde er entzogen, was
-- wurde gelöscht. Das sind die Vorgänge, bei denen man hinterher wissen will,
-- ob sie so gewollt waren — und die einzigen, bei denen ein Protokoll den
-- Preis wert ist, den es kostet.
--
-- WAS HIER NICHT HINEINGEHÖRT, und zwar ausnahmslos: Passwörter, Token,
-- E-Mail-Adressen, Messwerte, Notizen. Ein Protokoll ist selbst ein Ort, an
-- dem Daten liegen — und einer, den man beim Löschkonzept gern vergisst.
-- Deshalb stehen hier Kennungen und Ereignisnamen, sonst nichts. Wer die
-- Kennung auflösen will, braucht dafür wieder Rechte an den eigentlichen
-- Tabellen; das Protokoll allein verrät nichts.
--
-- ES IST ANHÄNGEND. Es gibt keine Policy für UPDATE und keine für DELETE:
-- ein Protokoll, das sein Verursacher ändern kann, beweist nichts. Geschrieben
-- wird ausschliesslich durch die Trigger unten (SECURITY DEFINER), gelöscht
-- ausschliesslich durch die Aufbewahrungsfrist.
-- -----------------------------------------------------------------------------
create table if not exists public.security_events (
  id                 bigint generated always as identity primary key,
  occurred_at        timestamptz not null default now(),
  -- Wer gehandelt hat. NULL heisst: das System, nicht ein Mensch.
  actor_id           uuid,
  event              text not null,
  -- Worauf sich das Ereignis bezog. Beides darf NULL sein.
  subject_user_id    uuid,
  subject_athlete_id uuid,
  -- Nur Kennungen und Zustände, nie Inhalte. Die Grenze steht als Bedingung
  -- in der Tabelle, nicht als Vorsatz im Code.
  detail             jsonb not null default '{}'::jsonb,
  constraint security_events_event_len check (char_length(event) between 1 and 60),
  constraint security_events_detail_small check (pg_column_size(detail) <= 2048)
);

comment on table public.security_events is
  'Anhängendes Protokoll der Berechtigungsänderungen. Keine Inhalte, keine Zugangsdaten, keine E-Mail-Adressen.';

create index if not exists security_events_actor_idx
  on public.security_events (actor_id, occurred_at desc);
create index if not exists security_events_subject_idx
  on public.security_events (subject_athlete_id, occurred_at desc);
create index if not exists security_events_age_idx
  on public.security_events (occurred_at);

alter table public.security_events enable row level security;

-- Lesen darf, wen es betrifft. Das ist keine Höflichkeit, sondern Art. 15
-- DSGVO: wer wissen will, wer Zugriff auf seine Daten hatte, bekommt hier die
-- Antwort. Kein Schreibrecht für irgendjemanden — auch nicht für den
-- Betroffenen.
create policy security_events_select_involved on public.security_events
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or subject_user_id = (select auth.uid())
    or (subject_athlete_id is not null and public.can_view_athlete(subject_athlete_id))
  );


-- -----------------------------------------------------------------------------
-- 2. Der Schreibweg
--
-- Eine einzige Funktion, damit es genau eine Stelle gibt, an der etwas ins
-- Protokoll gelangt. SECURITY DEFINER, weil die Tabelle für niemanden
-- beschreibbar ist — auch nicht für den, dessen Handlung protokolliert wird.
-- Kein EXECUTE für Endnutzer: sonst könnte jeder das Protokoll mit
-- erfundenen Zeilen fluten und damit unbrauchbar machen.
-- -----------------------------------------------------------------------------
create or replace function public.log_security_event(
  p_event text,
  p_subject_user_id uuid default null,
  p_subject_athlete_id uuid default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.security_events (actor_id, event, subject_user_id, subject_athlete_id, detail)
  values (auth.uid(), p_event, p_subject_user_id, p_subject_athlete_id, coalesce(p_detail, '{}'::jsonb));
exception when others then
  -- Ein fehlgeschlagenes Protokoll darf die Handlung nicht verhindern. Ein
  -- Athlet, der seinem Trainer den Zugriff entzieht, muss das auch dann
  -- können, wenn die Protokolltabelle gerade klemmt — sonst wird aus einer
  -- Sicherheitsfunktion eine Sperre.
  null;
end;
$$;

revoke execute on function
  public.log_security_event(text, uuid, uuid, jsonb) from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Woher die Ereignisse kommen
--
-- Über Trigger und nicht über Aufrufe in der App: die App ist der Client, und
-- ein Client, der sein eigenes Protokoll schreibt, protokolliert genau das,
-- was er zugeben möchte. An der Tabelle vorbei kommt niemand.
-- -----------------------------------------------------------------------------

-- Rollenwechsel. `is_coach` ist eine Selbstauskunft und darf das sein — aber
-- sie ist der Einstieg in den Trainerbetrieb, und wann jemand ihn genommen
-- hat, gehört festgehalten.
create or replace function public.log_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_coach is distinct from old.is_coach then
    perform public.log_security_event(
      'role_changed', new.id, null,
      jsonb_build_object('is_coach', new.is_coach)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_log_role on public.profiles;
create trigger profiles_log_role
  after update on public.profiles
  for each row execute function public.log_profile_role_change();

-- Zugriff auf einen Athleten: entstanden, verändert, entzogen. Das ist der
-- Vorgang, um dessentwillen dieses Protokoll überhaupt existiert — die
-- kritische Lücke des ersten Durchgangs lag genau hier.
create or replace function public.log_coach_link_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event text;
  v_row public.coach_athlete_links;
begin
  if tg_op = 'INSERT' then
    v_event := 'link_created';
    v_row := new;
  elsif tg_op = 'DELETE' then
    v_event := 'link_deleted';
    v_row := old;
  elsif new.status is distinct from old.status or new.can_edit is distinct from old.can_edit then
    v_event := 'link_changed';
    v_row := new;
  else
    return coalesce(new, old);
  end if;

  perform public.log_security_event(
    v_event, v_row.coach_id, v_row.athlete_id,
    jsonb_build_object('status', v_row.status, 'can_edit', v_row.can_edit)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists coach_links_log on public.coach_athlete_links;
create trigger coach_links_log
  after insert or update or delete on public.coach_athlete_links
  for each row execute function public.log_coach_link_change();

-- Löschungen. Ein verschwundener Athlet ohne Spur ist der Fall, in dem man
-- ein Protokoll am dringendsten braucht und am seltensten hat.
create or replace function public.log_athlete_deleted()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.log_security_event('athlete_deleted', old.user_id, old.id, '{}'::jsonb);
  return old;
end;
$$;

drop trigger if exists athletes_log_delete on public.athletes;
create trigger athletes_log_delete
  after delete on public.athletes
  for each row execute function public.log_athlete_deleted();


-- -----------------------------------------------------------------------------
-- 4. Aufbewahrungsfristen
--
-- Bisher war nichts definiert, und «nichts definiert» heisst in der Praxis
-- «für immer». Drei Fristen, jede mit einem Grund statt einer runden Zahl:
--
--   security_events        365 Tage — ein Jahr deckt einen vollen
--                          Saisonzyklus ab; wer eine Berechtigungsfrage
--                          später als das stellt, stellt sie an ein Gericht
--                          und nicht an die App.
--   athlete_invitations    30 Tage nach Ablauf — sie enthalten eine
--                          E-Mail-Adresse und haben nach dem Ablauf keinen
--                          Zweck mehr. Der Nachlauf ist da, damit «ich habe
--                          die Einladung nie bekommen» noch beantwortbar ist.
--   entzogene Verknüpfungen 90 Tage — ein Widerruf soll nachvollziehbar
--                          bleiben, aber nicht ewig als Beziehung
--                          herumstehen. Das Protokoll überlebt sie.
--
-- Die Funktion ist bewusst nicht automatisch verplant: ein Zeitplan, der
-- Daten löscht, gehört ausdrücklich eingerichtet und nicht als Nebenwirkung
-- einer Migration. `docs/sicherheit.md` sagt, wie.
-- -----------------------------------------------------------------------------
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
begin
  delete from public.security_events where occurred_at < now() - interval '365 days';
  get diagnostics v_events = row_count;

  delete from public.athlete_invitations
  where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_invites = row_count;

  delete from public.coach_athlete_links
  where status = 'revoked' and revoked_at is not null and revoked_at < now() - interval '90 days';
  get diagnostics v_links = row_count;

  return jsonb_build_object(
    'security_events', v_events,
    'athlete_invitations', v_invites,
    'coach_athlete_links', v_links
  );
end;
$$;

-- Nur der Dienstschlüssel darf löschen lassen. Ein Endnutzer, der das
-- auslösen könnte, hätte einen Weg, fremde Spuren zu tilgen.
revoke execute on function public.purge_expired() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. Kein SVG mehr im Branding-Bucket
--
-- SVG ist kein Bild, sondern ein Dokument, das Skripte tragen kann. Der
-- Bucket ist nicht öffentlich und die Inhaltsrichtlinie setzt
-- `object-src 'none'` — es war also nie eine offene Tür, sondern eine
-- angelehnte. Ein Vereinslogo gibt es auch als PNG.
--
-- Bereits hochgeladene SVG-Dateien bleiben liegen; die Grenze wirkt beim
-- Hochladen. Der Betreiber sollte sie einmal durchsehen — das steht in
-- `docs/sicherheit.md`, weil es Handarbeit ist und keine Migration.
-- -----------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'branding';
