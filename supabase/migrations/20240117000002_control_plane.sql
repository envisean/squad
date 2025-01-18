-- Enable realtime for specific tables
alter publication supabase_realtime add table agents;
alter publication supabase_realtime add table agent_controls;

-- Create agents table
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

-- Create agent heartbeats table
CREATE TABLE agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    metrics JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent controls table
CREATE TABLE agent_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    command TEXT NOT NULL CHECK (
        command IN ('start', 'stop', 'restart', 'update', 'pause', 'resume')
    ),
    parameters JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'completed', 'failed')
    ),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_updated ON agents(updated_at);

CREATE INDEX idx_heartbeats_agent ON agent_heartbeats(agent_id);
CREATE INDEX idx_heartbeats_timestamp ON agent_heartbeats(timestamp);

CREATE INDEX idx_controls_agent ON agent_controls(agent_id);
CREATE INDEX idx_controls_status ON agent_controls(status);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_controls_updated_at
    BEFORE UPDATE ON agent_controls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for agent status
CREATE VIEW agent_status_view AS
SELECT 
    a.id,
    a.type,
    a.status,
    a.edge_function,
    a.metadata,
    a.updated_at,
    h.metrics as last_metrics,
    h.timestamp as last_heartbeat,
    (
        SELECT count(*)
        FROM agent_controls ac
        WHERE ac.agent_id = a.id AND ac.status = 'pending'
    ) as pending_commands
FROM agents a
LEFT JOIN LATERAL (
    SELECT metrics, timestamp
    FROM agent_heartbeats
    WHERE agent_id = a.id
    ORDER BY timestamp DESC
    LIMIT 1
) h ON true;

-- Create function to check agent health
CREATE OR REPLACE FUNCTION check_agent_health(
    p_timeout_seconds integer DEFAULT 90
)
RETURNS TABLE (
    agent_id UUID,
    status TEXT,
    last_heartbeat TIMESTAMPTZ,
    seconds_since_heartbeat integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.status,
        h.timestamp as last_heartbeat,
        EXTRACT(EPOCH FROM (now() - h.timestamp))::integer as seconds_since_heartbeat
    FROM agents a
    LEFT JOIN LATERAL (
        SELECT timestamp
        FROM agent_heartbeats
        WHERE agent_id = a.id
        ORDER BY timestamp DESC
        LIMIT 1
    ) h ON true
    WHERE 
        a.status != 'terminated'
        AND (
            h.timestamp IS NULL
            OR EXTRACT(EPOCH FROM (now() - h.timestamp)) > p_timeout_seconds
        );
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup old heartbeats
CREATE OR REPLACE FUNCTION cleanup_old_heartbeats(
    p_days integer DEFAULT 7
)
RETURNS integer AS $$
DECLARE
    v_deleted integer;
BEGIN
    DELETE FROM agent_heartbeats
    WHERE timestamp < now() - (p_days || ' days')::interval;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;