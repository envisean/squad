-- Gmail credentials table
CREATE TABLE IF NOT EXISTS gmail_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    refresh_token TEXT NOT NULL,
    access_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    email_address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email processing history
CREATE TABLE IF NOT EXISTS email_processing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    email_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    classification JSONB NOT NULL,
    action_items JSONB[] DEFAULT '{}',
    processing_status TEXT NOT NULL,
    error TEXT,
    processing_time FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email sync status
CREATE TABLE IF NOT EXISTS email_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    last_history_id TEXT,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_status TEXT NOT NULL,
    error TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Agent preferences
CREATE TABLE IF NOT EXISTS agent_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    category TEXT NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE gmail_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can only access their own Gmail credentials"
    ON gmail_credentials
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own email processing history"
    ON email_processing_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own sync status"
    ON email_sync_status
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own preferences"
    ON agent_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gmail_creds_user ON gmail_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_creds_active ON gmail_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_email_history_user ON email_processing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_thread ON email_processing_history(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_sync_user ON email_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_prefs_user ON agent_preferences(user_id, category);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_gmail_credentials_updated_at
    BEFORE UPDATE ON gmail_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_preferences_updated_at
    BEFORE UPDATE ON agent_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to refresh Gmail token (placeholder for now)
CREATE OR REPLACE FUNCTION refresh_gmail_token()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be implemented in the Edge Function
    -- For now, just return the NEW record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_gmail_token_trigger
    BEFORE UPDATE ON gmail_credentials
    FOR EACH ROW
    EXECUTE FUNCTION refresh_gmail_token();