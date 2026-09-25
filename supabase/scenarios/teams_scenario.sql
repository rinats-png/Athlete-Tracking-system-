\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','owner@x.de'),
 ('00000000-0000-0000-0000-00000000000b','member@x.de'),
 ('00000000-0000-0000-0000-00000000000c','outsider@x.de'),
 ('00000000-0000-0000-0000-00000000000d','other@x.de');
insert into accounts (id, display_name) values ('00000000-0000-0000-0000-00000000000a','Owner'),('00000000-0000-0000-0000-00000000000b','Member');
insert into entitlements (user_id, product, status, stripe_subscription_id, billing_interval, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-00000000000a','coach_team','active','sub_1','yearly', now() - interval '30 days', now() + interval '335 days');
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Inhaber legt Team an und lädt ein
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select public.create_team('Halle Nord') is not null as team_created;
select public.create_team_invite(null) as token \gset
do $$ begin perform public.create_team_invite(null); raise exception 'FEHLER: zweite Einladung trotz vollem Team'; exception when others then if sqlerrm not like '%seats_full%' then raise; end if; end $$;
select 'second invite refused (seats_full)' as ok;
reset role;

-- Aussenstehender mit falschem Code
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
do $$ begin perform public.accept_team_invite('falsch'); raise exception 'FEHLER: falscher Code angenommen'; exception when others then if sqlerrm not like '%invite_invalid%' then raise; end if; end $$;
select 'wrong code refused' as ok;
reset role;

-- Mitglied tritt bei
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select public.accept_team_invite(:'token') ->> 'name' as joined_team;
select public.my_pool_owner() = '00000000-0000-0000-0000-00000000000a' as member_pool_is_owner;
select public.has_coach_plan('00000000-0000-0000-0000-00000000000b') as member_has_plan;
-- Mitglied schreibt 31 gemessene Athleten in den Teambestand
insert into athlete_documents (owner_id, athlete_id, schema_version, document)
select '00000000-0000-0000-0000-00000000000a', 'a' || g, 1, jsonb_build_object('results', jsonb_build_array(jsonb_build_object('performedAt', (now() - interval '2 days')::text)))
from generate_series(1, 31) g;
-- einer ohne Messung, einer mit alter Messung, einer mit kaputtem Datum: zählen nicht
insert into athlete_documents (owner_id, athlete_id, schema_version, document) values
 ('00000000-0000-0000-0000-00000000000a','leer',1,'{"results":[]}'),
 ('00000000-0000-0000-0000-00000000000a','alt',1, jsonb_build_object('results', jsonb_build_array(jsonb_build_object('performedAt', (now() - interval '400 days')::text)))),
 ('00000000-0000-0000-0000-00000000000a','kaputt',1,'{"results":[{"performedAt":"2026-13-45"}]}');
select count(*) as member_sees_docs from athlete_documents;
delete from athlete_documents where owner_id = '00000000-0000-0000-0000-00000000000a';
select count(*) as after_member_delete_still from athlete_documents;
select (public.my_coach_status() ->> 'measured')::int as measured, (public.my_coach_status() ->> 'over_limit_since') is not null as over_limit, public.my_coach_status() -> 'team' ->> 'role' as role;
reset role;

-- Aussenstehender sieht nichts und schreibt nichts
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
select count(*) as outsider_sees from athlete_documents;
do $$ begin insert into athlete_documents (owner_id, athlete_id, schema_version, document) values ('00000000-0000-0000-0000-00000000000a','x',1,'{}'); raise exception 'FEHLER: Fremder schreibt in Teambestand'; exception when insufficient_privilege then null; end $$;
select 'outsider insert refused' as ok;
select count(*) as outsider_sees_members from team_members;
do $$ begin perform public.remove_team_member('00000000-0000-0000-0000-00000000000b'); raise exception 'FEHLER'; exception when others then if sqlerrm not like '%not_team_owner%' then raise; end if; end $$;
select 'outsider cannot remove' as ok;
reset role;

-- Frist bleibt beim zweiten Aufruf stehen
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select over_limit_since as t1 from coach_usage \gset
select pg_sleep(0.05);
select public.my_coach_status() is not null;
select over_limit_since = :'t1'::timestamptz as grace_start_stable from coach_usage;
select (public.my_coach_status() -> 'team' -> 'members') @> '[{"role":"coach"}]' as owner_sees_member;
select count(*) as owner_sees_invites from team_invites;
reset role;

-- Inhaber fällt auf Start: Mitglied verliert den Zugriff
update entitlements set product = 'coach_start' where user_id = '00000000-0000-0000-0000-00000000000a';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select count(*) as member_sees_after_downgrade, public.my_pool_owner() = '00000000-0000-0000-0000-00000000000b' as own_pool_again from athlete_documents;
reset role;
update entitlements set product = 'coach_team' where user_id = '00000000-0000-0000-0000-00000000000a';

