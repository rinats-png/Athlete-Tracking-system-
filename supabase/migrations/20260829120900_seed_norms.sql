-- =============================================================================
-- Seed: Populations-Referenzwerte (Perzentil-Stützstellen)
--
-- ACHTUNG — Datenqualität: Dieser Satz ist eine *Startbelegung* für Entwicklung
-- und Demo. Die Werte sind an übliche Größenordnungen für trainierte Erwachsene
-- angelehnt, aber nicht aus einer publizierten Normstudie übernommen. Vor dem
-- Produktivstart müssen sie gegen belastbare Referenzen ersetzt werden
-- (z. B. ACSM Guidelines, Cooper Institute FitnessGram, nationale
-- Behörden-Standards). Erkennbar an source = 'baseline_v0_placeholder'.
-- =============================================================================

create function public.__seed_norms(
  p_slug     text,
  p_metric   text,
  p_sex      public.sex,
  p_age_min  integer,
  p_age_max  integer,
  p_values   numeric[],   -- korrespondiert zu den Perzentilen {10,25,50,75,90,99}
  p_scale    numeric default 1
)
returns void
language plpgsql
as $$
declare
  v_test_id     uuid;
  v_percentiles integer[] := array[10, 25, 50, 75, 90, 99];
  i             integer;
begin
  select id into v_test_id from public.test_definitions where slug = p_slug;
  if v_test_id is null then
    raise exception 'Unbekannter Test-Slug: %', p_slug;
  end if;

  for i in 1 .. array_length(v_percentiles, 1) loop
    insert into public.performance_norms (
      test_definition_id, metric_key, sex, age_min, age_max,
      population, percentile, value, source
    )
    values (
      v_test_id, p_metric, p_sex, p_age_min, p_age_max,
      'athletic', v_percentiles[i], round(p_values[i] * p_scale, 3),
      'baseline_v0_placeholder'
    )
    on conflict (test_definition_id, metric_key, sex, age_min, age_max, population, percentile)
    do update set value = excluded.value, source = excluded.source;
  end loop;
end;
$$;

-- Ausdauer: geschätzte VO2max aus dem Cooper-Test (ml/kg/min) -----------------
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'male',   18, 29, array[38,43,48,54,59,66]);
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'male',   30, 39, array[36,41,46,52,57,64]);
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'male',   40, 49, array[34,38,43,49,54,61]);
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'male',   50, 99, array[31,35,40,45,50,57]);
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'female', 18, 29, array[32,36,41,46,51,58]);
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'female', 30, 39, array[30,34,39,44,49,56]);
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'female', 40, 49, array[28,32,37,42,47,54]);
select public.__seed_norms('cooper_12min', 'vo2max_ml_kg_min', 'female', 50, 99, array[26,30,34,39,44,50]);

-- Beep-Test nutzt dieselbe VO2max-Metrik und damit dieselben Stützstellen.
select public.__seed_norms('beep_test_20m', 'vo2max_ml_kg_min', 'male',   18, 39, array[37,42,47,53,58,65]);
select public.__seed_norms('beep_test_20m', 'vo2max_ml_kg_min', 'female', 18, 39, array[31,35,40,45,50,57]);

-- 2000 m Rudern in Sekunden (weniger ist besser) ------------------------------
select public.__seed_norms('row_2000m', 'duration_seconds', 'male',   18, 39, array[480,450,420,395,375,350]);
select public.__seed_norms('row_2000m', 'duration_seconds', 'male',   40, 99, array[480,450,420,395,375,350], 1.07);
select public.__seed_norms('row_2000m', 'duration_seconds', 'female', 18, 39, array[555,520,490,462,440,410]);
select public.__seed_norms('row_2000m', 'duration_seconds', 'female', 40, 99, array[555,520,490,462,440,410], 1.07);

-- Relativkraft: 1RM je kg Körpergewicht ---------------------------------------
select public.__seed_norms('back_squat_1rm',   'relative_strength_bw', 'male',   18, 39, array[1.00,1.30,1.60,2.00,2.30,2.80]);
select public.__seed_norms('back_squat_1rm',   'relative_strength_bw', 'male',   40, 99, array[1.00,1.30,1.60,2.00,2.30,2.80], 0.90);
select public.__seed_norms('back_squat_1rm',   'relative_strength_bw', 'female', 18, 39, array[0.70,0.90,1.20,1.50,1.80,2.20]);
select public.__seed_norms('back_squat_1rm',   'relative_strength_bw', 'female', 40, 99, array[0.70,0.90,1.20,1.50,1.80,2.20], 0.90);

select public.__seed_norms('bench_press_1rm',  'relative_strength_bw', 'male',   18, 39, array[0.70,0.90,1.10,1.35,1.55,1.90]);
select public.__seed_norms('bench_press_1rm',  'relative_strength_bw', 'male',   40, 99, array[0.70,0.90,1.10,1.35,1.55,1.90], 0.90);
select public.__seed_norms('bench_press_1rm',  'relative_strength_bw', 'female', 18, 39, array[0.40,0.55,0.70,0.90,1.05,1.30]);
select public.__seed_norms('bench_press_1rm',  'relative_strength_bw', 'female', 40, 99, array[0.40,0.55,0.70,0.90,1.05,1.30], 0.90);

select public.__seed_norms('deadlift_1rm',     'relative_strength_bw', 'male',   18, 39, array[1.20,1.50,1.90,2.30,2.60,3.10]);
select public.__seed_norms('deadlift_1rm',     'relative_strength_bw', 'male',   40, 99, array[1.20,1.50,1.90,2.30,2.60,3.10], 0.90);
select public.__seed_norms('deadlift_1rm',     'relative_strength_bw', 'female', 18, 39, array[0.90,1.15,1.45,1.80,2.05,2.50]);
select public.__seed_norms('deadlift_1rm',     'relative_strength_bw', 'female', 40, 99, array[0.90,1.15,1.45,1.80,2.05,2.50], 0.90);

select public.__seed_norms('clean_and_jerk_1rm', 'relative_strength_bw', 'male',   18, 39, array[0.60,0.80,1.00,1.25,1.45,1.75]);
select public.__seed_norms('clean_and_jerk_1rm', 'relative_strength_bw', 'female', 18, 39, array[0.40,0.55,0.70,0.90,1.05,1.30]);
select public.__seed_norms('snatch_1rm',         'relative_strength_bw', 'male',   18, 39, array[0.45,0.60,0.78,0.98,1.15,1.40]);
select public.__seed_norms('snatch_1rm',         'relative_strength_bw', 'female', 18, 39, array[0.30,0.42,0.55,0.70,0.82,1.02]);

-- Kraftausdauer ----------------------------------------------------------------
select public.__seed_norms('bear_complex', 'load_kg', 'male',   18, 39, array[40,55,70,85,100,120]);
select public.__seed_norms('bear_complex', 'load_kg', 'female', 18, 39, array[25,32,42,52,62,75]);

select public.__seed_norms('cindy_20min_amrap', 'total_reps', 'male',   18, 39, array[240,300,360,420,480,570]);
select public.__seed_norms('cindy_20min_amrap', 'total_reps', 'female', 18, 39, array[180,240,300,360,420,510]);

select public.__seed_norms('assault_bike_10min_cal', 'calories', 'male',   18, 39, array[100,115,130,150,165,190]);
select public.__seed_norms('assault_bike_10min_cal', 'calories', 'female', 18, 39, array[70,82,95,110,122,140]);

-- Agilität & Schnellkraft --------------------------------------------------------
select public.__seed_norms('illinois_agility', 'duration_seconds', 'male',   18, 39, array[19.5,18.3,17.0,16.0,15.2,14.3]);
select public.__seed_norms('illinois_agility', 'duration_seconds', 'male',   40, 99, array[19.5,18.3,17.0,16.0,15.2,14.3], 1.08);
select public.__seed_norms('illinois_agility', 'duration_seconds', 'female', 18, 39, array[22.0,20.5,19.0,17.9,17.0,16.0]);
select public.__seed_norms('illinois_agility', 'duration_seconds', 'female', 40, 99, array[22.0,20.5,19.0,17.9,17.0,16.0], 1.08);

select public.__seed_norms('standing_broad_jump', 'distance_m', 'male',   18, 39, array[1.80,2.00,2.20,2.40,2.55,2.80]);
select public.__seed_norms('standing_broad_jump', 'distance_m', 'male',   40, 99, array[1.80,2.00,2.20,2.40,2.55,2.80], 0.92);
select public.__seed_norms('standing_broad_jump', 'distance_m', 'female', 18, 39, array[1.40,1.55,1.75,1.90,2.05,2.25]);
select public.__seed_norms('standing_broad_jump', 'distance_m', 'female', 40, 99, array[1.40,1.55,1.75,1.90,2.05,2.25], 0.92);

drop function public.__seed_norms(text, text, public.sex, integer, integer, numeric[], numeric);
