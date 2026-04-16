-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- USER PROFILES
-- =====================
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  email text,
  full_name text,
  role text default 'user',
  created_at timestamptz default now()
);

-- =====================
-- CONTACTS
-- =====================
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  full_name text generated always as (trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) stored,
  address text,
  unit_suite text,
  city text,
  state text default 'IL',
  zipcode text,
  email_address text,
  main_phone text,
  cell_phone text,
  contact_type text,
  notes text,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- COMPANIES
-- =====================
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  company_type text,
  address text,
  unit_suite text,
  city text,
  state text default 'IL',
  zipcode text,
  email_address text,
  company_phone text,
  company_website text,
  notes text,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- PROPERTIES (one per PIN)
-- =====================
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  -- Identification
  parcel_id text,
  parcel_id2 text,
  parcel_id3 text,
  parcel_id4 text,
  parcel_id5 text,
  misc_parcels text,
  county text,
  township text,
  -- Address
  address text,
  city text,
  state text default 'IL',
  zipcode text,
  property_name text,
  market text,
  submarket text,
  -- Classification
  property_type text,
  property_subtype text,
  current_use text,
  zoning text,
  tax_class text,
  grade text,
  condition text,
  style text,
  -- Physical
  total_land_acres numeric,
  total_land_sqft numeric,
  total_building_sqft numeric,
  year_built integer,
  year_renovated integer,
  land_to_bldg_ratio numeric,
  num_buildings integer,
  num_stories integer,
  exterior_construction text,
  ceiling_height numeric,
  num_loading_docks integer,
  sprinkler_system text,
  -- Units / Space
  num_residential_units integer,
  num_commercial_units integer,
  total_units integer,
  num_apartments integer,
  apartment_mix text,
  residential_sqft numeric,
  retail_space_sqft numeric,
  office_space_sqft numeric,
  warehouse_sqft numeric,
  manufacturing_sqft numeric,
  comm_garage_sqft numeric,
  other_improvements text,
  -- Financial / Tax
  sale_date date,
  sales_price numeric,
  sales_price_per_sqft numeric,
  land_assessment numeric,
  bldg_assessment numeric,
  total_assessment numeric,
  bldg_assessment_per_sqft numeric,
  tax_code text,
  tax_rate numeric,
  annual_tax_bill numeric,
  tif_value numeric,
  tax_year integer,
  assessed_bldg_value numeric,
  -- Location
  latitude numeric,
  longitude numeric,
  neighborhood_num text,
  -- Residential-specific
  num_bedrooms integer,
  num_full_baths integer,
  num_half_baths integer,
  num_fireplaces integer,
  air_conditioning boolean,
  total_living_area_sqft numeric,
  main_living_area_sqft numeric,
  recreation_area_sqft numeric,
  attached_garage_sqft numeric,
  detached_garage_sqft numeric,
  basement boolean,
  basement_sqft numeric,
  finished_basement_sqft numeric,
  -- Multifamily-specific
  num_bathrooms_per_unit numeric,
  total_living_area_sqft_per_unit numeric,
  basement_area_sqft_per_unit numeric,
  finished_bsmt_area_sqft_per_unit numeric,
  garage_per_unit text,
  num_0bed_apts integer,
  num_1bed_apts integer,
  num_2bed_apts integer,
  num_3bed_apts integer,
  num_4bed_apts integer,
  individual_laundry boolean,
  vacant_sqft numeric,
  occupancy numeric,
  num_parking_spaces integer,
  -- Notes
  notes text,
  -- Meta
  owner_user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- PROPERTY CONTACTS (junction)
-- =====================
create table if not exists property_contacts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  role text default 'Owner',
  is_primary boolean default false,
  created_at timestamptz default now(),
  unique(property_id, contact_id)
);

-- =====================
-- ASSESSMENTS (per property per tax year)
-- =====================
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  tax_year integer not null,
  land_assessment numeric,
  bldg_assessment numeric,
  total_assessment numeric,
  equalized_assessed_value numeric,
  fair_market_value numeric,
  assessment_ratio numeric,
  tax_code text,
  tax_rate numeric,
  annual_tax_bill numeric,
  source text default 'manual',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, tax_year)
);

-- =====================
-- APPEAL STAGES (user-configurable)
-- =====================
create table if not exists appeal_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#6366f1',
  sort_order integer default 0,
  created_at timestamptz default now()
);

insert into appeal_stages (name, color, sort_order) values
  ('Prospect', '#94a3b8', 0),
  ('Contacted', '#3b82f6', 1),
  ('Agreement Signed', '#8b5cf6', 2),
  ('BOR Filed', '#f59e0b', 3),
  ('BOR Hearing', '#f97316', 4),
  ('BOR Result', '#06b6d4', 5),
  ('PTAB Filed', '#ec4899', 6),
  ('PTAB Hearing', '#ef4444', 7),
  ('PTAB Result', '#84cc16', 8),
  ('Commission Invoiced', '#10b981', 9),
  ('Collected', '#059669', 10)
on conflict do nothing;

-- =====================
-- APPEALS (one per property per tax year)
-- =====================
create table if not exists appeals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  tax_year integer not null,
  stage_id uuid references appeal_stages(id),
  -- BOR
  bor_filed_date date,
  bor_hearing_date date,
  bor_result_date date,
  bor_result text,
  -- PTAB
  ptab_filed_date date,
  ptab_hearing_date date,
  ptab_result_date date,
  ptab_result text,
  -- Financials (computed in app)
  eav_pre numeric,
  eav_post numeric,
  tax_rate_filing_year numeric,
  retainer_amount numeric default 500,
  retainer_received boolean default false,
  retainer_received_date date,
  commission_pct numeric default 50,
  commission_invoiced boolean default false,
  commission_invoiced_date date,
  commission_collected boolean default false,
  commission_collected_date date,
  notes text,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, tax_year)
);

-- =====================
-- COMPS (comparable sales pool)
-- =====================
create table if not exists comps (
  id uuid primary key default gen_random_uuid(),
  -- Identification
  parcel_id text,
  county text,
  township text,
  -- Address
  address text,
  city text,
  state text,
  zipcode text,
  -- Classification
  property_type text,
  property_subtype text,
  current_use text,
  zoning text,
  tax_class text,
  grade text,
  condition text,
  style text,
  -- Physical
  total_land_acres numeric,
  total_land_sqft numeric,
  total_building_sqft numeric,
  year_built integer,
  year_renovated integer,
  land_to_bldg_ratio numeric,
  num_buildings integer,
  num_stories integer,
  -- Units / Space
  num_residential_units integer,
  num_commercial_units integer,
  total_units integer,
  num_apartments integer,
  residential_sqft numeric,
  retail_space_sqft numeric,
  office_space_sqft numeric,
  warehouse_sqft numeric,
  -- Sale info
  seller_full_name text,
  buyer_full_name text,
  sale_date date,
  sales_price numeric,
  sales_price_per_sqft numeric,
  price_per_unit numeric,
  price_per_acre numeric,
  -- Income
  gross_income numeric,
  net_income numeric,
  cap_rate numeric,
  grm numeric,
  occupancy numeric,
  -- Assessment
  land_assessment numeric,
  bldg_assessment numeric,
  total_assessment numeric,
  equalized_assessed_value numeric,
  tax_code text,
  tax_rate numeric,
  annual_tax_bill numeric,
  assessed_bldg_value numeric,
  tax_year integer,
  -- Location
  latitude numeric,
  longitude numeric,
  neighborhood_num text,
  proximity_to_subject numeric,
  -- Residential
  num_bedrooms integer,
  num_full_baths integer,
  num_half_baths integer,
  total_living_area_sqft numeric,
  basement boolean,
  basement_sqft numeric,
  finished_basement_sqft numeric,
  attached_garage_sqft numeric,
  detached_garage_sqft numeric,
  -- Multifamily
  num_bathrooms_per_unit numeric,
  total_living_area_sqft_per_unit numeric,
  num_0bed_apts integer,
  num_1bed_apts integer,
  num_2bed_apts integer,
  num_3bed_apts integer,
  num_4bed_apts integer,
  individual_laundry boolean,
  num_parking_spaces integer,
  -- Meta
  data_source text,
  notes text,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- =====================
-- APPEAL COMPS (junction)
-- =====================
create table if not exists appeal_comps (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid references appeals(id) on delete cascade,
  comp_id uuid references comps(id) on delete cascade,
  relevance_score numeric,
  is_selected boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique(appeal_id, comp_id)
);

-- =====================
-- COUNTY DEADLINES
-- =====================
create table if not exists county_deadlines (
  id uuid primary key default gen_random_uuid(),
  county text not null,
  appeal_type text not null,
  tax_year integer not null,
  open_date date,
  close_date date,
  notes text,
  created_at timestamptz default now(),
  unique(county, appeal_type, tax_year)
);

-- =====================
-- DOCUMENTS
-- =====================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid references appeals(id) on delete cascade,
  property_id uuid references properties(id),
  document_type text,
  file_name text,
  storage_path text,
  public_url text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now()
);

-- =====================
-- TASKS
-- =====================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date date,
  completed boolean default false,
  completed_at timestamptz,
  appeal_id uuid references appeals(id),
  property_id uuid references properties(id),
  contact_id uuid references contacts(id),
  notes text,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- =====================
-- RLS POLICIES
-- =====================

-- Enable RLS on all tables
alter table user_profiles enable row level security;
alter table contacts enable row level security;
alter table companies enable row level security;
alter table properties enable row level security;
alter table property_contacts enable row level security;
alter table assessments enable row level security;
alter table appeal_stages enable row level security;
alter table appeals enable row level security;
alter table comps enable row level security;
alter table appeal_comps enable row level security;
alter table county_deadlines enable row level security;
alter table documents enable row level security;
alter table tasks enable row level security;

-- Helper: is admin
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from user_profiles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- user_profiles: users see own, admins see all
create policy "users_own_profile" on user_profiles for all using (user_id = auth.uid() or is_admin());

-- All other tables: authenticated users can do everything (adjust later for stricter per-user RLS if needed)
create policy "authenticated_all_contacts" on contacts for all to authenticated using (true) with check (true);
create policy "authenticated_all_companies" on companies for all to authenticated using (true) with check (true);
create policy "authenticated_all_properties" on properties for all to authenticated using (true) with check (true);
create policy "authenticated_all_property_contacts" on property_contacts for all to authenticated using (true) with check (true);
create policy "authenticated_all_assessments" on assessments for all to authenticated using (true) with check (true);
create policy "authenticated_all_appeal_stages" on appeal_stages for all to authenticated using (true) with check (true);
create policy "authenticated_all_appeals" on appeals for all to authenticated using (true) with check (true);
create policy "authenticated_all_comps" on comps for all to authenticated using (true) with check (true);
create policy "authenticated_all_appeal_comps" on appeal_comps for all to authenticated using (true) with check (true);
create policy "authenticated_all_county_deadlines" on county_deadlines for all to authenticated using (true) with check (true);
create policy "authenticated_all_documents" on documents for all to authenticated using (true) with check (true);
create policy "authenticated_all_tasks" on tasks for all to authenticated using (true) with check (true);

-- Auto-create user_profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (user_id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
