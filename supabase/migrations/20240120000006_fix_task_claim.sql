-- Update claim_next_task function to allow any idle agent to claim tasks
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
        WHERE tq.task_type = ANY(p_task_types)
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
        processing_started_at = now(),
        agent_id = p_agent_id  -- Assign the task to the claiming agent
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