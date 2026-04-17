-- ── Contact Extra Fields ──────────────────────────────────────────────────
-- Adds: title, contact_groups, segments, source, social media URLs (5),
--       possible phones (3), possible emails (3)
-- Note: contact_type already exists from migration 001.

alter table contacts
  add column if not exists title          text,
  add column if not exists contact_groups text[],
  add column if not exists segments       text[],
  add column if not exists source         text,
  add column if not exists linkedin_url   text,
  add column if not exists facebook_url   text,
  add column if not exists instagram_url  text,
  add column if not exists twitter_url    text,
  add column if not exists youtube_url    text,
  add column if not exists poss_phone_1   text,
  add column if not exists poss_phone_2   text,
  add column if not exists poss_phone_3   text,
  add column if not exists poss_email_1   text,
  add column if not exists poss_email_2   text,
  add column if not exists poss_email_3   text;

-- Index on source for future filtering
create index if not exists contacts_source_idx on contacts(source);
