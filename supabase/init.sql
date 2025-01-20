-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memory system tables
CREATE TABLE IF NOT EXISTS memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),
    type TEXT NOT NULL,
    agent_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS working_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create agent system tables
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('strategic', 'job')),
    status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'error', 'terminated')),
    edge_function TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    metrics JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create queue system tables
CREATE TABLE IF NOT EXISTS task_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    task_type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestrator_id UUID NOT NULL REFERENCES agents(id),
    workflow_type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    workflow JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    sub_tasks JSONB[] DEFAULT ARRAY[]::JSONB[],
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_type ON memory_embeddings(type);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_agent ON memory_embeddings(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_created ON memory_embeddings(created_at);

CREATE INDEX IF NOT EXISTS idx_working_memory_agent ON working_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_working_memory_updated ON working_memory(updated_at);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_updated ON agents(updated_at);

CREATE INDEX IF NOT EXISTS idx_heartbeats_agent ON agent_heartbeats(agent_id);
CREATE INDEX IF NOT EXISTS idx_heartbeats_timestamp ON agent_heartbeats(timestamp);

CREATE INDEX IF NOT EXISTS idx_task_queues_status ON task_queues(status);
CREATE INDEX IF NOT EXISTS idx_task_queues_agent ON task_queues(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_queues_priority ON task_queues(priority);
CREATE INDEX IF NOT EXISTS idx_task_queues_scheduled ON task_queues(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_workflow_queues_status ON workflow_queues(status);
CREATE INDEX IF NOT EXISTS idx_workflow_queues_orchestrator ON workflow_queues(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_workflow_queues_priority ON workflow_queues(priority);
CREATE INDEX IF NOT EXISTS idx_workflow_queues_scheduled ON workflow_queues(scheduled_for);

-- Create HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS memory_embeddings_vector_idx ON memory_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (
    m = 16,
    ef_construction = 64
);

-- Enable row level security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_queues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON agents
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for all users" ON agent_heartbeats
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for all users" ON memory_embeddings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for all users" ON working_memory
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for all users" ON task_queues
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for all users" ON workflow_queues
    FOR SELECT
    TO authenticated
    USING (true);

-- Create test function
CREATE OR REPLACE FUNCTION test_connection()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Connection successful!';
END;
$$ LANGUAGE plpgsql;