-- =============================================================================
-- Kontolöschung, die wirklich löscht
--
-- BEFUND (hoch). `athletes.user_id` und `athletes.created_by` stehen auf
-- `on delete set null`. Verschwindet der Auth-Eintrag eines Menschen, bleibt
-- sein Athletendatensatz stehen — Vorname, Nachname, Geburtsdatum,
-- Geschlecht, Kontakt-E-Mail, Notizen — und daran hängend, über
-- `on delete cascade`, die vollständige Messhistorie samt Biometrie.
--
-- Der Datensatz gehört dann niemandem mehr. `can_view_athlete()` prüft
-- `user_id = auth.uid()`, und NULL ist nie gleich irgendetwas: der Betroffene
-- selbst käme nicht mehr heran, auch wenn er wollte. Ein Trainer mit
-- bestehender Verknüpfung dagegen sieht ihn weiter. Und gelöscht wird er nie,
-- weil ihn niemand mehr sieht, um ihn zu löschen.
--
-- Das ist die schlimmste Sorte Fehler in einem Löschweg: Er sieht von aussen
-- aus wie ein Löschen. Ein Konto verschwindet, die Anmeldung geht nicht mehr,
-- der Mensch hält seine Daten für weg — und sie liegen vollständig da.
-- Art. 17 DSGVO wäre damit nicht erfüllt, sondern nur so aussehend.
--
-- Deshalb ist Löschen hier ein ausdrücklicher Vorgang und keine Nebenwirkung
-- einer Fremdschlüsselregel. `delete_account_data()` räumt in der richtigen
-- Reihenfolge und in EINER Transaktion; die Edge Function entfernt danach den
-- Auth-Eintrag.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Was zu einem Konto gehört
--
-- Absichtlich als Aufzählung und nicht als Kaskade: Eine Kaskade tut, was das
-- Schema zufällig sagt. Diese Liste sagt, was gemeint ist — und wenn später
-- eine Tabelle dazukommt, fällt sie hier auf, weil sie fehlt.
--
-- WAS GELÖSCHT WIRD:
--   * die Athletendatensätze, die dem Konto GEHÖREN (user_id = Konto), samt
--     allem, was per Kaskade daran hängt: Ergebnisse, Stufen, Kennzahlen,
--     Biometrie, Testtage, Berichte
--   * der synchronisierte Bestand (`athlete_documents`) und die Kontozeile
--   * das Profil, die Verknüpfungen, das Branding, Einladungen
--
-- WAS NICHT GELÖSCHT WIRD, und warum:
--   * Klienten, die dieses Konto als TRAINER angelegt hat und die einen
--     eigenen Account haben — das sind andere Menschen. Ihre Daten gehören
--     ihnen, nicht dem Trainer, der aufhört.
--   * Klienten OHNE eigenen Account werden mitgelöscht: für sie gibt es
--     keinen zweiten Menschen, der sie beanspruchen könnte, und ohne Trainer
--     wären sie genau die verwaisten Datensätze, um die es hier geht.
--   * das Sicherheitsprotokoll: es hält fest, WER wann Zugriff hatte, und
--     ist damit selbst die Auskunft nach Art. 15. Es trägt keine Inhalte,
--     nur Kennungen — und die eigene Frist von 365 Tagen räumt es auf.
-- -----------------------------------------------------------------------------
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
begin
  if p_user_id is null then
    raise exception 'kein Konto angegeben' using errcode = '22004';
  end if;

  -- Klienten ohne eigenen Account, die dieses Konto betreut hat. Zuerst,
  -- solange die Verknüpfungen noch stehen — danach wären sie nicht mehr
  -- auffindbar.
  delete from public.athletes a
  where a.user_id is null
    and exists (
      select 1 from public.coach_athlete_links l
      where l.athlete_id = a.id and l.coach_id = p_user_id
    );
  get diagnostics v_managed = row_count;

  -- Die eigenen Athletendatensätze. Alles Fachliche hängt per Kaskade daran
  -- und geht mit.
  delete from public.athletes where user_id = p_user_id;
  get diagnostics v_own = row_count;

  delete from public.athlete_documents where owner_id = p_user_id;
  get diagnostics v_docs = row_count;

  delete from public.accounts where id = p_user_id;
  -- `profiles` hängt an auth.users und ginge ohnehin mit; ausdrücklich, damit
  -- der Vorgang auch dann vollständig ist, wenn er ohne Auth-Löschung läuft.
  delete from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'own_athletes', v_own,
    'managed_athletes', v_managed,
    'documents', v_docs
  );
end;
$$;

-- Nur der Dienstschlüssel. Eine Funktion, die ein Konto ausräumt, darf kein
-- angemeldeter Nutzer mit einer fremden Kennung aufrufen können — der
-- Parameter ist ihr Angriffspunkt, und die Edge Function setzt ihn aus der
-- geprüften Sitzung, nicht aus dem Anfragekörper.
revoke execute on function public.delete_account_data(uuid) from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Was bereits verwaist ist
--
-- Die Regel oben gilt ab jetzt. Datensätze, die vor dieser Migration
-- zurückblieben, räumt sie nicht — deshalb ein Kehraus, der in die
-- Aufbewahrung einzieht.
--
-- Ein Athlet gilt als verwaist, wenn er weder einem Konto gehört, noch von
-- einem bekannten Konto angelegt wurde, noch von irgendjemandem betreut wird.
-- Alle drei Bedingungen zusammen: ein vom Trainer angelegter Klient hat
-- `user_id is null` und ist trotzdem nicht verwaist, solange die Verknüpfung
-- steht. Nur wo keiner der drei Wege mehr zu einem Menschen führt, ist der
-- Datensatz wirklich niemandes.
-- -----------------------------------------------------------------------------
create or replace function public.purge_orphaned_athletes()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  delete from public.athletes a
  where a.user_id is null
    and a.created_by is null
    and not exists (
      select 1 from public.coach_athlete_links l where l.athlete_id = a.id
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.purge_orphaned_athletes() from public, anon, authenticated;

-- Der Kehraus gehört zur Aufbewahrung, also läuft er mit ihr.
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
begin
  delete from public.security_events where occurred_at < now() - interval '365 days';
  get diagnostics v_events = row_count;

  delete from public.athlete_invitations
  where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_invites = row_count;

  delete from public.coach_athlete_links
  where status = 'revoked' and revoked_at is not null and revoked_at < now() - interval '90 days';
  get diagnostics v_links = row_count;

  v_orphans := public.purge_orphaned_athletes();

  return jsonb_build_object(
    'security_events', v_events,
    'athlete_invitations', v_invites,
    'coach_athlete_links', v_links,
    'orphaned_athletes', v_orphans
  );
end;
$$;

revoke execute on function public.purge_expired() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Der synchronisierte Bestand ist ein Objekt, kein beliebiges JSON
--
-- Abschnitt 1 des Standards: der Server darf dem Client nicht glauben. Der
-- Bestand wird heute ausschliesslich im Browser gegen ein Zod-Schema geprüft;
-- die Datenbank nimmt jedes `jsonb` bis 8 MB. Die vollständige Form
-- serverseitig nachzubauen wäre ein zweites Schema, das mit dem ersten
-- auseinanderläuft — schlimmer als keins.
--
-- Was bleibt, ist die Grenze, die auch ohne Schemakenntnis stimmt: es muss
-- ein Objekt sein, und die Versionsnummer muss zur Zeile passen. Ein Array
-- oder eine nackte Zahl an dieser Stelle ist kein «anderer Stand», sondern
-- ein Bestand, an dem die App des Eigentümers beim nächsten Laden zerbricht.
-- -----------------------------------------------------------------------------
alter table public.athlete_documents
  drop constraint if exists athlete_documents_is_object;
alter table public.athlete_documents
  add constraint athlete_documents_is_object
  check (jsonb_typeof(document) = 'object');
