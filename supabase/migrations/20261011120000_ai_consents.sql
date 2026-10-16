-- =============================================================================
-- Einwilligung in die Formulierung durch ein Sprachmodell (docs/ki-einwilligung.md)
--
-- WARUM AUF DEM SERVER: Art. 7 Abs. 1 DSGVO verlangt, dass der Verantwortliche
-- die Einwilligung NACHWEISEN kann. Ein Haken im Browser genügt dafür nicht —
-- und er liesse sich umgehen. Die Edge Function `phrase` fragt deshalb hier,
-- ob für diese Fassung eine gültige Einwilligung besteht, BEVOR sie Fakten an
-- den Anbieter schickt.
--
-- WAS GESPEICHERT WIRD: nur, DASS und WANN eingewilligt oder widerrufen wurde,
-- welche Fassung des Textes galt und dass die Person ihr Mindestalter (16,
-- Art. 8 DSGVO) bestätigt hat. Keine Fakten, kein Text, keine IP-Adresse.
--
-- WIDERRUF: setzt `withdrawn_at`. Die Zeile bleibt — ein Widerruf ist Teil des
-- Nachweises. Mit dem Konto verschwindet sie (on delete cascade).
-- =============================================================================

create table if not exists public.ai_consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  age_confirmed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint ai_consents_version_len check (char_length(version) between 1 and 20)
);

comment on table public.ai_consents is
  'Nachweis der Einwilligung in die KI-Formulierung (Art. 7 Abs. 1 DSGVO): Fassung, Zeitpunkt, Widerruf, Altersbestätigung.';

alter table public.ai_consents enable row level security;

drop policy if exists ai_consents_select_own on public.ai_consents;
create policy ai_consents_select_own on public.ai_consents
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ai_consents_insert_own on public.ai_consents;
create policy ai_consents_insert_own on public.ai_consents
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists ai_consents_update_own on public.ai_consents;
create policy ai_consents_update_own on public.ai_consents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Kein DELETE für Clients: der Nachweis soll nicht verschwinden, solange das
-- Konto besteht. Widerrufen geht über `withdrawn_at`.

revoke all on public.ai_consents from anon;
grant select, insert, update on public.ai_consents to authenticated;

drop trigger if exists ai_consents_touch on public.ai_consents;
create trigger ai_consents_touch before update on public.ai_consents
  for each row execute function public.touch_updated_at();
