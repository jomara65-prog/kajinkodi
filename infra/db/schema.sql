create extension if not exists postgis;

create table if not exists user_profile (
  id uuid primary key,
  handle text unique not null,
  role text not null default 'member',
  xp integer not null default 0,
  rank_tier text not null default 'rookie',
  created_at timestamptz not null default now()
);

create table if not exists sighting (
  id bigserial primary key,
  user_id uuid not null references user_profile(id),
  species text not null,
  confidence smallint not null check (confidence between 1 and 5),
  herd_size integer,
  geom geography(point, 4326) not null,
  seen_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists catch_log (
  id bigserial primary key,
  user_id uuid not null references user_profile(id),
  species text not null,
  weight_kg numeric(8,2),
  geom geography(point, 4326),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists quest (
  id bigserial primary key,
  slug text unique not null,
  title text not null,
  reward_xp integer not null,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists quest_completion (
  id bigserial primary key,
  quest_id bigint not null references quest(id),
  user_id uuid not null references user_profile(id),
  completed_at timestamptz not null default now(),
  awarded boolean not null default false,
  unique (quest_id, user_id, date_trunc('day', completed_at))
);

create table if not exists xp_transaction (
  id bigserial primary key,
  user_id uuid not null references user_profile(id),
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists leaderboard_monthly (
  month_key text not null,
  user_id uuid not null references user_profile(id),
  score integer not null,
  rank integer not null,
  primary key (month_key, user_id)
);

create table if not exists co_op_listing (
  id bigserial primary key,
  owner_id uuid not null references user_profile(id),
  listing_type text not null,
  title text not null,
  qty numeric(10,2),
  unit text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists guide_profile (
  user_id uuid primary key references user_profile(id),
  region text not null,
  daily_rate numeric(10,2) not null,
  bio text,
  rating numeric(3,2) not null default 5.0
);

create table if not exists guide_booking (
  id bigserial primary key,
  guide_id uuid not null references guide_profile(user_id),
  client_id uuid not null references user_profile(id),
  start_date date not null,
  end_date date not null,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table if not exists trap_device (
  id text primary key,
  owner_id uuid references user_profile(id),
  game_type text,
  connectivity text not null check (connectivity in ('cell','lora')),
  battery_percent smallint,
  firmware_version text,
  last_seen_at timestamptz
);

create table if not exists trap_event (
  id bigserial primary key,
  trap_id text not null references trap_device(id),
  event_type text not null,
  value_numeric numeric(12,2),
  state_text text,
  event_ts timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists trap_command (
  id bigserial primary key,
  trap_id text not null references trap_device(id),
  command text not null,
  requested_by uuid references user_profile(id),
  requested_at timestamptz not null default now(),
  status text not null default 'queued',
  executed_at timestamptz
);

create index if not exists idx_sighting_geom on sighting using gist (geom);
create index if not exists idx_catch_geom on catch_log using gist (geom);
create index if not exists idx_trap_event_ts on trap_event (event_ts desc);
