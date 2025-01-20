-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memory embeddings table
CREATE TABLE memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),
    type TEXT NOT NULL,
    agent_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create HNSW index for fast similarity search
CREATE INDEX memory_embeddings_embedding_idx ON memory_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (
    m = 16,
    ef_construction = 64
);

-- Create standard indexes
CREATE INDEX memory_embeddings_type_idx ON memory_embeddings(type);
CREATE INDEX memory_embeddings_agent_idx ON memory_embeddings(agent_id);
CREATE INDEX memory_embeddings_created_idx ON memory_embeddings(created_at);

-- Create working memory table
CREATE TABLE working_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX working_memory_agent_idx ON working_memory(agent_id);
CREATE INDEX working_memory_updated_idx ON working_memory(updated_at);

-- Create memory statistics view
CREATE VIEW memory_statistics AS
SELECT
    type,
    agent_id,
    COUNT(*) as entry_count,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry,
    AVG(CASE 
        WHEN embedding IS NOT NULL 
        THEN array_length(embedding, 1) 
        ELSE 0 
    END) as avg_embedding_size
FROM memory_embeddings
GROUP BY type, agent_id;

-- Function to match similar memories
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding vector(1536),
    similarity_threshold float,
    match_count int,
    filter_type text DEFAULT NULL,
    filter_agent_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    content text,
    similarity float,
    metadata jsonb,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.content,
        1 - (me.embedding <=> query_embedding) as similarity,
        me.metadata,
        me.created_at
    FROM memory_embeddings me
    WHERE
        (filter_type IS NULL OR me.type = filter_type)
        AND (filter_agent_id IS NULL OR me.agent_id = filter_agent_id)
        AND (1 - (me.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to consolidate memories
CREATE OR REPLACE FUNCTION consolidate_memories(
    p_agent_id uuid,
    p_older_than interval,
    p_batch_size int DEFAULT 100
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff_date timestamptz;
    v_consolidated_content text;
    v_metadata jsonb;
BEGIN
    -- Calculate cutoff date
    v_cutoff_date := now() - p_older_than;
    
    -- Get memories to consolidate
    WITH memories_to_consolidate AS (
        SELECT 
            content,
            metadata,
            created_at
        FROM memory_embeddings
        WHERE 
            agent_id = p_agent_id
            AND type = 'conversation'
            AND created_at < v_cutoff_date
        ORDER BY created_at
        LIMIT p_batch_size
    ),
    consolidated AS (
        SELECT 
            string_agg(content, E'\n' ORDER BY created_at) as content,
            jsonb_agg(metadata) as metadata_array
        FROM memories_to_consolidate
    )
    SELECT 
        content,
        jsonb_build_object(
            'source', 'auto_consolidation',
            'original_memories', metadata_array,
            'consolidation_date', now()
        )
    INTO v_consolidated_content, v_metadata
    FROM consolidated;
    
    -- Insert consolidated memory
    IF v_consolidated_content IS NOT NULL THEN
        INSERT INTO memory_embeddings (
            type,
            agent_id,
            content,
            metadata
        ) VALUES (
            'summary',
            p_agent_id,
            v_consolidated_content,
            v_metadata
        );
        
        -- Delete consolidated memories
        DELETE FROM memory_embeddings
        WHERE 
            agent_id = p_agent_id
            AND type = 'conversation'
            AND created_at < v_cutoff_date
        LIMIT p_batch_size;
    END IF;
END;
$$;

-- Function to cleanup old memories
CREATE OR REPLACE FUNCTION cleanup_memories(
    p_retention_days int,
    p_exclude_types text[] DEFAULT ARRAY['episode']
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count int;
BEGIN
    WITH deleted AS (
        DELETE FROM memory_embeddings
        WHERE 
            created_at < now() - (p_retention_days || ' days')::interval
            AND type != ALL(p_exclude_types)
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    RETURN v_deleted_count;
END;
$$;