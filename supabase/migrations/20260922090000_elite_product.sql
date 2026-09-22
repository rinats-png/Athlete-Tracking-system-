-- =============================================================================
-- Elite als Produkt des Bezahlwegs (S5, docs/ausbau.md §10)
--
-- Elite stand im Plan, aber nicht im Code: kein Merkmal in pricing.ts ist ein
-- Versprechen auf spaeter, und die Gesundheitsschicht war nicht gebaut. Jetzt
-- ist sie es — also bekommt die Stufe ihr Produkt.
-- =============================================================================

alter type public.entitlement_product add value if not exists 'athlete_elite';
