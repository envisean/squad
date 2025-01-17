# Gmail Assistant Deployment Guide

This guide covers the deployment process for the Gmail Inbox Assistant agent, including infrastructure setup, security considerations, and monitoring.

## Prerequisites

- Supabase project with pgvector enabled
- Gmail API credentials
- ClickUp API key
- OpenAI API key
- Composio API key

## Infrastructure Setup

### 1. Supabase Configuration

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables for email embeddings
CREATE TABLE email_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for similarity search
CREATE INDEX email_embeddings_idx ON email_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create table for email processing status
CREATE TABLE email_processing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INT DEFAULT 0,
    last_attempt TIMESTAMPTZ,
    error TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for response templates
CREATE TABLE response_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    template TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Edge Function Setup

```bash
# Create Edge Function
supabase functions new gmail-assistant

# Deploy with secrets
supabase secrets set --env-file ./config/.env.production

# Deploy function
supabase functions deploy gmail-assistant --no-verify-jwt
```

### 3. Gmail Webhook Configuration

```typescript
// Set up Gmail push notifications
async function setupGmailWebhook() {
  const gmail = google.gmail({ version: 'v1', auth });
  
  await gmail.users.watch({
    userId: 'me',
    requestBody: {
      labelIds: ['INBOX'],
      topicName: 'projects/your-project/topics/gmail-notifications'
    }
  });
}

// Pub/Sub subscription
gcloud pubsub subscriptions create gmail-webhook \
  --topic gmail-notifications \
  --push-endpoint="https://[PROJECT_REF].supabase.co/functions/v1/gmail-assistant" \
  --message-retention-duration=1d
```

## Security Configuration

### 1. Authentication Setup

```typescript
// config/auth-config.ts
export const authConfig = {
  gmail: {
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose'
    ],
    credentials: {
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      redirect_uri: process.env.GMAIL_REDIRECT_URI
    }
  },
  clickup: {
    apiKey: process.env.CLICKUP_API_KEY,
    workspace: process.env.CLICKUP_WORKSPACE_ID
  }
};
```

### 2. Secrets Management

```bash
# Set required secrets
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  GMAIL_CLIENT_ID=... \
  GMAIL_CLIENT_SECRET=... \
  GMAIL_REFRESH_TOKEN=... \
  CLICKUP_API_KEY=... \
  COMPOSIO_API_KEY=...
```

### 3. Rate Limiting

```typescript
// middleware/rate-limit.ts
import { createRateLimiter } from '@squad/core';

export const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  store: new SupabaseStore({
    tableName: 'rate_limits',
    ttl: 900 // 15 minutes in seconds
  })
});
```

## Monitoring Setup

### 1. Logging Configuration

```typescript
// config/logging-config.ts
export const loggingConfig = {
  level: 'info',
  format: 'json',
  storage: {
    type: 'supabase',
    table: 'agent_logs',
    retention_days: 30
  },
  alerts: {
    error_threshold: 5, // Alert after 5 errors in 5 minutes
    latency_threshold: 10000, // Alert on responses over 10s
    channels: ['slack', 'email']
  }
};
```

### 2. Metrics Collection

```sql
-- Create metrics table
CREATE TABLE agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    emails_processed INT,
    responses_generated INT,
    tasks_created INT,
    average_response_time FLOAT,
    error_count INT,
    metadata JSONB
);

-- Create metrics view
CREATE VIEW agent_performance AS
SELECT
    date_trunc('hour', timestamp) as time_bucket,
    COUNT(*) as total_processed,
    AVG(average_response_time) as avg_response_time,
    SUM(error_count) as total_errors
FROM agent_metrics
GROUP BY time_bucket
ORDER BY time_bucket DESC;
```

### 3. Alert Configuration

```typescript
// config/alert-config.ts
export const alertConfig = {
  channels: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#agent-alerts',
      mention_users: ['U123456'] // User IDs to mention
    },
    email: {
      recipients: ['admin@company.com'],
      from: 'alerts@company.com'
    }
  },
  rules: [
    {
      name: 'high_error_rate',
      condition: 'error_count > 5 IN LAST 5 MINUTES',
      severity: 'high',
      channels: ['slack', 'email']
    },
    {
      name: 'long_processing_time',
      condition: 'avg_processing_time > 10000 IN LAST 1 MINUTE',
      severity: 'medium',
      channels: ['slack']
    }
  ]
};
```

## Deployment Steps

1. **Prepare Environment**
```bash
# Clone repository
git clone https://github.com/your-org/squad.git
cd squad

# Install dependencies
pnpm install

# Build packages
pnpm build
```

2. **Configure Supabase**
```bash
# Initialize Supabase
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

3. **Deploy Edge Functions**
```bash
# Deploy all functions
supabase functions deploy gmail-assistant

# Verify deployment
supabase functions inspect gmail-assistant
```

4. **Set Up Monitoring**
```bash
# Create log drain
supabase log-drain create \
  --type supabase_log_drain \
  --config.endpoint=https://your-logging-service \
  --config.api_key=your-api-key

# Set up metrics export
supabase metrics enable
```

5. **Configure Webhooks**
```bash
# Set up Gmail webhook
node scripts/setup-gmail-webhook.js

# Verify webhook
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/gmail-assistant \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Testing Deployment

```bash
# Test email processing
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/gmail-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "data": "base64-encoded-gmail-notification"
    }
  }'

# Monitor logs
supabase logs tail -n 100

# Check metrics
supabase db query "SELECT * FROM agent_performance LIMIT 10;"
```

## Scaling Configuration

```typescript
// config/scaling-config.ts
export const scalingConfig = {
  edge_function: {
    min_instances: 1,
    max_instances: 10,
    target_concurrency: 5
  },
  rate_limits: {
    gmail_api: 250, // requests per minute
    openai_api: 500, // requests per minute
    clickup_api: 100 // requests per minute
  },
  caching: {
    template_ttl: 3600, // 1 hour
    embedding_ttl: 86400, // 24 hours
    metadata_ttl: 300 // 5 minutes
  }
};
```

## Maintenance Procedures

### 1. Regular Maintenance

```bash
# Vacuum vector indexes
supabase db query "VACUUM ANALYZE email_embeddings;"

# Clean old logs
supabase db query "DELETE FROM agent_logs WHERE timestamp < NOW() - INTERVAL '30 days';"

# Update dependencies
pnpm update
```

### 2. Backup Procedures

```bash
# Backup templates
supabase db dump -t response_templates > templates_backup.sql

# Backup embeddings
supabase db dump -t email_embeddings > embeddings_backup.sql
```

### 3. Recovery Procedures

```bash
# Restore from backup
supabase db restore < backup.sql

# Reset webhook
node scripts/reset-gmail-webhook.js

# Clear error state
supabase db query "UPDATE email_processing SET status = 'pending', attempts = 0 WHERE status = 'error';"
```

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
```bash
# Check webhook status
curl -X GET "https://gmail.googleapis.com/gmail/v1/users/me/watch" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Reset webhook
node scripts/reset-gmail-webhook.js
```

2. **High Error Rates**
```bash
# Check error logs
supabase db query "
  SELECT error, COUNT(*) 
  FROM email_processing 
  WHERE status = 'error' 
  GROUP BY error 
  ORDER BY COUNT(*) DESC;"

# Reset error state
supabase db query "
  UPDATE email_processing 
  SET status = 'pending', 
      attempts = 0 
  WHERE status = 'error';"
```

3. **Performance Issues**
```bash
# Check vector store performance
supabase db query "
  SELECT schemaname, relname, n_live_tup, n_dead_tup 
  FROM pg_stat_user_tables 
  WHERE relname = 'email_embeddings';"

# Analyze query performance
supabase db query "EXPLAIN ANALYZE 
  SELECT * FROM email_embeddings 
  ORDER BY embedding <-> '[vector]' 
  LIMIT 5;"
```

## Health Checks

```typescript
// health/checks.ts
export async function performHealthChecks() {
  const checks = [
    checkGmailConnection(),
    checkVectorStore(),
    checkWebhook(),
    checkRateLimits(),
    checkProcessingQueue()
  ];

  const results = await Promise.all(checks);
  return results.every(r => r.status === 'healthy');
}

// Set up health check endpoint
serve(async (req) => {
  if (req.url.endsWith('/health')) {
    const healthy = await performHealthChecks();
    return new Response(
      JSON.stringify({ status: healthy ? 'healthy' : 'unhealthy' }),
      { status: healthy ? 200 : 500 }
    );
  }
});
```