# Sales Prospecting Agent Deployment Guide

This guide covers the deployment process for the Sales Prospecting agent, including infrastructure setup, API integrations, and monitoring.

## Prerequisites

- Supabase project with pgvector enabled
- LinkedIn API credentials
- Clearbit API key
- Apollo API key
- Salesforce API credentials
- OpenAI API key
- Composio API key

## Infrastructure Setup

### 1. Supabase Configuration

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables for prospect data
CREATE TABLE prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT,
    company TEXT,
    linkedin_url TEXT,
    email TEXT,
    status TEXT DEFAULT 'new',
    score FLOAT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for prospect embeddings
CREATE TABLE prospect_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for outreach campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    template_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for campaign results
CREATE TABLE campaign_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    prospect_id UUID REFERENCES prospects(id),
    status TEXT DEFAULT 'pending',
    response_type TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX prospect_embeddings_idx ON prospect_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX prospects_status_idx ON prospects(status);
CREATE INDEX campaign_results_status_idx ON campaign_results(status);
```

### 2. Edge Function Setup

```bash
# Create Edge Function
supabase functions new prospecting-agent

# Deploy with secrets
supabase secrets set --env-file ./config/.env.production

# Deploy function
supabase functions deploy prospecting-agent
```

## API Integration Setup

### 1. LinkedIn API Configuration

```typescript
// config/linkedin-config.ts
export const linkedinConfig = {
  api: {
    version: 'v2',
    scopes: [
      'r_emailaddress',
      'r_liteprofile',
      'w_member_social',
      'r_organization_social'
    ],
    credentials: {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET
    }
  },
  rate_limits: {
    requests_per_day: 100000,
    requests_per_second: 100
  }
};
```

### 2. Salesforce Integration

```typescript
// config/salesforce-config.ts
export const salesforceConfig = {
  auth: {
    loginUrl: process.env.SALESFORCE_LOGIN_URL,
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: process.env.SALESFORCE_REDIRECT_URI
  },
  mappings: {
    prospect_to_lead: {
      name: 'Name',
      title: 'Title',
      company: 'Company',
      email: 'Email',
      linkedin_url: 'LinkedIn_URL__c'
    }
  }
};
```

### 3. Email Integration

```typescript
// config/email-config.ts
export const emailConfig = {
  provider: 'gmail',
  auth: {
    type: 'oauth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN
  },
  limits: {
    daily_emails: 500,
    batch_size: 50
  }
};
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
  LINKEDIN_CLIENT_ID=... \
  LINKEDIN_CLIENT_SECRET=... \
  CLEARBIT_API_KEY=... \
  APOLLO_API_KEY=... \
  SALESFORCE_CLIENT_ID=... \
  SALESFORCE_CLIENT_SECRET=... \
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

4. **Deploy Edge Functions**
```bash
# Deploy function
supabase functions deploy prospecting-agent

# Test deployment
curl -X POST "https://[PROJECT_REF].supabase.co/functions/v1/prospecting-agent" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"action": "test"}'
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
    prospects_found: true,
    enrichment_success_rate: true,
    campaign_performance: true
  }
};
```

### 2. Performance Monitoring

```sql
-- Create monitoring views
CREATE VIEW prospecting_performance AS
SELECT
    date_trunc('day', created_at) as date,
    COUNT(*) as prospects_found,
    AVG(score) as average_score,
    COUNT(email) * 100.0 / COUNT(*) as email_found_rate
FROM prospects
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

CREATE VIEW campaign_performance AS
SELECT
    c.name as campaign_name,
    COUNT(cr.id) as total_prospects,
    COUNT(CASE WHEN cr.response_type = 'positive' THEN 1 END) as positive_responses,
    COUNT(CASE WHEN cr.response_type = 'meeting_booked' THEN 1 END) as meetings_booked
FROM campaigns c
LEFT JOIN campaign_results cr ON c.id = cr.campaign_id
GROUP BY c.id, c.name;
```

### 3. Alert Configuration

```typescript
// config/alert-config.ts
export const alertConfig = {
  thresholds: {
    error_rate: 0.1, // Alert if error rate exceeds 10%
    enrichment_failure: 0.2, // Alert if enrichment fails for >20% of prospects
    response_rate_drop: 0.5 // Alert if response rate drops by 50%
  },
  channels: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#prospecting-alerts'
    },
    email: ['sales-ops@company.com']
  }
};
```

## Scaling Configuration

```typescript
// config/scaling-config.ts
export const scalingConfig = {
  prospecting: {
    batch_size: 50, // Prospects per batch
    concurrent_batches: 3,
    rate_limits: {
      linkedin: 100, // requests per minute
      clearbit: 600, // requests per minute
      apollo: 300 // requests per minute
    }
  },
  enrichment: {
    retry_attempts: 3,
    backoff_factor: 1.5,
    timeout: 30000 // 30 seconds
  },
  campaigns: {
    max_active: 5,
    prospects_per_campaign: 200,
    daily_email_limit: 500
  }
};
```

## Maintenance Procedures

### 1. Data Maintenance

```sql
-- Clean up old data
DELETE FROM prospect_embeddings 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Archive old campaigns
UPDATE campaigns 
SET status = 'archived' 
WHERE updated_at < NOW() - INTERVAL '30 days' 
AND status = 'completed';

-- Update statistics
ANALYZE prospects;
ANALYZE prospect_embeddings;
ANALYZE campaign_results;
```

### 2. API Token Rotation

```typescript
// scripts/rotate-tokens.ts
async function rotateAPITokens() {
  // Rotate LinkedIn token
  await rotateLinkedInToken();
  
  // Rotate Salesforce token
  await rotateSalesforceToken();
  
  // Update secrets
  await updateSupabaseSecrets();
}
```

### 3. Performance Optimization

```sql
-- Optimize vector store
VACUUM ANALYZE prospect_embeddings;

-- Update statistics
ANALYZE prospects;
ANALYZE campaign_results;

-- Clean up unused embeddings
DELETE FROM prospect_embeddings pe
WHERE NOT EXISTS (
    SELECT 1 FROM prospects p 
    WHERE p.id = pe.prospect_id
);
```

## Error Handling

### 1. API Failures

```typescript
// error/api-handler.ts
export async function handleAPIError(error: Error, context: any) {
  if (error.name === 'RateLimitError') {
    await handleRateLimit(context);
  } else if (error.name === 'AuthenticationError') {
    await refreshTokens(context);
  } else {
    await logError(error, context);
  }
}
```

### 2. Data Quality Issues

```typescript
// validation/data-quality.ts
export async function validateProspectData(prospect: any) {
  const issues = [];
  
  if (!isValidEmail(prospect.email)) {
    issues.push('Invalid email');
  }
  
  if (!isValidLinkedIn(prospect.linkedin_url)) {
    issues.push('Invalid LinkedIn URL');
  }
  
  return issues;
}
```

### 3. Campaign Failures

```typescript
// error/campaign-handler.ts
export async function handleCampaignError(error: Error, campaign: any) {
  // Pause campaign
  await pauseCampaign(campaign.id);
  
  // Notify team
  await notifyTeam(error, campaign);
  
  // Log error
  await logCampaignError(error, campaign);
}
```

## Health Checks

```typescript
// health/checks.ts
export async function checkHealth() {
  const checks = [
    checkAPIConnections(),
    checkDatabaseConnection(),
    checkVectorStore(),
    checkEmailService(),
    checkEnrichmentServices()
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
# Backup prospect data
supabase db dump -t prospects > prospects_backup.sql

# Backup campaign data
supabase db dump -t campaigns,campaign_results > campaigns_backup.sql

# Backup embeddings
supabase db dump -t prospect_embeddings > embeddings_backup.sql
```

### 2. Recovery Procedures

```bash
# Restore from backup
supabase db restore < backup.sql

# Rebuild indexes
supabase db query "REINDEX TABLE prospect_embeddings;"

# Verify data
supabase db query "SELECT COUNT(*) FROM prospects;"
supabase db query "SELECT COUNT(*) FROM prospect_embeddings;"
```

## Monitoring Dashboards

```sql
-- Create monitoring views
CREATE VIEW prospecting_metrics AS
SELECT
    date_trunc('hour', created_at) as time_bucket,
    COUNT(*) as prospects_found,
    AVG(score) as avg_score,
    COUNT(NULLIF(email, '')) * 100.0 / COUNT(*) as email_success_rate
FROM prospects
GROUP BY time_bucket
ORDER BY time_bucket DESC;

CREATE VIEW campaign_metrics AS
SELECT
    c.name as campaign_name,
    COUNT(cr.id) as total_prospects,
    COUNT(CASE WHEN cr.response_type = 'positive' THEN 1 END) * 100.0 / COUNT(cr.id) as response_rate,
    COUNT(CASE WHEN cr.response_type = 'meeting_booked' THEN 1 END) as meetings_booked
FROM campaigns c
LEFT JOIN campaign_results cr ON c.id = cr.campaign_id
GROUP BY c.id, c.name;
```