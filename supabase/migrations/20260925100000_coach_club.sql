-- =============================================================================
-- Coach Club als Produkt des Bezahlwegs (Preisstaffel vom 25.09.2026)
--
-- Fünf Trainerstufen statt drei: Free 3, Start 10, Team 30, Pro 75, Club 150
-- gemessene Athleten im Jahr (src/data/pricing.ts). Club ist neu. Ein neuer
-- Enum-Wert lässt sich nur ausserhalb einer Transaktion anlegen und in
-- derselben nicht benutzen — deshalb steht er hier allein.
-- =============================================================================

alter type public.entitlement_product add value if not exists 'coach_club';
