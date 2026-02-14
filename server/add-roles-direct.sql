-- Direct SQL to add new roles to database
-- Run this if the migration script doesn't work

-- Step 1: Convert role column to VARCHAR temporarily
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);

-- Step 2: Drop the old enum type
DROP TYPE IF EXISTS enum_users_role CASCADE;

-- Step 3: Create new enum with all 7 roles
CREATE TYPE enum_users_role AS ENUM (
  'staff',
  'manager',
  'admin',
  'quality_supervisor',
  'physical_supervisor',
  'inventory_staff',
  'financial_account'
);

-- Step 4: Convert role column back to enum
ALTER TABLE users ALTER COLUMN role TYPE enum_users_role USING role::enum_users_role;

-- Step 5: Verify roles
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')
ORDER BY enumlabel;

-- You should see all 7 roles listed
