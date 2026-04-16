-- =====================
-- Link contacts to companies
-- =====================
alter table contacts
  add column if not exists company_id uuid references companies(id) on delete set null;
