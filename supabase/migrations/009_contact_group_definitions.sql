-- 009_contact_group_definitions.sql
-- Creates a catalog of Contact Group tag definitions (name + color)
-- Groups are stored by name on contacts (contact_groups text[])
-- This table provides canonical colors and enables autocomplete

CREATE TABLE IF NOT EXISTS contact_group_definitions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  color      text        NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE contact_group_definitions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read, create, update, and delete group definitions
CREATE POLICY "Authenticated users can manage group definitions"
  ON contact_group_definitions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
