-- =============================================================================
-- Diagnostik-Termine, Testergebnisse, Stufendaten, berechnete Metriken
-- =============================================================================

-- Ein Assessment bündelt die Tests eines Diagnostik-Termins. Das ist die
-- Einheit, aus der später ein PDF-Report entsteht.
create table public.assessments (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.athletes (id) on delete cascade,
  coach_id     uuid references public.profiles (id) on delete set null,
  title        text,
  performed_on date not null default current_date,
  status       public.record_status not null default 'draft',
  notes        text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index assessments_athlete_idx on public.assessments (athlete_id, performed_on desc);

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- Rohdaten eines einzelnen Tests. Häufige Messgrößen sind eigene Spalten
-- (abfragbar, indizierbar, typsicher), testspezifische Sonderfälle landen in
-- `extra`.
create table public.test_results (
  id                 uuid primary key default gen_random_uuid(),
  athlete_id         uuid not null references public.athletes (id) on delete cascade,
  assessment_id      uuid references public.assessments (id) on delete set null,
  test_definition_id uuid not null references public.test_definitions (id) on delete restrict,
  performed_at       timestamptz not null default now(),
  status             public.record_status not null default 'completed',

  -- Rohdaten
  duration_seconds   numeric(10,2) check (duration_seconds > 0),
  distance_m         numeric(10,2) check (distance_m >= 0),
  reps               integer check (reps >= 0),
  rounds             numeric(8,2) check (rounds >= 0),
  load_kg            numeric(7,2) check (load_kg >= 0),
  calories           numeric(8,2) check (calories >= 0),
  avg_heart_rate     integer check (avg_heart_rate between 30 and 240),
  max_heart_rate     integer check (max_heart_rate between 30 and 240),
  rpe                numeric(3,1) check (rpe between 1 and 10),
  extra              jsonb not null default '{}'::jsonb,

  -- Kontext-Snapshot zum Testzeitpunkt. Bewusst redundant zu biometric_entries:
  -- ein Ergebnis muss auch Jahre später exakt reproduzierbar bleiben, selbst
  -- wenn Stammdaten korrigiert werden.
  body_weight_kg     numeric(6,2),
  age_years          integer,
  sex                public.sex,

  -- Normalisierter Primärwert in `test_definitions.primary_unit`.
  score              numeric,
  score_unit         text,

  source             public.data_source not null default 'manual',
  notes              text,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index test_results_athlete_test_idx
  on public.test_results (athlete_id, test_definition_id, performed_at desc);
create index test_results_assessment_idx on public.test_results (assessment_id);

create trigger test_results_set_updated_at
  before update on public.test_results
  for each row execute function public.set_updated_at();

-- Stufenprotokoll für Ramp-Tests (Laktat, Beep-Test, Watt-Stufen).
create table public.test_result_stages (
  id               uuid primary key default gen_random_uuid(),
  result_id        uuid not null references public.test_results (id) on delete cascade,
  stage_index      integer not null check (stage_index >= 0),
  duration_seconds numeric(8,2),
  speed_kmh        numeric(5,2),
  incline_percent  numeric(4,1),
  power_watts      numeric(6,1),
  heart_rate       integer check (heart_rate between 30 and 240),
  lactate_mmol_l   numeric(4,2) check (lactate_mmol_l >= 0),
  rpe              numeric(3,1) check (rpe between 1 and 10),
  completed        boolean not null default true,
  unique (result_id, stage_index)
);

-- Abgeleitete Werte (1RM, VO2max, Relativkraft, Sinclair, Watt/kg …).
-- Eigene Tabelle statt JSONB-Spalte, damit Verläufe je Metrik direkt abfragbar
-- sind und die verwendete Formel dokumentiert bleibt.
create table public.result_metrics (
  id          uuid primary key default gen_random_uuid(),
  result_id   uuid not null references public.test_results (id) on delete cascade,
  metric_key  text not null,
  value       numeric not null,
  unit        text,
  formula     text,
  computed_at timestamptz not null default now(),
  unique (result_id, metric_key)
);

create index result_metrics_key_idx on public.result_metrics (metric_key);
