# ClickUp Task Assignment Listener Deployment Guide

This guide covers the deployment process for the ClickUp Task Assignment Listener agent, including webhook setup, task management, and monitoring.

## Prerequisites

- Supabase project with pgvector enabled
- ClickUp API credentials
- Slack webhook URL (for notifications)
- Gmail API credentials (for email notifications)
- OpenAI API key
- Composio API key

## Infrastructure Setup

### 1. Supabase Configuration

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables for task management
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    assignee_id TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for task embeddings
CREATE TABLE task_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for workload metrics
CREATE TABLE workload_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignee_id TEXT NOT NULL,
    active_tasks INT,
    completed_tasks INT,
    average_completion_time FLOAT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX task_embeddings_idx ON task_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX task_assignments_assignee_idx ON task_assignments(assignee_id);
CREATE INDEX task_assignments_status_idx ON task_assignments(status);
```

### 2. Edge Function Setup

```bash
# Create Edge Function
supabase functions new clickup-listener

# Deploy with secrets
supabase secrets set --env-file ./config/.env.production

# Deploy function
supabase functions deploy clickup-listener --no-verify-jwt
```

## Webhook Configuration

### 1. ClickUp Webhook Setup

```typescript
// scripts/setup-clickup-webhook.ts
async function setupClickUpWebhook() {
  const clickup = new ClickUp(process.env.CLICKUP_API_KEY);
  
  const webhook = await clickup.webhooks.create({
    endpoint: process.env.WEBHOOK_URL,
    workspace_id: process.env.CLICKUP_WORKSPACE_ID,
    events: [
      'taskAssigned',
      'taskUpdated',
      'taskPriorityUpdated',
      'taskDueDateUpdated',
      'taskStatusUpdated'
    ]
  });

  console.log('Webhook created:', webhook);
}
```

### 2. Webhook Security

```typescript
// middleware/webhook-security.ts
export function verifyClickUpWebhook(
  req: Request,
  secretKey: string
): boolean {
  const signature = req.headers.get('X-Signature');
  const body = req.body;
  
  const hmac = createHmac('sha256', secretKey)
    .update(JSON.stringify(body))
    .digest('hex');
    
  return hmac === signature;
}
```

## Deployment Steps

1. **Prepare Environment**
```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Set up environment variables
cp .env.example .env.production
```

2. **Configure APIs**
```bash
# Set up API credentials
supabase secrets set \
  CLICKUP_API_KEY=... \
  SLACK_WEBHOOK_URL=... \
  GMAIL_CLIENT_ID=... \
  GMAIL_CLIENT_SECRET=... \
  OPENAI_API_KEY=... \
  COMPOSIO_API_KEY=...
```

3. **Deploy Database Schema**
```bash
# Apply migrations
supabase db push

# Verify tables
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

4. **Set Up Webhooks**
```bash
# Deploy webhook handler
supabase functions deploy clickup-listener

# Set up ClickUp webhook
node scripts/setup-clickup-webhook.js

# Test webhook
curl -X POST "https://[PROJECT_REF].supabase.co/functions/v1/clickup-listener" \
  -H "X-Signature: ${TEST_SIGNATURE}" \
  -d '{"event": "taskAssigned", "task_id": "test"}'
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
  metrics: {
    assignments_processed: true,
    workload_distribution: true,
    response_times: true
  }
};
```

### 2. Performance Monitoring

```sql
-- Create monitoring views
CREATE VIEW assignment_metrics AS
SELECT
    date_trunc('hour', created_at) as time_bucket,
    COUNT(*) as total_assignments,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
FROM task_assignments
GROUP BY time_bucket
ORDER BY time_bucket DESC;

CREATE VIEW workload_distribution AS
SELECT
    assignee_id,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_tasks,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_completion_time
FROM task_assignments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY assignee_id;
```

### 3. Alert Configuration

```typescript
// config/alert-config.ts
export const alertConfig = {
  thresholds: {
    high_workload: 10, // Alert if assignee has more than 10 active tasks
    response_time: 300, // Alert if processing takes more than 5 minutes
    error_rate: 0.1 // Alert if error rate exceeds 10%
  },
  channels: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#task-alerts'
    },
    email: ['team-leads@company.com']
  }
};
```

## Scaling Configuration

```typescript
// config/scaling-config.ts
export const scalingConfig = {
  edge_function: {
    min_instances: 1,
    max_instances: 5,
    target_concurrency: 10
  },
  rate_limits: {
    clickup_api: 100, // requests per minute
    notifications: 60 // per minute
  },
  caching: {
    workload_ttl: 300, // 5 minutes
    user_preferences_ttl: 3600 // 1 hour
  }
};
```

## Error Handling

### 1. Webhook Failures

```typescript
// error/webhook-handler.ts
export async function handleWebhookError(error: Error, event: any) {
  // Log error
  await logError(error, event);
  
  // Store failed event
  await storeFailedEvent(event);
  
  // Notify team
  await notifyTeam(error, event);
  
  // Retry if appropriate
  if (isRetryable(error)) {
    await scheduleRetry(event);
  }
}
```

### 2. Assignment Failures

```typescript
// error/assignment-handler.ts
export async function handleAssignmentError(
  error: Error,
  assignment: any
) {
  // Update assignment status
  await updateAssignmentStatus(assignment.id, 'error');
  
  // Log error details
  await logAssignmentError(error, assignment);
  
  // Notify relevant parties
  await notifyAssignmentError(assignment);
  
  // Attempt recovery
  await attemptRecovery(assignment);
}
```

## Maintenance Procedures

### 1. Data Maintenance

```sql
-- Clean up old data
DELETE FROM task_assignments 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Archive completed tasks
UPDATE task_assignments 
SET status = 'archived' 
WHERE status = 'completed' 
AND updated_at < NOW() - INTERVAL '30 days';

-- Update statistics
ANALYZE task_assignments;
ANALYZE task_embeddings;
ANALYZE workload_metrics;
```

### 2. Webhook Maintenance

```typescript
// scripts/maintain-webhooks.ts
async function maintainWebhooks() {
  // Verify webhook status
  const status = await verifyWebhookStatus();
  
  // Recreate if needed
  if (!status.active) {
    await recreateWebhook();
  }
  
  // Update webhook configuration
  await updateWebhookConfig();
}
```

### 3. Performance Optimization

```sql
-- Optimize vector store
VACUUM ANALYZE task_embeddings;

-- Clean up unused embeddings
DELETE FROM task_embeddings te
WHERE NOT EXISTS (
    SELECT 1 FROM task_assignments ta 
    WHERE ta.task_id = te.task_id
);
```

## Health Checks

```typescript
// health/checks.ts
export async function checkHealth() {
  const checks = [
    checkClickUpConnection(),
    checkWebhookStatus(),
    checkDatabaseConnection(),
    checkNotificationServices(),
    checkWorkloadMetrics()
  ];

  const results = await Promise.all(checks);
  return results.every(r => r.healthy);
}

// Implement health check endpoint
serve(async (req) => {
  if (req.url.endsWith('/health')) {
    const health = await checkHealth();
    return new Response(
      JSON.stringify({ status: health ? 'healthy' : 'unhealthy' }),
      { status: health ? 200 : 500 }
    );
  }
});
```

## Backup and Recovery

### 1. Data Backup

```bash
# Backup task data
supabase db dump -t task_assignments > assignments_backup.sql

# Backup workload data
supabase db dump -t workload_metrics > workload_backup.sql

# Backup embeddings
supabase db dump -t task_embeddings > embeddings_backup.sql
```

### 2. Recovery Procedures

```bash
# Restore from backup
supabase db restore < backup.sql

# Rebuild indexes
supabase db query "REINDEX TABLE task_embeddings;"

# Verify data
supabase db query "SELECT COUNT(*) FROM task_assignments;"
supabase db query "SELECT COUNT(*) FROM task_embeddings;"
```

## Monitoring Dashboards

```sql
-- Create monitoring views
CREATE VIEW workload_overview AS
SELECT
    assignee_id,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_tasks,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_completion_time
FROM task_assignments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY assignee_id;

CREATE VIEW assignment_performance AS
SELECT
    date_trunc('day', created_at) as date,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
FROM task_assignments
GROUP BY date
ORDER BY date DESC;
```