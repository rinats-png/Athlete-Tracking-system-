-- =============================================================================
-- Testkatalog: standardisierte Systemtests + eigene Tests von Pro-Trainern
-- =============================================================================

create table public.test_definitions (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  category             public.test_category not null,
  -- Primärachse im Radar-Chart (auch für Gruppierung und Badges in der UI).
  dimension            public.performance_dimension not null,
  -- Auf welche Radar-Achsen der Test einzahlt und mit welchem Wert. Map
  -- Dimension -> metric_key, z. B. bei der Kniebeuge:
  --   {"max_strength": "one_rm_kg", "relative_strength": "relative_strength_bw"}
  -- Der Sonderwert 'score' verweist auf test_results.score, jeder andere
  -- Schlüssel auf einen Eintrag in result_metrics.
  dimension_metrics    jsonb not null default '{}'::jsonb,
  scoring_direction    public.scoring_direction not null default 'higher_is_better',
  -- Welches Feld des Ergebnisses ist der Score (z. B. 'distance_m').
  primary_metric       text not null,
  primary_unit         text not null,
  -- Formularspezifikation für den geführten Modus (Eingabefelder, Pflichtfelder).
  input_fields         jsonb not null default '[]'::jsonb,
  -- Timer-/Ablaufkonfiguration für die Test-Engine.
  protocol             jsonb not null default '{}'::jsonb,
  -- Stufentests (Laktat-Ramp, Beep-Test) speichern zusätzlich Einzelstufen.
  supports_stages      boolean not null default false,
  requires_body_weight boolean not null default false,
  -- Welche abgeleiteten Metriken die App aus den Rohdaten berechnet.
  derived_metrics      text[] not null default '{}',
  is_system            boolean not null default true,
  owner_coach_id       uuid references public.profiles (id) on delete cascade,
  is_active            boolean not null default true,
  sort_order           integer not null default 100,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint test_definitions_owner_check
    check (is_system = (owner_coach_id is null))
);

create index test_definitions_category_idx on public.test_definitions (category, sort_order);
create index test_definitions_owner_idx on public.test_definitions (owner_coach_id);

create trigger test_definitions_set_updated_at
  before update on public.test_definitions
  for each row execute function public.set_updated_at();

-- Namen und Protokolltexte je Sprache. Die App ist von Beginn an zweisprachig,
-- Reports werden in der Sprache des Klienten erzeugt.
create table public.test_definition_translations (
  test_definition_id    uuid not null references public.test_definitions (id) on delete cascade,
  locale                public.app_locale not null,
  name                  text not null,
  short_name            text,
  summary               text,
  protocol_instructions text,
  equipment             text,
  primary key (test_definition_id, locale)
);
