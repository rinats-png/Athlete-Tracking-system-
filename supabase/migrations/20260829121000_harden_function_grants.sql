-- =============================================================================
-- Härtung der Funktionsrechte (Supabase Security Advisor)
--
-- Die Berechtigungs-Helfer sind SECURITY DEFINER, weil sie in RLS-Policies
-- benutzt werden und sich sonst rekursiv auswerten würden. Postgres wertet
-- Policy-Ausdrücke mit den Rechten der aufrufenden Rolle aus — `authenticated`
-- braucht also EXECUTE. `anon` und PUBLIC bekommen es nicht: sonst wären die
-- Helfer als REST-Endpunkt /rest/v1/rpc/... ohne Login aufrufbar.
--
-- Trigger-Funktionen brauchen gar kein EXECUTE-Recht für Endnutzer; der
-- Trigger-Mechanismus ruft sie unabhängig davon auf.
-- =============================================================================

alter function public.set_updated_at() set search_path = public, pg_temp;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.link_creator_as_coach() from public, anon, authenticated;

revoke execute on function public.can_view_athlete(uuid) from public, anon;
revoke execute on function public.can_edit_athlete(uuid) from public, anon;
revoke execute on function public.can_view_result(uuid) from public, anon;
revoke execute on function public.can_edit_result(uuid) from public, anon;
revoke execute on function public.is_coach() from public, anon;
revoke execute on function public.my_coach_ids() from public, anon;
revoke execute on function public.has_entitlement(uuid, public.entitlement_product) from public, anon;

grant execute on function public.can_view_athlete(uuid) to authenticated;
grant execute on function public.can_edit_athlete(uuid) to authenticated;
grant execute on function public.can_view_result(uuid) to authenticated;
grant execute on function public.can_edit_result(uuid) to authenticated;
grant execute on function public.is_coach() to authenticated;
grant execute on function public.my_coach_ids() to authenticated;
grant execute on function public.has_entitlement(uuid, public.entitlement_product) to authenticated;
