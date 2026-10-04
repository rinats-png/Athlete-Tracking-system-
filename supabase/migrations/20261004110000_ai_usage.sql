-- =============================================================================
-- Zähler für Sprachmodell-Texte (Umbau Etappe 7c, docs/ask-kydon.md)
--
-- WAS DAS IST: wie oft ein Konto in einem Kalendermonat die Umformulierung
-- durch ein Sprachmodell genutzt hat. Mehr steht hier nicht: kein Text, keine
-- Fakten, keine Anfrage. Die Grenze (30 je Monat, Pro) prüft die Edge
-- Function `phrase`; geschrieben wird nur über `ai_usage_bump`, aufrufbar nur
-- mit dem Service-Schlüssel der Edge Function. Der Client kann den Zähler
-- weder erhöhen noch zurücksetzen.
-- =============================================================================

create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      text not null check (month ~ '^\d{4}-\d{2}$'),
  calls      integer not null default 0 check (calls >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

comment on table public.ai_usage is
  'Aufrufe der Sprachmodell-Umformulierung je Konto und Monat. Nur Zähler, kein Inhalt. Schreiben nur über ai_usage_bump.';

alter table public.ai_usage enable row level security;

-- Lesen darf nur der Eigentümer (damit die App «noch 12 übrig» zeigen kann).
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.ai_usage from anon, authenticated;

-- Erhöht den Zähler atomar, solange die Grenze nicht erreicht ist.
-- Gibt den neuen Stand zurück, oder null, wenn die Grenze schon erreicht war.
create or replace function public.ai_usage_bump(p_user uuid, p_month text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_calls integer;
begin
  insert into public.ai_usage as u (user_id, month, calls)
  values (p_user, p_month, 1)
  on conflict (user_id, month)
  do update set calls = u.calls + 1, updated_at = now()
  where u.calls < p_limit
  returning u.calls into new_calls;
  return new_calls;
end;
$$;

revoke all on function public.ai_usage_bump(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.ai_usage_bump(uuid, text, integer) to service_role;
