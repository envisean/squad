-- Create task queues table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_queues_status ON task_queues(status);
CREATE INDEX IF NOT EXISTS idx_task_queues_agent ON task_queues(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_queues_priority ON task_queues(priority);
CREATE INDEX IF NOT EXISTS idx_task_queues_scheduled ON task_queues(scheduled_for);

-- Enable RLS
ALTER TABLE task_queues ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable read access for all users" ON task_queues
    FOR SELECT
    TO authenticated
    USING (true);

-- Create function to claim next task
CREATE OR REPLACE FUNCTION claim_next_task(
    p_agent_id UUID,
    p_task_types TEXT[]
)
RETURNS TABLE (
    id UUID,
    task_type TEXT,
    payload JSONB,
    metadata JSONB
) AS $$
DECLARE
    v_task_id UUID;
BEGIN
    -- Lock and get next task
    WITH next_task AS (
        SELECT tq.id
        FROM task_queues tq
        WHERE tq.agent_id = p_agent_id
        AND tq.task_type = ANY(p_task_types)
        AND tq.status = 'pending'
        AND tq.scheduled_for <= now()
        ORDER BY 
            CASE tq.priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END,
            tq.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    UPDATE task_queues tq
    SET 
        status = 'processing',
        processing_started_at = now()
    FROM next_task
    WHERE tq.id = next_task.id
    RETURNING tq.id INTO v_task_id;

    -- Return task details if found
    IF v_task_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            tq.id,
            tq.task_type,
            tq.payload,
            tq.metadata
        FROM task_queues tq
        WHERE tq.id = v_task_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete task
CREATE OR REPLACE FUNCTION complete_task(
    p_task_id UUID,
    p_result JSONB
)
RETURNS VOID AS $$
BEGIN
    UPDATE task_queues
    SET 
        status = 'completed',
        completed_at = now(),
        metadata = metadata || jsonb_build_object('result', p_result)
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to fail task
CREATE OR REPLACE FUNCTION fail_task(
    p_task_id UUID,
    p_error TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE task_queues
    SET 
        status = 'failed',
        error = p_error,
        metadata = metadata || jsonb_build_object('failed_at', now())
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Notify PostgREST of schema change
NOTIFY pgrst, 'reload schema';