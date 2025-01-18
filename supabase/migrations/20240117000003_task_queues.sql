-- Enable Database Webhooks for queue processing
alter publication supabase_realtime add table task_queues;
alter publication supabase_realtime add table orchestrator_queues;

-- Task Queue Status enum
CREATE TYPE queue_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'retrying'
);

-- Task Priority enum
CREATE TYPE task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Create task queues table
CREATE TABLE task_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    task_type TEXT NOT NULL,
    priority task_priority DEFAULT 'medium',
    status queue_status DEFAULT 'pending',
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create orchestrator queues table for higher-level tasks
CREATE TABLE orchestrator_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestrator_id UUID REFERENCES agents(id),
    workflow_type TEXT NOT NULL,
    priority task_priority DEFAULT 'medium',
    status queue_status DEFAULT 'pending',
    workflow JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    sub_tasks JSONB[] DEFAULT ARRAY[]::JSONB[],
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_task_queues_status ON task_queues(status);
CREATE INDEX idx_task_queues_agent ON task_queues(agent_id);
CREATE INDEX idx_task_queues_priority ON task_queues(priority);
CREATE INDEX idx_task_queues_scheduled ON task_queues(scheduled_for);

CREATE INDEX idx_orchestrator_queues_status ON orchestrator_queues(status);
CREATE INDEX idx_orchestrator_queues_orchestrator ON orchestrator_queues(orchestrator_id);
CREATE INDEX idx_orchestrator_queues_priority ON orchestrator_queues(priority);
CREATE INDEX idx_orchestrator_queues_scheduled ON orchestrator_queues(scheduled_for);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_task_queues_updated_at
    BEFORE UPDATE ON task_queues
    FOR EACH ROW
    EXECUTE FUNCTION update_queue_updated_at();

CREATE TRIGGER update_orchestrator_queues_updated_at
    BEFORE UPDATE ON orchestrator_queues
    FOR EACH ROW
    EXECUTE FUNCTION update_queue_updated_at();

-- Create view for queue metrics
CREATE VIEW queue_metrics_view AS
SELECT 
    agent_id,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_tasks,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'retrying') as retrying_tasks,
    AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) 
        FILTER (WHERE status = 'completed') as avg_processing_time,
    COUNT(*) FILTER (WHERE priority = 'critical') as critical_tasks,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tasks
FROM task_queues
GROUP BY agent_id;

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

-- Create function to claim next orchestrator workflow
CREATE OR REPLACE FUNCTION claim_next_workflow(
    p_orchestrator_id UUID,
    p_workflow_types TEXT[]
)
RETURNS TABLE (
    id UUID,
    workflow_type TEXT,
    workflow JSONB,
    metadata JSONB
) AS $$
DECLARE
    v_workflow_id UUID;
BEGIN
    -- Lock and get next workflow
    WITH next_workflow AS (
        SELECT oq.id
        FROM orchestrator_queues oq
        WHERE oq.orchestrator_id = p_orchestrator_id
        AND oq.workflow_type = ANY(p_workflow_types)
        AND oq.status = 'pending'
        AND oq.scheduled_for <= now()
        ORDER BY 
            CASE oq.priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END,
            oq.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    UPDATE orchestrator_queues oq
    SET 
        status = 'processing',
        processing_started_at = now()
    FROM next_workflow
    WHERE oq.id = next_workflow.id
    RETURNING oq.id INTO v_workflow_id;

    -- Return workflow details if found
    IF v_workflow_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            oq.id,
            oq.workflow_type,
            oq.workflow,
            oq.metadata
        FROM orchestrator_queues oq
        WHERE oq.id = v_workflow_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to retry failed tasks
CREATE OR REPLACE FUNCTION retry_failed_tasks(
    p_max_age_hours integer DEFAULT 24,
    p_batch_size integer DEFAULT 100
)
RETURNS integer AS $$
DECLARE
    v_count integer;
BEGIN
    WITH tasks_to_retry AS (
        SELECT id
        FROM task_queues
        WHERE status = 'failed'
        AND retry_count < max_retries
        AND updated_at < now() - (p_max_age_hours || ' hours')::interval
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE task_queues tq
    SET 
        status = 'retrying',
        retry_count = retry_count + 1,
        scheduled_for = now() + (power(2, retry_count) || ' minutes')::interval
    FROM tasks_to_retry
    WHERE tq.id = tasks_to_retry.id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup completed tasks
CREATE OR REPLACE FUNCTION cleanup_completed_tasks(
    p_max_age_days integer DEFAULT 7,
    p_batch_size integer DEFAULT 1000
)
RETURNS integer AS $$
DECLARE
    v_count integer;
BEGIN
    WITH completed_tasks AS (
        SELECT id
        FROM task_queues
        WHERE status = 'completed'
        AND completed_at < now() - (p_max_age_days || ' days')::interval
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    DELETE FROM task_queues tq
    USING completed_tasks
    WHERE tq.id = completed_tasks.id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;