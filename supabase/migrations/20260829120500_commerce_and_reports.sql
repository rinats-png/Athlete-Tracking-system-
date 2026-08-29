-- =============================================================================
-- Bezahlschranken, Trainer-Branding, PDF-Reports, Health-Anbindung
-- =============================================================================

-- Freischaltungen. Bewusst getrennt vom Zahlungsanbieter: die App fragt immer
-- `entitlements`, Stripe (oder später ein App-Store-Kauf) schreibt nur hinein.
create table public.entitlements (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  product                public.entitlement_product not null,
  status                 public.entitlement_status not null default 'active',
  -- 'stripe' | 'manual' | 'promo' | 'app_store' | 'play_store'
  source                 text not null default 'stripe',
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_price_id        text,
  -- NULL = unbefristet (Einmalkauf B2C). Gesetzt = Abo-Laufzeitende (B2B).
  current_period_end     timestamptz,
  granted_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, product)
);

create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

-- Einzige Wahrheit für alle Bezahlschranken in App und Policies.
create or replace function public.has_entitlement(
  p_user_id uuid,
  p_product public.entitlement_product
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = p_user_id
      and e.product = p_product
      and e.status in ('active', 'trialing')
      and (e.current_period_end is null or e.current_period_end > now())
  );
$$;

-- White-Label-Konfiguration des Trainers. Wird sowohl im PDF als auch (per
-- CSS-Custom-Properties) in der Klientenansicht der App angewendet.
create table public.coach_branding (
  coach_id      uuid primary key references public.profiles (id) on delete cascade,
  company_name  text,
  logo_path     text,
  primary_color text not null default '#14161A',
  accent_color  text not null default '#C7F53F',
  contact_email text,
  website       text,
  footer_note   text,
  updated_at    timestamptz not null default now(),
  constraint coach_branding_primary_color_hex check (primary_color ~* '^#[0-9a-f]{6}$'),
  constraint coach_branding_accent_color_hex  check (accent_color  ~* '^#[0-9a-f]{6}$')
);

create trigger coach_branding_set_updated_at
  before update on public.coach_branding
  for each row execute function public.set_updated_at();

-- Erzeugte PDF-Reports. Die Datei liegt im Storage-Bucket 'reports',
-- `storage_path` ist der Schlüssel darin.
create table public.reports (
  id                    uuid primary key default gen_random_uuid(),
  athlete_id            uuid not null references public.athletes (id) on delete cascade,
  coach_id              uuid references public.profiles (id) on delete set null,
  assessment_id         uuid references public.assessments (id) on delete set null,
  -- Vergleichstermin für die Delta-Spalten im Report.
  compare_assessment_id uuid references public.assessments (id) on delete set null,
  locale                public.app_locale not null default 'de',
  score_mode            public.score_mode not null default 'population',
  storage_path          text,
  -- 'pending' | 'ready' | 'failed'
  status                text not null default 'pending',
  error_message         text,
  generated_at          timestamptz,
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now()
);

create index reports_athlete_idx on public.reports (athlete_id, created_at desc);

-- Vorbereitung für Google Health Connect / Apple Health. Tokens gehören NICHT
-- hierher, die liegen im Secret-Store der jeweiligen Plattform; hier steht nur,
-- welche Verbindung besteht und wann zuletzt synchronisiert wurde.
create table public.health_connections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  provider            text not null check (provider in ('health_connect', 'apple_health')),
  external_account_id text,
  scopes              text[] not null default '{}',
  connected_at        timestamptz not null default now(),
  last_synced_at      timestamptz,
  revoked_at          timestamptz,
  unique (user_id, provider)
);
