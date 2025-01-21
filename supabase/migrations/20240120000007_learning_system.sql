-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Raw experiences table
CREATE TABLE IF NOT EXISTS raw_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    actions JSONB[] NOT NULL DEFAULT '{}',
    outcomes JSONB[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    context JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tables for each memory type
CREATE TABLE IF NOT EXISTS memory_episodic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    environment TEXT NOT NULL,
    content JSONB NOT NULL,
    embedding vector(1536),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_semantic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    environment TEXT NOT NULL,
    content JSONB NOT NULL,
    embedding vector(1536),
    confidence FLOAT NOT NULL,
    source_experiences UUID[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_procedural (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    environment TEXT NOT NULL,
    content JSONB NOT NULL,
    embedding vector(1536),
    success_rate FLOAT NOT NULL DEFAULT 0,
    execution_count INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_relationship (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    environment TEXT NOT NULL,
    content JSONB NOT NULL,
    embedding vector(1536),
    confidence FLOAT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    type TEXT NOT NULL,
    pattern JSONB NOT NULL,
    confidence FLOAT NOT NULL,
    occurrences INT NOT NULL DEFAULT 1,
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_raw_experiences_type ON raw_experiences(type);
CREATE INDEX IF NOT EXISTS idx_raw_experiences_timestamp ON raw_experiences(timestamp);

CREATE INDEX IF NOT EXISTS idx_memory_episodic_agent ON memory_episodic(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_episodic_created ON memory_episodic(created_at);

CREATE INDEX IF NOT EXISTS idx_memory_semantic_agent ON memory_semantic(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_semantic_confidence ON memory_semantic(confidence);

CREATE INDEX IF NOT EXISTS idx_memory_procedural_agent ON memory_procedural(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_procedural_success ON memory_procedural(success_rate);

CREATE INDEX IF NOT EXISTS idx_memory_relationship_agent ON memory_relationship(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationship_confidence ON memory_relationship(confidence);

CREATE INDEX IF NOT EXISTS idx_patterns_agent ON patterns(agent_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);

-- Create vector indexes
CREATE INDEX IF NOT EXISTS memory_episodic_embedding_idx ON memory_episodic 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS memory_semantic_embedding_idx ON memory_semantic 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS memory_procedural_embedding_idx ON memory_procedural 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS memory_relationship_embedding_idx ON memory_relationship 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable row level security
ALTER TABLE raw_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_episodic ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_semantic ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_procedural ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_relationship ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON raw_experiences
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON memory_episodic
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON memory_semantic
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON memory_procedural
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON memory_relationship
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON patterns
    FOR SELECT TO authenticated USING (true);