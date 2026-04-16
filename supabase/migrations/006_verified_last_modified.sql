-- ── Verified flag + Last Modified tracking ───────────────────────────────────
-- Adds `verified`, `last_modified_by`, and (where missing) `updated_at`
-- to all 5 record types so users can mark records as accurate and see
-- who last touched each record.

-- ──────────────────────────────────────────────────────────────────────────────
-- PROPERTIES
-- ──────────────────────────────────────────────────────────────────────────────
alter table properties
  add column if not exists verified          boolean      not null default false,
  add column if not exists last_modified_by  text;

-- ──────────────────────────────────────────────────────────────────────────────
-- CONTACTS
-- ──────────────────────────────────────────────────────────────────────────────
alter table contacts
  add column if not exists verified          boolean      not null default false,
  add column if not exists last_modified_by  text;

-- ──────────────────────────────────────────────────────────────────────────────
-- COMPANIES
-- ──────────────────────────────────────────────────────────────────────────────
alter table companies
  add column if not exists verified          boolean      not null default false,
  add column if not exists last_modified_by  text;

-- ──────────────────────────────────────────────────────────────────────────────
-- APPEALS
-- ──────────────────────────────────────────────────────────────────────────────
alter table appeals
  add column if not exists verified          boolean      not null default false,
  add column if not exists last_modified_by  text;

-- ──────────────────────────────────────────────────────────────────────────────
-- COMPS  (already has verified; add updated_at + last_modified_by)
-- ──────────────────────────────────────────────────────────────────────────────
alter table comps
  add column if not exists updated_at        timestamptz  not null default now(),
  add column if not exists last_modified_by  text;

-- Indexes for sorting/filtering by verified on list pages
create index if not exists properties_verified_idx on properties(verified);
create index if not exists contacts_verified_idx   on contacts(verified);
create index if not exists companies_verified_idx  on companies(verified);
create index if not exists appeals_verified_idx    on appeals(verified);
create index if not exists comps_verified_idx      on comps(verified);
