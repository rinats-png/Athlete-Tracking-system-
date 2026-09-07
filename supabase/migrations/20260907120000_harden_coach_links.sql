-- =============================================================================
-- Sicherheitsmigration: Zugriff auf fremde Athleten schliessen
--
-- BEFUND (kritisch). Die bisherige Regel für `coach_athlete_links` lautete:
--
--   create policy "links_insert_as_coach" ... with check (
--     coach_id = auth.uid() and public.is_coach()
--   );
--
-- Sie prüfte, WER schreibt, aber nicht, ÜBER WEN. `athlete_id` war frei
-- wählbar, `status` steht per Vorgabe auf 'active' und `can_edit` auf true.
-- Jeder angemeldete Nutzer konnte also im eigenen Profil `is_coach` setzen
-- — das darf er, Trainer ist eine Selbstauskunft — und danach eine Zeile
-- (coach_id = ich, athlete_id = irgendeine) einfügen. Damit galt er als
-- aktiver Trainer dieses Athleten und bekam über `can_view_athlete()` und
-- `can_edit_athlete()` Lese- UND Schreibrecht auf dessen gesamte Historie:
-- Messwerte, Biometrie, Berichte, Notizen.
--
-- Dass die Athleten-Kennung eine UUID und damit nicht zu raten ist, war der
-- einzige Schutz. Eine Objekt-Kennung ist kein Berechtigungsnachweis: sie
-- steht in Exportdateien, in Übergabelinks und in Berichtspfaden.
--
-- Dieselbe Lücke bestand beim Ändern. `links_update_involved` hatte kein
-- WITH CHECK, Postgres nimmt dann den USING-Ausdruck auch für die neue
-- Zeile — und `coach_id = auth.uid()` gilt für die neue Zeile weiter, wenn
-- man nur `athlete_id` auf einen fremden Athleten dreht.
--
-- DIE KORREKTUR hat zwei Teile, weil eine Policy allein nicht ausreicht:
-- USING sieht die alte Zeile, WITH CHECK die neue, aber keine von beiden
-- sieht BEIDE. Die Frage «ist dieser Übergang erlaubt?» braucht beide
-- Zeilen, und die beantwortet ein Trigger.
--
--   1. Policies: wer überhaupt schreiben darf.
--   2. Trigger:  welcher Übergang erlaubt ist.
--
-- WAS SICH FÜR DIE APP ÄNDERT: nichts. Die App schreibt an keiner Stelle
-- selbst in `coach_athlete_links` — die Verknüpfung für selbst angelegte
-- Klienten entsteht im Trigger `athletes_link_creator`, und der läuft als
-- SECURITY DEFINER an den Policies vorbei. Die Regeln schliessen damit
-- einen Weg, den nur ein Angreifer je benutzt hätte.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Wer schreiben darf
-- -----------------------------------------------------------------------------
drop policy if exists "links_insert_as_coach" on public.coach_athlete_links;
drop policy if exists "links_update_involved" on public.coach_athlete_links;

-- Ein Trainer darf eine Verknüpfung nur ANFRAGEN, nie selbst aktiv setzen,
-- und nur zu einem Athleten, zu dem er bereits eine Beziehung hat: einem
-- selbst angelegten Klienten oder einem, für den eine gültige, noch nicht
-- eingelöste Einladung vorliegt. Alles andere ist ein Zugriff auf einen
-- Fremden und wird abgewiesen.
create policy "links_insert_requested" on public.coach_athlete_links
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and public.is_coach()
    and status = 'pending'
    and (
      exists (
        select 1 from public.athletes a
        where a.id = athlete_id and a.created_by = (select auth.uid())
      )
      or exists (
        select 1 from public.athlete_invitations i
        where i.athlete_id = coach_athlete_links.athlete_id
          and i.coach_id = (select auth.uid())
          and i.accepted_at is null
          and i.expires_at > now()
      )
    )
  );

-- Ändern darf, wer beteiligt ist — welcher Übergang zulässig ist, entscheidet
-- der Trigger weiter unten. WITH CHECK ist hier nicht optional: ohne ihn
-- gälte der USING-Ausdruck für die neue Zeile, und `athlete_id` wäre frei.
create policy "links_update_involved" on public.coach_athlete_links
  for update to authenticated
  using (
    coach_id = (select auth.uid())
    or exists (
      select 1 from public.athletes a
      where a.id = athlete_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    coach_id = (select auth.uid())
    or exists (
      select 1 from public.athletes a
      where a.id = athlete_id and a.user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Welcher Übergang erlaubt ist
--
-- Zwei Regeln, beide mit derselben Begründung: eine Verknüpfung ist die
-- einzige Quelle der Berechtigung, also darf niemand sie auf sich selbst
-- umschreiben und niemand sich selbst freischalten.
--
--   a) `coach_id` und `athlete_id` sind unveränderlich. Wer die Beziehung
--      ändern will, löscht sie und legt eine neue an — und läuft dabei durch
--      die Insert-Regel oben.
--   b) Auf 'active' setzen darf nur die Athletenseite. Der Trainer fragt an,
--      der Athlet lässt herein. Sonst wäre die Einladung eine Formalie, die
--      der Einladende selbst abnickt.
--
-- Der Trigger ist SECURITY INVOKER: er stellt keine Rechte bereit, er prüft
-- nur. Er läuft ausdrücklich NICHT für die Trigger-Funktion
-- `link_creator_as_coach` — die legt an, sie ändert nicht.
-- -----------------------------------------------------------------------------
create or replace function public.guard_coach_link_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_is_athlete_side boolean;
begin
  if new.coach_id is distinct from old.coach_id
     or new.athlete_id is distinct from old.athlete_id then
    raise exception 'coach_id und athlete_id einer Verknüpfung sind unveraenderlich'
      using errcode = '42501';
  end if;

  select exists (
    select 1 from public.athletes a
    where a.id = old.athlete_id and a.user_id = auth.uid()
  ) into v_is_athlete_side;

  if new.status = 'active' and old.status is distinct from 'active'
     and not v_is_athlete_side then
    raise exception 'nur die Athletenseite kann eine Verknüpfung aktivieren'
      using errcode = '42501';
  end if;

  -- Mehr Schreibrecht als vereinbart darf sich die Trainerseite ebenfalls
  -- nicht selbst geben.
  if new.can_edit and not old.can_edit and not v_is_athlete_side then
    raise exception 'nur die Athletenseite kann Schreibrecht erteilen'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_coach_link_update() from public, anon, authenticated;

drop trigger if exists coach_links_guard_update on public.coach_athlete_links;
create trigger coach_links_guard_update
  before update on public.coach_athlete_links
  for each row execute function public.guard_coach_link_update();

-- -----------------------------------------------------------------------------
-- 3. Einladungen: nicht auf fremde Athleten ausstellen
--
-- `invitations_manage_own` prüfte im WITH CHECK `can_edit_athlete` — das ist
-- richtig. Im USING stand aber nur `coach_id = auth.uid()`, und USING gilt
-- auch für DELETE und für die alte Zeile beim UPDATE. Das ist unkritisch,
-- solange nur der Ersteller gemeint ist; ausdrücklich hinschreiben ist
-- trotzdem besser als sich darauf zu verlassen.
-- -----------------------------------------------------------------------------
drop policy if exists "invitations_manage_own" on public.athlete_invitations;

create policy "invitations_select_own" on public.athlete_invitations
  for select to authenticated using (coach_id = (select auth.uid()));

create policy "invitations_insert_own" on public.athlete_invitations
  for insert to authenticated
  with check (coach_id = (select auth.uid()) and public.can_edit_athlete(athlete_id));

create policy "invitations_update_own" on public.athlete_invitations
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and public.can_edit_athlete(athlete_id));

create policy "invitations_delete_own" on public.athlete_invitations
  for delete to authenticated using (coach_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 4. Übersetzungen fremder Tests
--
-- `test_translations_select` prüfte nur, DASS die Testdefinition existiert.
-- Die RLS der Definitionstabelle greift im Unterabfrage-Ausdruck zwar mit,
-- aber die Regel las sich, als täte sie es nicht — und eine Regel, deren
-- Schutz von einer Feinheit des Auswerters abhängt, ist keine. Jetzt steht
-- dieselbe Bedingung da wie bei den Definitionen selbst.
-- -----------------------------------------------------------------------------
drop policy if exists "test_translations_select" on public.test_definition_translations;

create policy "test_translations_select" on public.test_definition_translations
  for select to authenticated
  using (
    exists (
      select 1 from public.test_definitions d
      where d.id = test_definition_id
        and (
          d.is_system
          or d.owner_coach_id = (select auth.uid())
          or d.owner_coach_id in (select public.my_coach_ids())
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Speicher: Avatare nicht mehr öffentlich, Pfade robust auswerten
--
-- Der Avatar-Bucket stand auf `public`. Damit war jedes Profilbild ohne
-- Anmeldung abrufbar, sobald jemand die Nutzerkennung kannte — und die steht
-- im Dateinamen. Ein Gesichtsbild ist ein personenbezogenes Datum; es gehört
-- nicht in ein offenes Verzeichnis (Datenminimierung, Abschnitt 15).
--
-- Ausserdem warf die Pfadauswertung: `split_part(name,'/',1)::uuid` erzeugt
-- bei einem Namen ohne gültige Kennung einen Fehler statt `false`, und ein
-- Fehler in einer Policy bricht die ganze Abfrage ab. Der Helfer liefert
-- jetzt NULL, und NULL heisst: nein.
-- -----------------------------------------------------------------------------
update storage.buckets set public = false where id = 'avatars';

create or replace function public.safe_uuid(p_text text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return nullif(p_text, '')::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function public.safe_uuid(text) to authenticated;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_write_own" on storage.objects;
drop policy if exists "reports_read_permitted" on storage.objects;
drop policy if exists "reports_write_permitted" on storage.objects;
drop policy if exists "branding_read_own_or_my_coach" on storage.objects;
drop policy if exists "branding_write_own" on storage.objects;

create policy "reports_read_permitted" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and public.can_view_athlete(public.safe_uuid(split_part(name, '/', 1)))
  );

create policy "reports_write_permitted" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and public.can_edit_athlete(public.safe_uuid(split_part(name, '/', 1)))
    and public.has_entitlement((select auth.uid()), 'coach_pro')
  );

create policy "branding_read_own_or_my_coach" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'branding'
    and (
      public.safe_uuid(split_part(name, '/', 1)) = (select auth.uid())
      or public.safe_uuid(split_part(name, '/', 1)) in (select public.my_coach_ids())
    )
  );

create policy "branding_write_own" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'branding'
    and public.safe_uuid(split_part(name, '/', 1)) = (select auth.uid())
  )
  with check (
    bucket_id = 'branding'
    and public.safe_uuid(split_part(name, '/', 1)) = (select auth.uid())
  );

-- Avatare: nur noch der Eigentümer und die Menschen, die ohnehin
-- zusammenarbeiten. Beide Blickrichtungen ausdrücklich, denn sie sind nicht
-- dasselbe: der Athlet sieht das Bild seines Trainers, der Trainer das Bild
-- seines Athleten. Ausgeliefert wird über signierte, kurzlebige Links.
create or replace function public.can_view_user_avatar(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id is not null and (
    p_user_id = auth.uid()
    -- Er ist einer meiner Trainer.
    or p_user_id in (select public.my_coach_ids())
    -- Oder er ist ein Athlet, den ich betreue.
    or exists (
      select 1 from public.athletes a
      where a.user_id = p_user_id and public.can_view_athlete(a.id)
    )
  );
$$;

revoke execute on function public.can_view_user_avatar(uuid) from public, anon;
grant execute on function public.can_view_user_avatar(uuid) to authenticated;

create policy "avatars_read_permitted" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_view_user_avatar(public.safe_uuid(split_part(name, '.', 1)))
  );

create policy "avatars_write_own" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and public.safe_uuid(split_part(name, '.', 1)) = (select auth.uid())
  )
  with check (
    bucket_id = 'avatars'
    and public.safe_uuid(split_part(name, '.', 1)) = (select auth.uid())
  );
