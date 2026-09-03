-- =============================================================================
-- Platzhalter-Referenzwerte entfernen
--
-- Die Zeilen mit source = 'baseline_v0_placeholder' stammen aus keiner
-- publizierten Normstudie. Sie waren als Startbelegung für Entwicklung und
-- Demo gedacht, haben aber im laufenden Betrieb Perzentile erzeugt, die wie
-- eine Aussage über einen Menschen aussehen, ohne eine zu sein. Sie fallen
-- deshalb ersatzlos weg: eine Achse ohne belegte Referenz bleibt leer.
--
-- Ab jetzt trägt jede Zeile eine benannte Quelle. Der Check erzwingt das,
-- damit sich eine Startbelegung nicht wieder einschleicht.
-- =============================================================================

delete from public.performance_norms
where source is null
   or source = 'baseline_v0_placeholder';

alter table public.performance_norms
  add constraint performance_norms_source_named
  check (source is not null and length(btrim(source)) >= 10);

comment on column public.performance_norms.source is
  'Benannte Quelle der Zeile: Studie, Jahr, Erhebung. Ohne Quelle keine Zeile.';

-- Die Seed-Funktion aus 20260829120900 kann keine unbelegten Zeilen mehr
-- schreiben; sie wird nicht mehr gebraucht.
drop function if exists public.__seed_norms(text, text, public.sex, integer, integer, numeric[], numeric);
