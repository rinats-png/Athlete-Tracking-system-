-- =============================================================================
-- Produkte des Bezahlwegs (Etappe 4, docs/ausbau.md §10)
--
-- Der Typ kannte zwei Produkte aus der ersten Fassung: athlete_pro und
-- coach_pro. Die Stufen aus dem Ausbau brauchen sechs. Neue Werte eines
-- Enums lassen sich nur ausserhalb einer Transaktion anlegen und in
-- derselben nicht benutzen — deshalb steht das hier allein, und alles, was
-- die Werte benutzt, in der nächsten Migration.
-- =============================================================================

alter type public.entitlement_product add value if not exists 'athlete_plus';
alter type public.entitlement_product add value if not exists 'athlete_termin';
alter type public.entitlement_product add value if not exists 'coach_start';
alter type public.entitlement_product add value if not exists 'coach_team';
