-- =============================================================================
-- Seed: standardisierter Testkatalog (Systemtests, zweisprachig DE/EN)
-- =============================================================================

create function public.__seed_test(
  p_slug              text,
  p_category          public.test_category,
  p_dimension         public.performance_dimension,
  p_direction         public.scoring_direction,
  p_primary_metric    text,
  p_primary_unit      text,
  p_dimension_metrics jsonb,
  p_derived           text[],
  p_supports_stages   boolean,
  p_requires_bw       boolean,
  p_protocol          jsonb,
  p_input_fields      jsonb,
  p_sort              integer,
  p_name_de text, p_short_de text, p_summary_de text, p_instr_de text, p_equip_de text,
  p_name_en text, p_short_en text, p_summary_en text, p_instr_en text, p_equip_en text
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.test_definitions (
    slug, category, dimension, dimension_metrics, scoring_direction,
    primary_metric, primary_unit, input_fields, protocol,
    supports_stages, requires_body_weight, derived_metrics, is_system, sort_order
  )
  values (
    p_slug, p_category, p_dimension, p_dimension_metrics, p_direction,
    p_primary_metric, p_primary_unit, p_input_fields, p_protocol,
    p_supports_stages, p_requires_bw, p_derived, true, p_sort
  )
  on conflict (slug) do update set
    category = excluded.category,
    dimension = excluded.dimension,
    dimension_metrics = excluded.dimension_metrics,
    scoring_direction = excluded.scoring_direction,
    primary_metric = excluded.primary_metric,
    primary_unit = excluded.primary_unit,
    input_fields = excluded.input_fields,
    protocol = excluded.protocol,
    supports_stages = excluded.supports_stages,
    requires_body_weight = excluded.requires_body_weight,
    derived_metrics = excluded.derived_metrics,
    sort_order = excluded.sort_order
  returning id into v_id;

  insert into public.test_definition_translations
    (test_definition_id, locale, name, short_name, summary, protocol_instructions, equipment)
  values
    (v_id, 'de', p_name_de, p_short_de, p_summary_de, p_instr_de, p_equip_de),
    (v_id, 'en', p_name_en, p_short_en, p_summary_en, p_instr_en, p_equip_en)
  on conflict (test_definition_id, locale) do update set
    name = excluded.name,
    short_name = excluded.short_name,
    summary = excluded.summary,
    protocol_instructions = excluded.protocol_instructions,
    equipment = excluded.equipment;

  return v_id;
end;
$$;

-- Wiederkehrende Eingabefelder des geführten Modus.
-- rpe/Puls sind überall optional erfassbar, damit die Belastungssteuerung
-- später auch ohne Wearable funktioniert.
create function public.__hr_rpe_fields()
returns jsonb language sql immutable as $$
  select '[
    {"key":"avg_heart_rate","type":"number","unit":"bpm","required":false,"min":30,"max":240},
    {"key":"max_heart_rate","type":"number","unit":"bpm","required":false,"min":30,"max":240},
    {"key":"rpe","type":"rpe","required":false,"min":1,"max":10}
  ]'::jsonb;
$$;

-- ============================== Ausdauer =====================================

select public.__seed_test(
  'cooper_12min', 'endurance', 'endurance', 'higher_is_better',
  'distance_m', 'm',
  '{"endurance":"vo2max_ml_kg_min"}'::jsonb,
  array['vo2max_ml_kg_min'], false, false,
  '{"mode":"countdown","duration_seconds":720}'::jsonb,
  '[{"key":"distance_m","type":"number","unit":"m","required":true,"min":500,"max":6000,"step":10}]'::jsonb
    || public.__hr_rpe_fields(),
  10,
  'Cooper-Test (12 Minuten)', 'Cooper',
  'Maximal zurückgelegte Distanz in 12 Minuten. Robuster Feldtest zur Schätzung der VO2max.',
  'Nach lockerem Einlaufen 12 Minuten in gleichmässig maximalem Tempo laufen. Distanz auf 10 m genau erfassen.',
  'Laufbahn oder vermessene Strecke, Stoppuhr',
  'Cooper Test (12 minutes)', 'Cooper',
  'Maximum distance covered in 12 minutes. A robust field test for estimating VO2max.',
  'After a light warm-up, run for 12 minutes at an evenly paced maximum effort. Record distance to the nearest 10 m.',
  'Running track or measured course, stopwatch'
);

select public.__seed_test(
  'beep_test_20m', 'endurance', 'endurance', 'higher_is_better',
  'score', 'shuttles',
  '{"endurance":"vo2max_ml_kg_min"}'::jsonb,
  array['vo2max_ml_kg_min','beep_level'], true, false,
  '{"mode":"stages","audio_protocol":"20m_msft","stage_label":"level"}'::jsonb,
  '[
    {"key":"extra.level","type":"number","unit":"level","required":true,"min":1,"max":21},
    {"key":"extra.shuttle","type":"number","unit":"shuttle","required":true,"min":1,"max":16}
  ]'::jsonb || public.__hr_rpe_fields(),
  20,
  '20 m Shuttle Run (Beep-Test)', 'Beep-Test',
  'Stufentest über 20 m bis zur Ausbelastung. Ergebnis ist die erreichte Stufe inklusive Shuttle.',
  'Bei jedem Signalton die 20-m-Linie erreichen. Test endet, wenn die Linie zweimal in Folge verfehlt wird.',
  '20 m markierte Strecke, Audio-Protokoll',
  '20 m Shuttle Run (Beep Test)', 'Beep Test',
  'Incremental 20 m shuttle test to exhaustion. The result is the level and shuttle reached.',
  'Reach the 20 m line on every beep. The test ends after missing the line twice in a row.',
  '20 m marked course, audio protocol'
);

select public.__seed_test(
  'lactate_ramp', 'endurance', 'endurance', 'higher_is_better',
  'score', 'W',
  '{"endurance":"power_at_4mmol_w"}'::jsonb,
  array['power_at_4mmol_w','watts_per_kg_at_4mmol','hr_at_4mmol','aerobic_threshold_w'], true, true,
  '{"mode":"stages","stage_duration_seconds":180,"increment":{"power_watts":25},"rest_between_stages_seconds":30,"ergometer":"assault_bike"}'::jsonb,
  '[
    {"key":"stages","type":"stage_table","required":true,
     "columns":["power_watts","speed_kmh","heart_rate","lactate_mmol_l","rpe"]}
  ]'::jsonb || public.__hr_rpe_fields(),
  30,
  'Laktat-Stufentest', 'Laktat-Ramp',
  'Stufenprotokoll mit Laktatmessung je Stufe. Liefert die aerobe und anaerobe Schwelle sowie die Trainingszonen.',
  'Stufen à 3 Minuten, Steigerung um 25 W bzw. 1 km/h. Nach jeder Stufe Laktat, Herzfrequenz und RPE erfassen.',
  'Laufband oder Ergometer, Laktatmessgerät, Pulsgurt',
  'Lactate Ramp Test', 'Lactate Ramp',
  'Incremental protocol with lactate sampling per stage. Yields aerobic and anaerobic thresholds and training zones.',
  '3-minute stages, increasing by 25 W or 1 km/h. Record lactate, heart rate and RPE after each stage.',
  'Treadmill or ergometer, lactate analyser, heart rate strap'
);

select public.__seed_test(
  'row_2000m', 'endurance', 'endurance', 'lower_is_better',
  'duration_seconds', 's',
  '{"endurance":"duration_seconds"}'::jsonb,
  array['avg_pace_s_per_500m','avg_power_w','watts_per_kg'], false, true,
  '{"mode":"stopwatch","target_distance_m":2000,"ergometer":"rower"}'::jsonb,
  '[{"key":"duration_seconds","type":"duration","required":true,"min":300,"max":900}]'::jsonb
    || public.__hr_rpe_fields(),
  40,
  '2000 m Rudern', '2k Row',
  'Klassischer Ruderergometer-Test über 2000 m. Misst die anaerobe Kapazität und die Ausdauerleistung.',
  'Damper 4–6, nach Einrudern 2000 m auf Zeit. Durchschnittspace und Split alle 500 m notieren.',
  'Ruderergometer (Concept2 o. ä.)',
  '2000 m Row', '2k Row',
  'The classic 2000 m rowing ergometer test. Measures anaerobic capacity and endurance performance.',
  'Damper 4–6, row 2000 m for time after warm-up. Record average pace and 500 m splits.',
  'Rowing ergometer (Concept2 or similar)'
);

-- ============================== Maxkraft =====================================
-- Alle Maxkraft-Tests zahlen auf zwei Achsen ein: absolute Maxkraft und
-- Relativkraft (1RM / Körpergewicht).

select public.__seed_test(
  'back_squat_1rm', 'max_strength', 'max_strength', 'higher_is_better',
  'one_rm_kg', 'kg',
  '{"max_strength":"one_rm_kg","relative_strength":"relative_strength_bw"}'::jsonb,
  array['one_rm_kg','relative_strength_bw'], false, true,
  '{"mode":"attempts","max_attempts":5,"rest_seconds":180}'::jsonb,
  '[
    {"key":"load_kg","type":"number","unit":"kg","required":true,"min":20,"max":400,"step":2.5},
    {"key":"reps","type":"number","unit":"reps","required":true,"min":1,"max":10}
  ]'::jsonb || public.__hr_rpe_fields(),
  110,
  'Kniebeuge (Back Squat) 1RM', 'Squat',
  'Maximalkraft in der tiefen Kniebeuge. Bei mehr als einer Wiederholung wird das 1RM geschätzt.',
  'Nach Aufwärmsätzen in 2–5 Versuchen an das Maximum herantasten. Tiefe: Hüftgelenk unter Kniegelenk.',
  'Langhantel, Rack, Scheiben',
  'Back Squat 1RM', 'Squat',
  'Maximal strength in the back squat. With more than one repetition the 1RM is estimated.',
  'After warm-up sets, work up to a maximum in 2–5 attempts. Depth: hip crease below the knee.',
  'Barbell, rack, plates'
);

select public.__seed_test(
  'deadlift_1rm', 'max_strength', 'max_strength', 'higher_is_better',
  'one_rm_kg', 'kg',
  '{"max_strength":"one_rm_kg","relative_strength":"relative_strength_bw"}'::jsonb,
  array['one_rm_kg','relative_strength_bw'], false, true,
  '{"mode":"attempts","max_attempts":5,"rest_seconds":180}'::jsonb,
  '[
    {"key":"load_kg","type":"number","unit":"kg","required":true,"min":20,"max":450,"step":2.5},
    {"key":"reps","type":"number","unit":"reps","required":true,"min":1,"max":10}
  ]'::jsonb || public.__hr_rpe_fields(),
  120,
  'Kreuzheben (Deadlift) 1RM', 'Deadlift',
  'Maximalkraft im konventionellen Kreuzheben.',
  'Hantel vom Boden bis zum vollständigen Hüftstreck. Kein Absetzen aus der Bewegung, kein Hitching.',
  'Langhantel, Scheiben, Plattform',
  'Deadlift 1RM', 'Deadlift',
  'Maximal strength in the conventional deadlift.',
  'Lift from the floor to full hip extension. No hitching, no bouncing off the floor.',
  'Barbell, plates, platform'
);

select public.__seed_test(
  'bench_press_1rm', 'max_strength', 'max_strength', 'higher_is_better',
  'one_rm_kg', 'kg',
  '{"max_strength":"one_rm_kg","relative_strength":"relative_strength_bw"}'::jsonb,
  array['one_rm_kg','relative_strength_bw'], false, true,
  '{"mode":"attempts","max_attempts":5,"rest_seconds":180}'::jsonb,
  '[
    {"key":"load_kg","type":"number","unit":"kg","required":true,"min":20,"max":300,"step":2.5},
    {"key":"reps","type":"number","unit":"reps","required":true,"min":1,"max":10}
  ]'::jsonb || public.__hr_rpe_fields(),
  130,
  'Bankdrücken (Bench Press) 1RM', 'Bench',
  'Maximalkraft im Flachbankdrücken.',
  'Hantel kontrolliert zur Brust, kurzer Kontakt, dann vollständige Ellbogenstreckung. Gesäss bleibt auf der Bank.',
  'Flachbank, Langhantel, Ablagen, Spotter',
  'Bench Press 1RM', 'Bench',
  'Maximal strength in the flat bench press.',
  'Lower under control to the chest, brief contact, then full elbow lockout. Glutes stay on the bench.',
  'Flat bench, barbell, safeties, spotter'
);

select public.__seed_test(
  'clean_and_jerk_1rm', 'max_strength', 'max_strength', 'higher_is_better',
  'one_rm_kg', 'kg',
  '{"max_strength":"one_rm_kg","relative_strength":"relative_strength_bw","power":"relative_strength_bw"}'::jsonb,
  array['one_rm_kg','relative_strength_bw','sinclair_points'], false, true,
  '{"mode":"attempts","max_attempts":6,"rest_seconds":180}'::jsonb,
  '[
    {"key":"load_kg","type":"number","unit":"kg","required":true,"min":20,"max":260,"step":1},
    {"key":"reps","type":"number","unit":"reps","required":true,"min":1,"max":3}
  ]'::jsonb || public.__hr_rpe_fields(),
  140,
  'Umsetzen und Stossen (Clean & Jerk)', 'C&J',
  'Olympische Disziplin. Zahlt auf Maxkraft, Relativkraft und Schnellkraft ein; zusätzlich wird der Sinclair-Wert berechnet.',
  'Aufwärmsätze, dann Steigerungsversuche bis zum Maximum. Nur gültige Versuche mit stabiler Endposition zählen.',
  'Olympische Langhantel, Hantelscheiben mit Bumper, Plattform',
  'Clean & Jerk 1RM', 'C&J',
  'Olympic lift. Feeds max strength, relative strength and power; the Sinclair score is also computed.',
  'Warm-up sets, then increasing attempts to a maximum. Only valid lifts with a stable finish position count.',
  'Olympic barbell, bumper plates, platform'
);

select public.__seed_test(
  'snatch_1rm', 'max_strength', 'max_strength', 'higher_is_better',
  'one_rm_kg', 'kg',
  '{"max_strength":"one_rm_kg","relative_strength":"relative_strength_bw","power":"relative_strength_bw"}'::jsonb,
  array['one_rm_kg','relative_strength_bw','sinclair_points'], false, true,
  '{"mode":"attempts","max_attempts":6,"rest_seconds":180}'::jsonb,
  '[
    {"key":"load_kg","type":"number","unit":"kg","required":true,"min":20,"max":200,"step":1},
    {"key":"reps","type":"number","unit":"reps","required":true,"min":1,"max":3}
  ]'::jsonb || public.__hr_rpe_fields(),
  150,
  'Reissen (Snatch)', 'Snatch',
  'Olympische Disziplin. Technisch anspruchsvollster Schnellkraft-Indikator.',
  'Aufwärmsätze, dann Steigerungsversuche bis zum Maximum. Hantel in einer Bewegung über Kopf.',
  'Olympische Langhantel, Hantelscheiben mit Bumper, Plattform',
  'Snatch 1RM', 'Snatch',
  'Olympic lift. The most technically demanding indicator of explosive strength.',
  'Warm-up sets, then increasing attempts to a maximum. Bar overhead in one movement.',
  'Olympic barbell, bumper plates, platform'
);

-- ========================= Kraftausdauer / MetCon ============================

select public.__seed_test(
  'bear_complex', 'strength_endurance', 'strength_endurance', 'higher_is_better',
  'load_kg', 'kg',
  '{"strength_endurance":"load_kg","relative_strength":"relative_strength_bw"}'::jsonb,
  array['relative_strength_bw'], false, true,
  '{"mode":"attempts","max_attempts":5,"rounds":5,"reps_per_round":7,"rest_seconds":120}'::jsonb,
  '[{"key":"load_kg","type":"number","unit":"kg","required":true,"min":20,"max":150,"step":2.5}]'::jsonb
    || public.__hr_rpe_fields(),
  210,
  'Bear Complex (Maximallast)', 'Bear',
  '5 Runden à 7 unterbrechungsfreie Wiederholungen des Komplexes. Gewertet wird die schwerste vollständige Runde.',
  'Power Clean, Front Squat, Push Press, Back Squat, Push Press — ohne Absetzen. Fünf Durchgänge mit steigender Last.',
  'Langhantel, Scheiben',
  'Bear Complex (Max Load)', 'Bear',
  '5 rounds of 7 unbroken repetitions of the complex. The heaviest completed round counts.',
  'Power clean, front squat, push press, back squat, push press — without setting the bar down. Five ascending rounds.',
  'Barbell, plates'
);

select public.__seed_test(
  'cindy_20min_amrap', 'strength_endurance', 'strength_endurance', 'higher_is_better',
  'score', 'rounds',
  '{"strength_endurance":"total_reps"}'::jsonb,
  array['total_reps','reps_per_minute'], false, false,
  '{"mode":"amrap","duration_seconds":1200,
    "round":[{"movement":"pull_up","reps":5},{"movement":"push_up","reps":10},{"movement":"air_squat","reps":15}]}'::jsonb,
  '[
    {"key":"rounds","type":"number","unit":"rounds","required":true,"min":0,"max":40},
    {"key":"extra.partial_reps","type":"number","unit":"reps","required":false,"min":0,"max":29}
  ]'::jsonb || public.__hr_rpe_fields(),
  220,
  'Cindy (20 Min AMRAP)', 'Cindy',
  '20 Minuten so viele Runden wie möglich: 5 Klimmzüge, 10 Liegestütze, 15 Kniebeugen.',
  'Durchgehend arbeiten, Pausen frei wählbar. Am Ende volle Runden plus angefangene Wiederholungen notieren.',
  'Klimmzugstange, Zeitmesser',
  'Cindy (20 min AMRAP)', 'Cindy',
  'As many rounds as possible in 20 minutes: 5 pull-ups, 10 push-ups, 15 air squats.',
  'Work continuously, rest as needed. Record full rounds plus partial repetitions at the buzzer.',
  'Pull-up bar, timer'
);

select public.__seed_test(
  'assault_bike_10min_cal', 'strength_endurance', 'strength_endurance', 'higher_is_better',
  'calories', 'kcal',
  '{"strength_endurance":"calories","endurance":"calories"}'::jsonb,
  array['calories_per_minute'], false, false,
  '{"mode":"countdown","duration_seconds":600,"ergometer":"assault_bike"}'::jsonb,
  '[{"key":"calories","type":"number","unit":"kcal","required":true,"min":20,"max":400}]'::jsonb
    || public.__hr_rpe_fields(),
  230,
  'Assault Bike — 10 Minuten max. Kalorien', 'Bike 10 Min',
  'Maximale Kalorienzahl in 10 Minuten. Misst die Fähigkeit, hohe Leistung über Zeit zu halten.',
  'Aus dem Stand starten, 10 Minuten maximal gleichmässig arbeiten. Kalorienstand des Monitors erfassen.',
  'Assault Bike / Air Bike',
  'Assault Bike — 10 min max calories', 'Bike 10 min',
  'Maximum calories in 10 minutes. Measures the ability to sustain high power output over time.',
  'Start from a standstill and work at an evenly paced maximum for 10 minutes. Record the monitor calorie count.',
  'Assault bike / air bike'
);

-- ======================= Agilität & Schnellkraft ==============================

select public.__seed_test(
  'illinois_agility', 'agility', 'agility', 'lower_is_better',
  'duration_seconds', 's',
  '{"agility":"duration_seconds"}'::jsonb,
  array[]::text[], false, false,
  '{"mode":"stopwatch","best_of":2,"rest_seconds":180}'::jsonb,
  '[{"key":"duration_seconds","type":"duration","required":true,"min":10,"max":40,"step":0.01}]'::jsonb
    || public.__hr_rpe_fields(),
  310,
  'Illinois Agility Test', 'Illinois',
  'Standardisierter Wendigkeitsparcours über 10 x 5 m mit Slalom. Gewertet wird die schnellere von zwei Läufen.',
  'Start in Bauchlage. Parcours nach Vorgabe durchlaufen, Zeit auf Hundertstel erfassen. Zwei Versuche mit voller Pause.',
  '8 Markierungshütchen, Stoppuhr oder Lichtschranke',
  'Illinois Agility Test', 'Illinois',
  'Standardised agility course of 10 x 5 m including a slalom section. The faster of two runs counts.',
  'Start lying prone. Run the course as specified, timed to hundredths. Two attempts with full recovery.',
  '8 cones, stopwatch or timing gates'
);

select public.__seed_test(
  'standing_broad_jump', 'power', 'power', 'higher_is_better',
  'distance_m', 'm',
  '{"power":"distance_m"}'::jsonb,
  array['jump_index_bw'], false, true,
  '{"mode":"attempts","max_attempts":3,"best_of":3}'::jsonb,
  '[{"key":"distance_m","type":"number","unit":"m","required":true,"min":0.5,"max":4,"step":0.01}]'::jsonb
    || public.__hr_rpe_fields(),
  320,
  'Standweitsprung', 'Standweitsprung',
  'Horizontale Schnellkraft aus dem Stand. Gemessen wird vom Absprungbalken zur hintersten Landespur.',
  'Beidbeiniger Absprung ohne Anlauf, beidbeinige Landung ohne Rückfallen. Drei Versuche, der beste zählt.',
  'Massband, rutschfeste Absprungmarkierung',
  'Standing Broad Jump', 'Broad Jump',
  'Horizontal explosive power from a standing start. Measured from the take-off line to the nearest landing mark.',
  'Two-footed take-off without a run-up, two-footed landing without falling back. Three attempts, best counts.',
  'Tape measure, non-slip take-off marking'
);

drop function public.__seed_test(
  text, public.test_category, public.performance_dimension, public.scoring_direction,
  text, text, jsonb, text[], boolean, boolean, jsonb, jsonb, integer,
  text, text, text, text, text, text, text, text, text, text
);
drop function public.__hr_rpe_fields();
