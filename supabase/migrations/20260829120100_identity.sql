-- =============================================================================
-- Identität: Profile, Athleten (mit und ohne Account), Trainer-Zuordnung
-- =============================================================================

-- Ein Profil pro eingeloggtem Nutzer. Rollen sind additiv: jeder Nutzer ist
-- Athlet, `is_coach` schaltet zusätzlich den Trainer-Hub frei. Damit kann ein
-- Trainer sich selbst testen, ohne zweiten Account.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  avatar_url    text,
  locale        public.app_locale       not null default 'de',
  unit_system   public.unit_system      not null default 'metric',
  theme         public.theme_preference not null default 'system',
  is_coach      boolean                 not null default false,
  created_at    timestamptz             not null default now(),
  updated_at    timestamptz             not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Athleten-Stammsatz. Zwei Ausprägungen:
--   1. Self-Serve (B2C): user_id gesetzt, der Athlet verwaltet sich selbst.
--   2. Trainer-Klient (B2B): user_id NULL, vom Trainer angelegt und gepflegt.
-- Ein Klient kann seinen Datensatz später per Einladung übernehmen — dann wird
-- user_id nachgetragen, die Historie bleibt erhalten.
create table public.athletes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users (id) on delete set null,
  created_by     uuid references auth.users (id) on delete set null,
  first_name     text not null,
  last_name      text,
  sex            public.sex,
  birth_date     date,
  contact_email  text,
  notes          text,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index athletes_user_id_idx on public.athletes (user_id);
create index athletes_created_by_idx on public.athletes (created_by);

create trigger athletes_set_updated_at
  before update on public.athletes
  for each row execute function public.set_updated_at();

-- Zugriffsbrücke Trainer -> Athlet. Auch für selbst angelegte Klienten, damit es
-- exakt eine Quelle der Wahrheit für Berechtigungen gibt.
create table public.coach_athlete_links (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  athlete_id  uuid not null references public.athletes (id) on delete cascade,
  status      public.link_status not null default 'active',
  can_edit    boolean not null default true,
  invited_at  timestamptz,
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (coach_id, athlete_id)
);

create index coach_athlete_links_coach_idx on public.coach_athlete_links (coach_id, status);
create index coach_athlete_links_athlete_idx on public.coach_athlete_links (athlete_id, status);

-- Einladung, mit der ein Klient seinen vom Trainer gepflegten Datensatz
-- übernimmt. Es wird nur der Hash des Tokens gespeichert.
create table public.athlete_invitations (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes (id) on delete cascade,
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Biometrie-Historie. Körpergewicht ist kein Profilfeld, sondern eine Zeitreihe —
-- Relativkraft und Sinclair brauchen das Gewicht zum Testzeitpunkt, nicht heute.
create table public.biometric_entries (
  id                uuid primary key default gen_random_uuid(),
  athlete_id        uuid not null references public.athletes (id) on delete cascade,
  measured_on       date not null default current_date,
  body_weight_kg    numeric(6,2) check (body_weight_kg > 20 and body_weight_kg < 400),
  height_cm         numeric(5,1) check (height_cm > 80 and height_cm < 260),
  body_fat_percent  numeric(4,1) check (body_fat_percent >= 0 and body_fat_percent < 70),
  resting_hr        integer check (resting_hr between 20 and 120),
  max_hr            integer check (max_hr between 100 and 240),
  source            public.data_source not null default 'manual',
  notes             text,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (athlete_id, measured_on)
);

create index biometric_entries_athlete_idx
  on public.biometric_entries (athlete_id, measured_on desc);

-- -----------------------------------------------------------------------------
-- Registrierung: Profil + eigener Athleten-Datensatz in einem Rutsch
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_first_name text;
begin
  v_first_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, locale, is_coach)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), v_first_name),
    coalesce((new.raw_user_meta_data ->> 'locale')::public.app_locale, 'de'),
    coalesce((new.raw_user_meta_data ->> 'is_coach')::boolean, false)
  )
  on conflict (id) do nothing;

  insert into public.athletes (user_id, created_by, first_name, last_name)
  values (
    new.id,
    new.id,
    v_first_name,
    nullif(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Legt ein Trainer einen Klienten an, entsteht sofort die aktive Verknüpfung.
create or replace function public.link_creator_as_coach()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.created_by is null or new.created_by = new.user_id then
    return new;
  end if;

  insert into public.coach_athlete_links (coach_id, athlete_id, status, accepted_at)
  values (new.created_by, new.id, 'active', now())
  on conflict (coach_id, athlete_id) do nothing;

  return new;
end;
$$;

create trigger athletes_link_creator
  after insert on public.athletes
  for each row execute function public.link_creator_as_coach();
