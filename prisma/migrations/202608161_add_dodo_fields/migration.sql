-- Add Dodo payment product IDs
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS dodoProductId TEXT;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS dodoYearlyProductId TEXT;

