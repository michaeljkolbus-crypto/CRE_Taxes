-- ── User View Preferences ────────────────────────────────────────────────────
-- Stores named, user-specific layout configurations for list and detail views.
-- view_type: 'property_detail' | 'property_list'
-- config (property_detail): { "tabs": [{ "id": "Overview", "label": "Overview", "visible": true }, ...] }
-- config (property_list):   { "columns": [{ "key": "address", "visible": true }, ...] }

create table if not exists user_view_preferences (
  id         uuid         primary key default gen_random_uuid(),
  user_id    uuid         not null references auth.users(id) on delete cascade,
  view_type  text         not null,   -- 'property_detail' | 'property_list'
  name       text         not null,
  is_default boolean      not null default false,
  config     jsonb        not null default '{}',
  created_at timestamptz  not null default now(),
  updated_at timestamptz  not null default now()
);

-- index for fast per-user per-type lookups
create index if not exists user_view_preferences_user_type_idx
  on user_view_preferences(user_id, view_type);

-- only one default per user per view_type (partial unique index)
create unique index if not exists user_view_preferences_default_idx
  on user_view_preferences(user_id, view_type)
  where is_default = true;

-- RLS: users can only read/write their own preferences
alter table user_view_preferences enable row level security;

create policy "Users manage own view preferences"
  on user_view_preferences
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
