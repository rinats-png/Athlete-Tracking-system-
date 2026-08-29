-- =============================================================================
-- Baseline Diagnostics — Grundtypen, Extensions und Hilfsfunktionen
-- =============================================================================

create extension if not exists "pgcrypto";

-- Sprache der App (UI + Reports). Bewusst als Enum, damit Übersetzungstabellen
-- referenzielle Integrität bekommen.
create type public.app_locale as enum ('de', 'en');

-- Geschlecht wird für Normwerte (Referenztabellen) und den Sinclair-Koeffizienten
-- gebraucht. 'other' ist erlaubt, fällt bei Normvergleichen aber auf 'keine Norm'
-- zurück, weil es keine belastbaren Referenzdaten dafür gibt.
create type public.sex as enum ('male', 'female', 'other');

create type public.unit_system as enum ('metric', 'imperial');
create type public.theme_preference as enum ('system', 'light', 'dark');

-- Testkategorien = Gliederung des Testkatalogs.
create type public.test_category as enum (
  'endurance',
  'max_strength',
  'strength_endurance',
  'power',
  'agility'
);

-- Leistungsdimensionen = die sechs Achsen des Spider-Web-Diagramms.
-- 'relative_strength' ist keine eigene Testkategorie, sondern wird aus
-- Maxkraft-Tests relativ zum Körpergewicht abgeleitet.
create type public.performance_dimension as enum (
  'endurance',
  'max_strength',
  'relative_strength',
  'strength_endurance',
  'power',
  'agility'
);

-- Bei Zeit-Tests (Illinois, 2000 m Rudern) ist weniger besser.
create type public.scoring_direction as enum ('higher_is_better', 'lower_is_better');

create type public.link_status as enum ('pending', 'active', 'revoked');
create type public.record_status as enum ('draft', 'completed', 'invalid');
create type public.data_source as enum ('manual', 'health_connect', 'apple_health', 'import');

create type public.entitlement_product as enum ('athlete_pro', 'coach_pro');
create type public.entitlement_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'expired'
);

-- Modus für die Radar-Normierung: gegen die eigene Bestleistung oder gegen
-- Populations-Referenzwerte.
create type public.score_mode as enum ('personal_best', 'population');

-- -----------------------------------------------------------------------------
-- updated_at automatisch pflegen
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
