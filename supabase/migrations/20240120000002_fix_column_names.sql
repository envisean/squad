-- Fix column names
ALTER TABLE agents RENAME COLUMN edge_function TO edgefunction;

-- Make sure all required columns exist
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS edgefunction TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';