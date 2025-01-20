-- Drop and recreate agents table to force schema refresh
DROP TABLE IF EXISTS agents CASCADE;

-- Recreate with snake_case column names
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('strategic', 'job')),
    status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'error', 'terminated')),
    edge_function TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable read access for all users" ON agents
    FOR SELECT
    TO authenticated
    USING (true);

-- Notify PostgREST of schema change
NOTIFY pgrst, 'reload schema';