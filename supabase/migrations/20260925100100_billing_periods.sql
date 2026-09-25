-- =============================================================================
-- Abrechnungszeitraum an der Freischaltung
--
-- Gezählt wird, wer im LAUFENDEN ABOJAHR gemessen wurde (src/domain/upgrade.ts).
-- Dafür braucht der Server den Beginn des Zeitraums, nicht nur sein Ende —
-- und bei monatlicher Zahlung den Tag, an dem das Abo begann: das Abojahr
-- läuft dann von Jahrestag zu Jahrestag, nicht von Monat zu Monat.
--
-- `scheduled_product` hält eine vorgemerkte Herabstufung fest. Sie greift erst
-- mit der Verlängerung (Stripe-Abo-Plan, eingerichtet von `change-plan`); bis
-- dahin gilt die bezahlte Stufe weiter. Herabstufen erstattet nichts.
--
-- Geschrieben werden alle Felder ausschliesslich vom Webhook und von
-- `change-plan` mit dem Dienstschlüssel. An den Policies ändert sich nichts:
-- die App liest die eigene Zeile und schreibt keine.
-- =============================================================================

alter table public.entitlements
  add column if not exists current_period_start timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists billing_interval text,
  add column if not exists scheduled_product public.entitlement_product,
  add column if not exists scheduled_at timestamptz;

alter table public.entitlements drop constraint if exists entitlements_billing_interval_check;
alter table public.entitlements add constraint entitlements_billing_interval_check
  check (billing_interval is null or billing_interval in ('yearly', 'monthly', 'once'));
