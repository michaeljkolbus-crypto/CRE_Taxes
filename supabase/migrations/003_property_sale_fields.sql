-- =====================
-- Add Sale Cap Rate and Sale GRM to properties
-- =====================
alter table properties
  add column if not exists sale_cap_rate numeric,
  add column if not exists sale_grm numeric;
