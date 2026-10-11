-- =============================================================================
-- Drei Funktionen nicht mehr ohne Anmeldung aufrufbar (Live-Audit 11.10.2026)
--
-- `revoke all … from public` in den ursprünglichen Migrationen entzieht die
-- Rechte der Pseudo-Rolle PUBLIC. Supabase vergibt der Rolle `anon` aber eigene
-- Ausführungsrechte (Standardrechte im Schema `public`), und die blieben
-- stehen. Der Advisor meldete deshalb alle drei als «Public Can Execute
-- SECURITY DEFINER Function».
--
-- Auswirkung bisher gering — ohne Sitzung liefert `my_coaches()` nichts und
-- `is_analytics_admin()` false; `envelope_public_of()` gibt den öffentlichen
-- Schlüssel eines Trainers zu einer bekannten Kennung heraus. Trotzdem: was
-- nur Angemeldete brauchen, ist für Unangemeldete zu.
-- =============================================================================

revoke execute on function public.envelope_public_of(uuid) from anon;
revoke execute on function public.is_analytics_admin() from anon;
revoke execute on function public.my_coaches() from anon;

grant execute on function public.envelope_public_of(uuid) to authenticated;
grant execute on function public.is_analytics_admin() to authenticated;
grant execute on function public.my_coaches() to authenticated;
