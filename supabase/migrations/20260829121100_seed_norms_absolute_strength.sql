-- =============================================================================
-- Seed: Referenzwerte für die absolute Maxkraft und die Laktatschwelle
--
-- Nachtrag zu 20260829120900. Ohne diese Reihen bliebe im Populationsmodus die
-- Maxkraft-Achse leer, weil sie auf metric_key = 'one_rm_kg' normiert wird und
-- dafür bisher nur Relativkraft-Stützstellen existierten.
--
-- Einschränkung: absolute Kraftwerte hängen stark vom Körpergewicht ab. Diese
-- Reihen sind daher gröber als die Relativkraft-Reihen und ebenfalls als
-- 'baseline_v0_placeholder' markiert. Mittelfristig ist hier ein
-- körpergewichtsnormiertes Verfahren (Wilks/IPF-GL) die bessere Grundlage.
-- =============================================================================

create function public.__seed_norms(
  p_slug text, p_metric text, p_sex public.sex,
  p_age_min integer, p_age_max integer, p_values numeric[], p_scale numeric default 1
)
returns void language plpgsql as $$
declare
  v_test_id uuid;
  v_percentiles integer[] := array[10, 25, 50, 75, 90, 99];
  i integer;
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

select public.__seed_norms('back_squat_1rm', 'one_rm_kg', 'male',   18, 39, array[70,100,130,165,195,240]);
select public.__seed_norms('back_squat_1rm', 'one_rm_kg', 'male',   40, 99, array[70,100,130,165,195,240], 0.90);
select public.__seed_norms('back_squat_1rm', 'one_rm_kg', 'female', 18, 39, array[40,55,75,95,115,145]);
select public.__seed_norms('back_squat_1rm', 'one_rm_kg', 'female', 40, 99, array[40,55,75,95,115,145], 0.90);

select public.__seed_norms('deadlift_1rm', 'one_rm_kg', 'male',   18, 39, array[90,125,160,195,225,275]);
select public.__seed_norms('deadlift_1rm', 'one_rm_kg', 'male',   40, 99, array[90,125,160,195,225,275], 0.90);
select public.__seed_norms('deadlift_1rm', 'one_rm_kg', 'female', 18, 39, array[55,75,100,125,150,185]);
select public.__seed_norms('deadlift_1rm', 'one_rm_kg', 'female', 40, 99, array[55,75,100,125,150,185], 0.90);

select public.__seed_norms('bench_press_1rm', 'one_rm_kg', 'male',   18, 39, array[55,75,95,115,135,165]);
select public.__seed_norms('bench_press_1rm', 'one_rm_kg', 'male',   40, 99, array[55,75,95,115,135,165], 0.90);
select public.__seed_norms('bench_press_1rm', 'one_rm_kg', 'female', 18, 39, array[25,35,47,60,72,92]);
select public.__seed_norms('bench_press_1rm', 'one_rm_kg', 'female', 40, 99, array[25,35,47,60,72,92], 0.90);

select public.__seed_norms('clean_and_jerk_1rm', 'one_rm_kg', 'male',   18, 39, array[55,72,90,110,128,155]);
select public.__seed_norms('clean_and_jerk_1rm', 'one_rm_kg', 'female', 18, 39, array[28,38,50,62,73,90]);
select public.__seed_norms('snatch_1rm',         'one_rm_kg', 'male',   18, 39, array[42,55,70,88,102,125]);
select public.__seed_norms('snatch_1rm',         'one_rm_kg', 'female', 18, 39, array[22,30,40,50,58,72]);

select public.__seed_norms('lactate_ramp', 'power_at_4mmol_w', 'male',   18, 39, array[140,175,210,250,285,340]);
select public.__seed_norms('lactate_ramp', 'power_at_4mmol_w', 'male',   40, 99, array[140,175,210,250,285,340], 0.90);
select public.__seed_norms('lactate_ramp', 'power_at_4mmol_w', 'female', 18, 39, array[95,120,150,180,210,255]);
select public.__seed_norms('lactate_ramp', 'power_at_4mmol_w', 'female', 40, 99, array[95,120,150,180,210,255], 0.90);

drop function public.__seed_norms(text, text, public.sex, integer, integer, numeric[], numeric);
