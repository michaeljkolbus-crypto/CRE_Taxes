-- Migration 007: Add use_company_address flag to contacts
-- When true, contact's mailing address is inherited from their linked company (company_id)

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS use_company_address boolean DEFAULT false;
