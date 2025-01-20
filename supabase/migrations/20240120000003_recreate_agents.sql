-- Drop and recreate agents table
DROP TABLE IF EXISTS agents CASCADE;

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('strategic', 'job')),
    status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'error', 'terminated')),
    edgefunction TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);