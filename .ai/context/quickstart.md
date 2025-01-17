# Quick Start Guide: Creating Your First Agent

This guide will walk you through creating a simple AI agent that can perform tasks using external tools.

## Prerequisites
- Node.js >= 18
- pnpm
- Supabase CLI
- Composio API key
- OpenAI API key

## Step 1: Create Agent Package

```bash
# Create a new agent package
cd packages/agents
mkdir my-first-agent
cd my-first-agent

# Initialize package
pnpm init
```

## Step 2: Install Dependencies

```bash
pnpm add @squad/core @squad/agents composio-langchain langchain
```

## Step 3: Create Agent Implementation

```typescript
// src/index.ts
import { BaseAgent } from '@squad/agents';
import { ComposioToolSet, Action, App } from 'composio-langchain';
import { ChatOpenAI } from 'langchain/chat_models/openai';

export class MyFirstAgent extends BaseAgent {
  private tools: ComposioToolSet;
  private model: ChatOpenAI;

  constructor(config: AgentConfig) {
    super(config);
    
    // Initialize LLM
    this.model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    });

    // Initialize tools
    this.tools = new ComposioToolSet({
      api_key: process.env.COMPOSIO_API_KEY,
      apps: [App.GITHUB],
      logging_level: 'INFO'
    });
  }

  async executeTask(task: Task): Promise<TaskResult> {
    try {
      // Create a GitHub issue as an example
      const result = await this.tools.execute(
        Action.GITHUB_CREATE_ISSUE,
        {
          title: task.title,
          body: task.description,
          repo: task.metadata.repository
        }
      );

      return {
        status: 'completed',
        output: result,
        metadata: {
          toolUsed: 'github',
          actionType: 'create_issue'
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        metadata: {
          errorType: error.name,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
```

## Step 4: Create Configuration

```typescript
// config/agent-config.ts
export const agentConfig = {
  id: 'my-first-agent',
  name: 'GitHub Issue Creator',
  description: 'Creates GitHub issues from tasks',
  capabilities: ['github', 'issue-tracking'],
  tools: ['github'],
  constraints: {
    maxConcurrentTasks: 5,
    maxTokensPerMinute: 1000
  }
};
```

## Step 5: Test Locally

```typescript
// test/agent.test.ts
import { describe, it, expect } from 'vitest';
import { MyFirstAgent } from '../src';
import { agentConfig } from '../config/agent-config';

describe('MyFirstAgent', () => {
  it('should create a GitHub issue', async () => {
    const agent = new MyFirstAgent(agentConfig);

    const result = await agent.executeTask({
      id: 'task-1',
      title: 'Test Issue',
      description: 'This is a test issue',
      metadata: {
        repository: 'username/repo'
      }
    });

    expect(result.status).toBe('completed');
    expect(result.output).toBeDefined();
  });
});
```

## Step 6: Deploy to Supabase Edge Functions

1. Create Edge Function:
```bash
supabase functions new my-first-agent
```

2. Implement Handler:
```typescript
// supabase/functions/my-first-agent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { MyFirstAgent } from '../../../../packages/agents/my-first-agent/src';
import { agentConfig } from '../../../../packages/agents/my-first-agent/config/agent-config';

serve(async (req) => {
  const agent = new MyFirstAgent(agentConfig);
  const { task } = await req.json();

  try {
    const result = await agent.executeTask(task);
    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
```

3. Deploy:
```bash
supabase functions deploy my-first-agent
```

## Step 7: Use Your Agent

```typescript
// Example usage in your application
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Call your agent
const { data, error } = await supabase.functions.invoke('my-first-agent', {
  body: {
    task: {
      id: 'task-1',
      title: 'Important Bug',
      description: 'Found a critical bug in production',
      metadata: {
        repository: 'username/repo',
        priority: 'high'
      }
    }
  }
});

if (error) {
  console.error('Agent execution failed:', error);
} else {
  console.log('Agent result:', data);
}
```

## Next Steps

1. Add more tools to your agent
2. Implement error handling and retries
3. Add monitoring and logging
4. Set up evaluation metrics
5. Configure scaling parameters

For more detailed information, see:
- [Complete Agent Guide](./agent-guide.md)
- [Tool Integration Guide](./tool-integration.md)
- [Deployment Guide](./deployment.md)
- [Monitoring Guide](./monitoring.md)