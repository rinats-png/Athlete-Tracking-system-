-- =============================================================================
-- Annahme des Vertrags zur Auftragsverarbeitung (Art. 28 DSGVO) am Konto
--
-- Ein Trainer, der Athleten in KYDON fuehrt, ist Verantwortlicher; der
-- Betreiber verarbeitet in seinem Auftrag. Der Vertrag steht in der App
-- (src/features/legal/texts.ts, dpaDocument); die Annahme wird HIER
-- festgehalten — Zeitpunkt und Fassung — weil der Nachweis nicht auf einem
-- Geraet liegen darf, das morgen geloescht ist.
--
-- Geschrieben wird die Zeile nur vom Kontoinhaber (bestehende Policy
-- accounts_update_own). Es gibt keinen Weg, die Annahme fuer ein fremdes
-- Konto zu setzen.
-- =============================================================================

alter table public.accounts
  add column if not exists dpa_accepted_at timestamptz,
  add column if not exists dpa_version text;

alter table public.accounts
  drop constraint if exists accounts_dpa_version_len;
alter table public.accounts
  add constraint accounts_dpa_version_len check (dpa_version is null or char_length(dpa_version) <= 20);

comment on column public.accounts.dpa_accepted_at is 'Annahme des AV-Vertrags (Art. 28) durch den Kontoinhaber; nur Trainerkonten.';
comment on column public.accounts.dpa_version is 'Angenommene Fassung des AV-Vertrags (DPA_VERSION in der App).';
