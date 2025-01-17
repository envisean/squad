# Creating and Managing AI Agents

This guide covers the process of creating, deploying, and managing AI agents in Squad, including tool integration and scaling considerations.

## Agent Creation

### 1. Basic Agent Structure
```typescript
import { BaseAgent } from '@squad/agents';
import { ComposioToolSet, Action, App } from 'composio-langchain';

class CustomAgent extends BaseAgent {
  private tools: ComposioToolSet;
  
  constructor(config: AgentConfig) {
    super(config);
    this.tools = new ComposioToolSet({
      api_key: process.env.COMPOSIO_API_KEY,
      // Limit tools for better performance
      apps: [App.GITHUB, App.JIRA],
      // Optional: Configure execution environment
      workspace_config: {
        type: 'docker',
        resources: {
          cpu: 1,
          memory: '2Gi'
        }
      }
    });
  }

  async initialize(): Promise<void> {
    // Set up tool connections
    await this.tools.initialize();
    
    // Load agent knowledge base
    await this.loadKnowledgeBase();
    
    // Initialize evaluation framework
    await this.setupEvaluation();
  }

  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // Process task input
      const { input, context } = await this.preprocessTask(task);
      
      // Execute task with tools
      const result = await this.processWithTools(input, context);
      
      // Evaluate results
      const evaluation = await this.evaluateResult(result, task);
      
      return {
        output: result,
        evaluation,
        metadata: {
          executionTime: Date.now() - startTime,
          toolsUsed: this.getToolUsageMetrics()
        }
      };
    } catch (error) {
      await this.handleError(error, task);
      throw error;
    }
  }

  private async processWithTools(
    input: unknown, 
    context: Record<string, unknown>
  ): Promise<unknown> {
    // Example tool usage
    const githubIssue = await this.tools.execute(
      Action.GITHUB_CREATE_ISSUE,
      {
        title: 'Task from AI Agent',
        body: JSON.stringify(input),
        repo: context.repository
      }
    );

    return githubIssue;
  }
}
```

### 2. Tool Integration

#### LangChain Native Tools
```typescript
import { SerpAPI } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';

class ResearchAgent extends BaseAgent {
  private tools = [
    new SerpAPI(process.env.SERPAPI_API_KEY),
    new Calculator()
  ];
}
```

#### Composio Tools
```typescript
import { ComposioToolSet } from 'composio-langchain';

// Initialize toolset
const tools = new ComposioToolSet();

// Get specific tools
const githubTools = tools.get_tools(apps=[App.GITHUB]);
const jiraTools = tools.get_tools(apps=[App.JIRA]);

// Filter tools by tags
const developmentTools = tools.get_tools(
  tags=['development', 'code-review']
);
```

### 3. Knowledge Base Integration
```typescript
import { SupabaseVectorStore } from '@squad/integrations';

class KnowledgeableAgent extends BaseAgent {
  private vectorStore: SupabaseVectorStore;

  async loadKnowledgeBase() {
    this.vectorStore = new SupabaseVectorStore({
      tableName: 'agent_embeddings',
      queryName: 'match_documents'
    });

    await this.vectorStore.initialize();
  }

  async findRelevantContext(query: string) {
    return this.vectorStore.similaritySearch(query, 5);
  }
}
```

## Deployment and Hosting

### 1. Local Development
```bash
# Start local development environment
pnpm dev

# Run agent in development mode
pnpm run agent:dev --name=custom-agent --config=./config.json
```

### 2. Production Deployment

#### Supabase Edge Functions
```typescript
// supabase/functions/agent-runner/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { CustomAgent } from '../../../packages/agents/src/custom-agent';

serve(async (req) => {
  const agent = new CustomAgent({
    // Configuration
  });

  const { task } = await req.json();
  const result = await agent.executeTask(task);

  return new Response(
    JSON.stringify(result),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

#### Docker Deployment
```dockerfile
# Dockerfile for agent runtime
FROM node:18-alpine

WORKDIR /app
COPY . .

RUN pnpm install
RUN pnpm build

CMD ["pnpm", "run", "agent:start"]
```

## Monitoring and Management

### 1. Metrics Collection
```typescript
interface AgentMetrics {
  performance: {
    taskCompletionRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    tokenUsage: number;
  };
  tools: {
    toolUsageCount: Record<string, number>;
    toolSuccessRate: Record<string, number>;
  };
}

class MonitoredAgent extends BaseAgent {
  private metrics: AgentMetrics;

  async collectMetrics(): Promise<void> {
    // Update metrics
    this.metrics = {
      performance: await this.getPerformanceMetrics(),
      resources: await this.getResourceMetrics(),
      tools: await this.getToolMetrics()
    };

    // Store metrics in Supabase
    await this.storeMetrics(this.metrics);
  }
}
```

### 2. Logging and Debugging
```typescript
import { createLogger } from '@squad/core';

const logger = createLogger({
  level: 'debug',
  format: 'json',
  storage: {
    type: 'supabase',
    table: 'agent_logs'
  }
});

class LoggedAgent extends BaseAgent {
  async executeTask(task: Task): Promise<TaskResult> {
    logger.info('Starting task execution', { taskId: task.id });
    
    try {
      const result = await super.executeTask(task);
      logger.info('Task completed successfully', { 
        taskId: task.id,
        resultId: result.id 
      });
      return result;
    } catch (error) {
      logger.error('Task execution failed', {
        taskId: task.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
```

## Scaling Considerations

### 1. Horizontal Scaling
```typescript
interface AgentPoolConfig {
  minInstances: number;
  maxInstances: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

class AgentPool {
  private agents: Map<string, BaseAgent> = new Map();
  private config: AgentPoolConfig;

  async scaleUp(): Promise<void> {
    if (this.agents.size >= this.config.maxInstances) return;

    const newAgent = await this.createAgent();
    this.agents.set(newAgent.id, newAgent);
  }

  async scaleDown(): Promise<void> {
    if (this.agents.size <= this.config.minInstances) return;

    const idleAgent = this.findIdleAgent();
    if (idleAgent) {
      await idleAgent.cleanup();
      this.agents.delete(idleAgent.id);
    }
  }

  private findIdleAgent(): BaseAgent | null {
    // Find agent with no active tasks
    return Array.from(this.agents.values())
      .find(agent => agent.status === 'idle');
  }
}
```

### 2. Resource Management
```typescript
interface ResourceLimits {
  maxConcurrentTasks: number;
  maxMemoryUsage: number;
  maxTokensPerMinute: number;
}

class ResourceManagedAgent extends BaseAgent {
  private limits: ResourceLimits;
  private currentUsage: {
    tasks: number;
    memory: number;
    tokens: number;
  };

  async canAcceptTask(task: Task): Promise<boolean> {
    if (this.currentUsage.tasks >= this.limits.maxConcurrentTasks) {
      return false;
    }

    const estimatedMemory = await this.estimateMemoryUsage(task);
    if (this.currentUsage.memory + estimatedMemory > this.limits.maxMemoryUsage) {
      return false;
    }

    return true;
  }

  private async estimateMemoryUsage(task: Task): Promise<number> {
    // Implement memory estimation logic
    return 0;
  }
}
```

## Testing

### 1. Unit Testing
```typescript
import { describe, it, expect } from 'vitest';
import { CustomAgent } from './custom-agent';

describe('CustomAgent', () => {
  it('should execute task successfully', async () => {
    const agent = new CustomAgent({
      // Test configuration
    });

    const result = await agent.executeTask({
      id: 'test-1',
      input: 'Test input',
      type: 'test'
    });

    expect(result.status).toBe('completed');
    expect(result.output).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const agent = new CustomAgent({
      // Test configuration with invalid tools
    });

    await expect(
      agent.executeTask({
        id: 'test-2',
        input: 'Invalid input',
        type: 'test'
      })
    ).rejects.toThrow();
  });
});
```

### 2. Integration Testing
```typescript
import { TestEnvironment } from '@squad/testing';

describe('Agent Integration', () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = await TestEnvironment.create({
      supabase: true,
      tools: ['github', 'jira'],
      vectorStore: true
    });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('should interact with external services', async () => {
    const agent = new CustomAgent({
      tools: env.getMockedTools()
    });

    const result = await agent.executeTask({
      id: 'test-3',
      input: 'Create a GitHub issue',
      type: 'github'
    });

    expect(result.status).toBe('completed');
    expect(env.getMockedCalls('github')).toHaveLength(1);
  });
});
```

## Best Practices

1. **Tool Management**:
   - Limit the number of tools per agent (< 20 for optimal performance)
   - Use tool filtering and tagging for better organization
   - Implement proper error handling for tool failures

2. **Resource Optimization**:
   - Implement proper cleanup in agent lifecycle
   - Use connection pooling for database operations
   - Cache frequently accessed data

3. **Monitoring**:
   - Set up comprehensive logging
   - Track key performance metrics
   - Implement alerting for critical issues

4. **Security**:
   - Use proper authentication for all tool connections
   - Implement rate limiting
   - Validate all inputs
   - Use secure token storage

5. **Scaling**:
   - Design agents to be stateless when possible
   - Implement proper resource management
   - Use horizontal scaling for increased load
   - Consider using agent pools for better resource utilization