-- =============================================================================
-- Referenzwerte und Scoring: aus Rohdaten wird ein 0–100-Wert pro Radar-Achse
-- =============================================================================

-- Populations-Referenzwerte als Perzentil-Stützstellen. Zwischen den Stützstellen
-- wird linear interpoliert, ausserhalb wird auf die Randstützstelle geklemmt.
create table public.performance_norms (
  id                 uuid primary key default gen_random_uuid(),
  test_definition_id uuid not null references public.test_definitions (id) on delete cascade,
  metric_key         text not null,
  sex                public.sex not null,
  age_min            integer not null default 0,
  age_max            integer not null default 120,
  -- 'general' = Normalbevölkerung, 'athletic' = trainierte Athleten,
  -- 'tactical' = Behörden-/Militär-Standards.
  population         text not null default 'athletic',
  percentile         integer not null check (percentile between 0 and 100),
  value              numeric not null,
  source             text,
  created_at         timestamptz not null default now(),
  unique (test_definition_id, metric_key, sex, age_min, age_max, population, percentile)
);

create index performance_norms_lookup_idx
  on public.performance_norms (test_definition_id, metric_key, sex, population);

-- -----------------------------------------------------------------------------
-- Perzentil eines Messwerts gegen die Referenztabelle.
-- Richtungsunabhängig: die Stützstellen tragen die Richtung bereits in sich
-- (bei Zeit-Tests fällt das Perzentil mit steigendem Wert).
-- -----------------------------------------------------------------------------
create or replace function public.norm_percentile(
  p_test_definition_id uuid,
  p_metric_key         text,
  p_sex                public.sex,
  p_age                integer,
  p_value              numeric,
  p_population         text default 'athletic'
)
returns numeric
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_lower_value      numeric;
  v_lower_percentile numeric;
  v_upper_value      numeric;
  v_upper_percentile numeric;
begin
  if p_value is null or p_sex is null or p_sex = 'other' then
    return null;
  end if;

  select value, percentile into v_lower_value, v_lower_percentile
  from public.performance_norms
  where test_definition_id = p_test_definition_id
    and metric_key = p_metric_key
    and sex = p_sex
    and population = p_population
    and coalesce(p_age, 30) between age_min and age_max
    and value <= p_value
  order by value desc
  limit 1;

  select value, percentile into v_upper_value, v_upper_percentile
  from public.performance_norms
  where test_definition_id = p_test_definition_id
    and metric_key = p_metric_key
    and sex = p_sex
    and population = p_population
    and coalesce(p_age, 30) between age_min and age_max
    and value >= p_value
  order by value asc
  limit 1;

  -- Keine Stützstellen hinterlegt -> kein Populationsvergleich möglich.
  if v_lower_value is null and v_upper_value is null then
    return null;
  end if;

  -- Ausserhalb des Referenzbereichs: auf die Randstützstelle klemmen.
  if v_lower_value is null then
    return v_upper_percentile;
  end if;
  if v_upper_value is null then
    return v_lower_percentile;
  end if;
  if v_upper_value = v_lower_value then
    return greatest(v_lower_percentile, v_upper_percentile);
  end if;

  return v_lower_percentile
       + (v_upper_percentile - v_lower_percentile)
       * ((p_value - v_lower_value) / (v_upper_value - v_lower_value));
end;
$$;

-- -----------------------------------------------------------------------------
-- Ein Messwert je Test, Dimension und Zeitpunkt — die Basis für Radar und Trend.
-- Löst dimension_metrics auf und holt den passenden Wert aus test_results.score
-- oder result_metrics.
-- -----------------------------------------------------------------------------
create or replace view public.dimension_measurements
with (security_invoker = true)
as
select
  r.id                                        as result_id,
  r.athlete_id,
  r.test_definition_id,
  r.assessment_id,
  r.performed_at,
  r.sex,
  r.age_years,
  d.category,
  d.scoring_direction,
  dm.key::public.performance_dimension        as dimension,
  dm.value #>> '{}'                           as metric_key,
  case
    when dm.value #>> '{}' = 'score' then r.score
    else m.value
  end                                         as value,
  case
    when dm.value #>> '{}' = 'score' then r.score_unit
    else m.unit
  end                                         as unit
from public.test_results r
join public.test_definitions d on d.id = r.test_definition_id
cross join lateral jsonb_each(
  case
    when d.dimension_metrics = '{}'::jsonb
      then jsonb_build_object(d.dimension::text, 'score')
    else d.dimension_metrics
  end
) as dm(key, value)
left join public.result_metrics m
  on m.result_id = r.id and m.metric_key = dm.value #>> '{}'
where r.status = 'completed';

-- -----------------------------------------------------------------------------
-- Radar-Profil: sechs Achsen, 0–100, in zwei Normierungsmodi.
--   'personal_best' — aktueller Wert gegen die eigene Bestleistung (100 = PB).
--   'population'    — Perzentil gegen die Referenztabelle.
-- Achsen ohne Datengrundlage kommen mit has_data = false zurück, damit die UI
-- "noch nicht getestet" anzeigen kann statt eine Null zu zeichnen.
-- -----------------------------------------------------------------------------
create or replace function public.athlete_radar_profile(
  p_athlete_id uuid,
  p_mode       public.score_mode default 'personal_best',
  p_as_of      timestamptz default now(),
  p_window     interval default interval '18 months',
  p_population text default 'athletic'
)
returns table (
  dimension           public.performance_dimension,
  score               numeric,
  test_count          integer,
  latest_performed_at timestamptz,
  has_data            boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with measurements as (
    select * from public.dimension_measurements
    where athlete_id = p_athlete_id
      and value is not null
      and performed_at <= p_as_of
  ),
  -- Bestleistung je Test/Dimension über die gesamte Historie bis zum Stichtag.
  personal_best as (
    select
      test_definition_id,
      dimension,
      metric_key,
      max(value) filter (where scoring_direction = 'higher_is_better') as best_high,
      min(value) filter (where scoring_direction = 'lower_is_better')  as best_low
    from measurements
    group by test_definition_id, dimension, metric_key
  ),
  -- Aktuellster Wert je Test/Dimension innerhalb des Betrachtungsfensters.
  latest as (
    select distinct on (test_definition_id, dimension)
      test_definition_id, dimension, metric_key, value, performed_at,
      scoring_direction, sex, age_years
    from measurements
    where performed_at >= p_as_of - p_window
    order by test_definition_id, dimension, performed_at desc
  ),
  scored as (
    select
      l.dimension,
      l.performed_at,
      case
        when p_mode = 'population' then
          public.norm_percentile(
            l.test_definition_id, l.metric_key, l.sex, l.age_years, l.value, p_population
          )
        when l.scoring_direction = 'higher_is_better' and coalesce(b.best_high, 0) > 0 then
          least(100, round(l.value / b.best_high * 100, 1))
        when l.scoring_direction = 'lower_is_better' and coalesce(b.best_low, 0) > 0 and l.value > 0 then
          least(100, round(b.best_low / l.value * 100, 1))
        else null
      end as score
    from latest l
    left join personal_best b
      on b.test_definition_id = l.test_definition_id
     and b.dimension = l.dimension
     and b.metric_key = l.metric_key
  ),
  aggregated as (
    select
      dimension,
      round(avg(score), 1)   as score,
      count(*)::int          as test_count,
      max(performed_at)      as latest_performed_at
    from scored
    where score is not null
    group by dimension
  )
  select
    axis.dimension,
    a.score,
    coalesce(a.test_count, 0) as test_count,
    a.latest_performed_at,
    a.score is not null       as has_data
  from unnest(enum_range(null::public.performance_dimension)) as axis(dimension)
  left join aggregated a on a.dimension = axis.dimension
  order by axis.dimension;
$$;

-- -----------------------------------------------------------------------------
-- Delta zwischen zwei Zeitpunkten je Achse — Grundlage für die Fortschritts-
-- angaben in % im Trainer-Report.
-- -----------------------------------------------------------------------------
create or replace function public.athlete_radar_delta(
  p_athlete_id uuid,
  p_baseline   timestamptz,
  p_current    timestamptz default now(),
  p_mode       public.score_mode default 'personal_best',
  p_population text default 'athletic'
)
returns table (
  dimension       public.performance_dimension,
  baseline_score  numeric,
  current_score   numeric,
  delta_points    numeric,
  delta_percent   numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    c.dimension,
    b.score as baseline_score,
    c.score as current_score,
    round(c.score - b.score, 1) as delta_points,
    case
      when b.score is null or b.score = 0 then null
      else round((c.score - b.score) / b.score * 100, 1)
    end as delta_percent
  from public.athlete_radar_profile(p_athlete_id, p_mode, p_current, interval '18 months', p_population) c
  left join public.athlete_radar_profile(p_athlete_id, p_mode, p_baseline, interval '18 months', p_population) b
    on b.dimension = c.dimension;
$$;
