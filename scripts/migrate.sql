-- Portfolio Admin - Database Migration
-- Run this directly on your Neon database console if the API migration fails.
-- Go to: https://console.neon.tech -> your project -> SQL Editor -> paste and run

ALTER TABLE sites ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS tech_stack TEXT DEFAULT '';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Verify columns were added
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sites' ORDER BY ordinal_position;
