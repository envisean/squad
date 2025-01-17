-- Insert sample agents
INSERT INTO agents (name, description, type, model, parameters)
VALUES
    ('Task Assistant', 'General purpose task assistant', 'general', 'gpt-4', '{"temperature": 0.7, "max_tokens": 500}'),
    ('Code Reviewer', 'Specialized in code review and analysis', 'development', 'gpt-4', '{"temperature": 0.3, "max_tokens": 1000}'),
    ('Data Analyzer', 'Specialized in data analysis and insights', 'analytics', 'gpt-4', '{"temperature": 0.2, "max_tokens": 800}');

-- Insert initial agent states
INSERT INTO agent_states (agent_id, status, last_active)
SELECT 
    id as agent_id,
    'idle' as status,
    TIMEZONE('utc', NOW()) as last_active
FROM agents;