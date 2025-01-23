# Squad AI Platform Codex

## Architecture Overview

### Core Concepts

1. **Agent Types**
   ```typescript
   interface StrategicAgent {
     type: 'strategic';
     capabilities: {
       reasoning: boolean;    // Complex decision making
       planning: boolean;     // Task planning and delegation
       conversation: boolean; // Natural dialogue
       memory: boolean;       // Context retention
     };
   }

   interface JobAgent {
     type: 'job';
     jobType: string;        // Specific task type
     inputSchema: Schema;    // Expected input format
     outputSchema: Schema;   // Expected output format
     constraints: {
       maxRuntime?: number;
       retryLimit?: number;
       rateLimit?: number;
     };
   }
   ```

2. **Memory System**
   ```typescript
   interface MemorySystem {
     shortTerm: {
       type: 'buffer';
       implementation: 'LangChain.ConversationBufferWindowMemory';
       purpose: 'Recent context retention';
     };
     workingMemory: {
       type: 'summary';
       implementation: 'LangChain.ConversationSummaryMemory';
       purpose: 'Active task context';
     };
     longTerm: {
       type: 'vector';
       implementation: 'Supabase.pgvector';
       purpose: 'Semantic search and retrieval';
     };
     episodic: {
       type: 'vector';
       implementation: 'LangChain.VectorStoreRetrieverMemory';
       purpose: 'Important events and patterns';
     };
   }
   ```

3. **Tool Integration**
   ```typescript
   interface ToolSystem {
     native: {
       type: 'LangChain';
       tools: ['SerpAPI', 'Calculator', 'WebBrowser'];
     };
     external: {
       type: 'Composio';
       maxTools: 20;  // Optimal limit for performance
       categories: [
         'development',
         'communication',
         'data-processing',
         'automation'
       ];
     };
     custom: {
       type: 'internal';
       implementation: 'ToolDefinition';
     };
   }
   ```

### Infrastructure

1. **Database (Supabase)**
   ```sql
   -- Core Tables
   agents
   agent_states
   tasks
   task_results
   
   -- Memory Tables
   memory_embeddings (pgvector)
   working_memory
   episodic_memory
   
   -- Monitoring Tables
   agent_metrics
   agent_logs
   performance_data
   ```

2. **API Layer**
   ```typescript
   interface APIStructure {
     rest: {
       base: '/api/v1';
       endpoints: {
         agents: '/agents';
         tasks: '/tasks';
         memory: '/memory';
         monitoring: '/monitoring';
       };
     };
     websocket: {
       events: [
         'agent:status',
         'task:update',
         'memory:change',
         'metrics:update'
       ];
     };
   }
   ```

3. **Deployment**
   ```yaml
   infrastructure:
     edge_functions:
       - agent-runner
       - task-processor
       - memory-consolidator
     vector_store:
       type: pgvector
       indexes:
         - type: hnsw
           m: 16
           ef_construction: 64
     realtime:
       enabled: true
       channels:
         - agent-status
         - task-updates
         - monitoring
   ```

## Implementation Guidelines

### 1. Agent Development

```typescript
// Base Pattern for Strategic Agents
abstract class BaseStrategicAgent {
  protected memory: EnhancedMemoryManager;
  protected tools: ComposioToolSet;
  protected monitor: AgentMonitor;

  abstract async plan(input: unknown): Promise<ExecutionPlan>;
  abstract async execute(plan: ExecutionPlan): Promise<unknown>;
  abstract async evaluate(result: unknown): Promise<EvaluationResult>;
}

// Base Pattern for Job Agents
abstract class BaseJobAgent {
  protected tools: ComposioToolSet;
  protected monitor: AgentMonitor;

  abstract async validateInput(input: unknown): Promise<boolean>;
  abstract async process(input: unknown): Promise<unknown>;
  abstract async handleError(error: Error): Promise<void>;
}
```

### 2. Memory Management

```typescript
// Memory Access Patterns
interface MemoryAccess {
  shortTerm: {
    retention: '30 minutes';
    access: 'in-memory';
    cleanup: 'automatic';
  };
  working: {
    retention: '24 hours';
    access: 'database';
    cleanup: 'manual';
  };
  longTerm: {
    retention: 'permanent';
    access: 'vector-search';
    cleanup: 'consolidation';
  };
}

// Memory Consolidation Strategy
interface ConsolidationStrategy {
  triggers: {
    threshold: 50;    // entries
    interval: 3600;   // seconds
    importance: 0.7;  // minimum score
  };
  process: {
    1: 'collect_entries';
    2: 'generate_summary';
    3: 'create_embedding';
    4: 'store_consolidated';
    5: 'cleanup_original';
  };
}
```

### 3. Monitoring and Observability

```typescript
// Metric Collection
interface MetricCollection {
  types: {
    performance: [
      'response_time',
      'token_usage',
      'memory_usage',
      'error_rate'
    ];
    quality: [
      'task_success_rate',
      'decision_accuracy',
      'context_relevance'
    ];
    resource: [
      'cpu_usage',
      'memory_usage',
      'vector_store_size',
      'database_operations'
    ];
  };
  intervals: {
    realtime: 10;    // seconds
    rollup: 300;     // 5 minutes
    retention: 2592000; // 30 days
  };
}

// Logging Strategy
interface LoggingStrategy {
  levels: ['debug', 'info', 'warn', 'error', 'critical'];
  contexts: {
    agent: ['status', 'decision', 'action'];
    memory: ['access', 'consolidation', 'cleanup'];
    task: ['creation', 'execution', 'completion'];
    system: ['health', 'performance', 'security'];
  };
  storage: {
    hot: '24h';    // Immediate access
    warm: '7d';    // Quick access
    cold: '30d+';  // Archived
  };
}
```

### 4. Security and Access Control

```typescript
interface SecurityModel {
  authentication: {
    methods: ['JWT', 'API Key'];
    roles: ['admin', 'agent', 'monitor'];
  };
  authorization: {
    agent: {
      create: ['admin'];
      manage: ['admin'];
      monitor: ['admin', 'monitor'];
    };
    memory: {
      read: ['admin', 'agent'];
      write: ['admin', 'agent'];
      delete: ['admin'];
    };
    tasks: {
      create: ['admin', 'agent'];
      execute: ['agent'];
      monitor: ['admin', 'monitor'];
    };
  };
}
```

## Development Workflow

### 1. Creating New Agents

```typescript
// 1. Define Agent Type
interface CustomAgent extends StrategicAgent {
  capabilities: string[];
  tools: Tool[];
}

// 2. Implement Core Logic
class CustomAgentImpl extends BaseStrategicAgent {
  async plan(input: unknown): Promise<ExecutionPlan> {
    // Planning logic
  }
  
  async execute(plan: ExecutionPlan): Promise<unknown> {
    // Execution logic
  }
}

// 3. Add Monitoring
class MonitoredCustomAgent extends CustomAgentImpl {
  @monitor('agent:execution')
  async execute(plan: ExecutionPlan): Promise<unknown> {
    return super.execute(plan);
  }
}
```

### 2. Adding New Tools

```typescript
// 1. Define Tool Interface
interface CustomTool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute(params: unknown): Promise<unknown>;
}

// 2. Implement Tool
class CustomToolImpl implements CustomTool {
  @validate('tool:params')
  async execute(params: unknown): Promise<unknown> {
    // Tool logic
  }
}

// 3. Register Tool
toolRegistry.register(new CustomToolImpl());
```

### 3. Memory Operations

```typescript
// 1. Memory Access
const memory = new EnhancedMemoryManager(config);

// 2. Store Memory
await memory.saveMemory({
  content: "Important information",
  type: "episodic",
  metadata: { importance: 0.8 }
});

// 3. Query Memory
const relevant = await memory.queryMemories({
  content: "search terms",
  type: "longTerm",
  similarity: 0.7
});
```

### 4. Monitoring Integration

```typescript
// 1. Set Up Monitoring
const monitor = new AgentMonitor(config);

// 2. Track Metrics
monitor.trackMetric('response_time', 150);

// 3. Log Events
monitor.log({
  level: 'info',
  category: 'agent',
  message: 'Task completed',
  metadata: { taskId: '123' }
});
```

## Best Practices

1. **Agent Design**
   - Clear separation between strategic and job agents
   - Explicit capability definitions
   - Proper error handling and recovery
   - Memory usage optimization

2. **Memory Management**
   - Regular consolidation of short-term memory
   - Efficient vector search implementations
   - Proper cleanup of old memories
   - Context relevance scoring

3. **Tool Integration**
   - Limited tool set per agent (< 20)
   - Clear input/output schemas
   - Proper error handling
   - Rate limiting and quotas

4. **Monitoring**
   - Comprehensive metric collection
   - Structured logging
   - Performance tracking
   - Alert configuration

5. **Security**
   - Proper authentication
   - Fine-grained authorization
   - Secure configuration
   - Audit logging

## Future Considerations

### Edge Function Build Strategies

As the project grows, we might want to consider these approaches for edge function builds:

1. **Current Approach (v1)**
   - Agent-specific builds using dedicated entry points
   - Manual dependency management
   - Direct Supabase function deployment

2. **Future Approach (v2)**
   - Dynamic entry point generation
   - Automated dependency analysis
   - Build config generator that:
     - Analyzes agent dependencies
     - Creates optimized bundles
     - Manages shared code
     - Handles tree-shaking
     - Supports multiple deployment targets

3. **Advanced Features to Consider**
   - Build-time code splitting
   - Shared module federation
   - Cross-agent optimizations
   - Platform-specific builds (Supabase/Vercel/etc)
   - Automated dependency auditing

# Squad AI Development Guidelines

## Edge Function Dependencies

### Critical Lessons for Deno/Edge Functions

1. **Version Management in Edge Functions**
   - When using dependencies in Supabase Edge Functions (Deno), prefer using `npm:` imports over `esm.sh`
   - Example:
     ```typescript
     // Prefer this:
     import { OpenAIEmbeddings } from "npm:@langchain/openai@0.3.17";
     
     // Over this:
     import { OpenAIEmbeddings } from "https://esm.sh/@langchain/openai@0.3.17";
     ```

2. **Dependency Resolution**
   - Each edge function should have its own `deno.jsonc` file in its directory
   - Supabase's documentation about sharing a single deno.json in the functions directory may not work reliably
   - Always explicitly version dependencies to avoid runtime issues

3. **Troubleshooting Dependencies**
   - If encountering missing exports or version conflicts:
     1. Check if the dependency needs to be pinned to a specific version
     2. Consider switching from `esm.sh` to `npm:` imports
     3. Verify the dependency works in the Deno environment

[Source: LangChain Issue #1418](https://github.com/langchain-ai/langsmith-sdk/issues/1418)

## Best Practices

1. **Local Development**
   - Test edge functions locally before deployment
   - Use `supabase functions serve` to verify dependency resolution
   - Monitor Supabase logs for dependency-related errors

2. **Dependency Management**
   - Keep dependencies consistent between local and edge environments
   - Document known working versions in package.json
   - Consider using a deps.ts file for Deno dependencies

3. **Monitoring and Debugging**
   - Set up proper error logging
   - Monitor edge function boot times
   - Track dependency-related failures

## Project Structure

...

## Building and Deploying Edge Functions

### Agent-Specific Edge Functions

Each agent that needs to run in an edge function requires two steps:

1. **Building**
```bash
pnpm build:agent sales-prospecting
```

This will:
- Create an optimized build for just the sales-prospecting agent
- Bundle only required dependencies
- Copy the bundle to supabase/functions/sales-prospecting/dist/

2. **Deploying**
```bash
pnpm deploy:agent sales-prospecting
```

This will:
- Deploy the edge function to Supabase
- Use the agent-specific configuration in deno.jsonc
- Handle environment variables and secrets

### Development Workflow

1. Make changes to agent code in `packages/agents/src/agents/[agent-name]`
2. Test locally using `supabase functions serve [agent-name]`
3. Build the agent using `pnpm build:agent [agent-name]`
4. Deploy using `pnpm deploy:agent [agent-name]`

### Troubleshooting Deployments

Common issues and solutions:

1. **Build Failures**
   - Check the agent's dependencies
   - Verify external/noExternal settings in tsup config
   - Use `--verbose` flag: `pnpm build:agent [agent-name] --verbose`

2. **Deploy Failures**
   - Ensure Supabase CLI is logged in
   - Check function size limits
   - Verify environment variables are set
   - Look for version conflicts in deno.jsonc

3. **Runtime Errors**
   - Check Supabase function logs
   - Verify all imports are Deno-compatible
   - Test locally before deployment

## Scripts

### Agent Build and Deploy Scripts

The project includes several scripts for managing agent builds and deployments:

1. **Build Scripts**
```bash
# Build a specific agent
pnpm build:agent sales-prospecting

# Clean edge function builds
pnpm clean:edge
```

2. **Deploy Scripts**
```bash
# Deploy a specific agent
pnpm deploy:agent sales-prospecting
```

### How the Build Process Works

1. `build:agent [name]`:
   - Creates an agent-specific tsup config
   - Bundles only the required agent code and dependencies
   - Optimizes the bundle for edge deployment
   - Copies the bundle to the appropriate Supabase function directory

2. `deploy:agent [name]`:
   - Validates the agent exists
   - Uses Supabase CLI to deploy the function
   - Handles environment variables and configuration

3. `clean:edge`:
   - Removes all edge function builds
   - Useful when you need a fresh start

### Best Practices

1. **Build Process**
   - Always build before deploying
   - Test locally using `supabase functions serve`
   - Check bundle sizes with `--verbose` flag

2. **Deployment**
   - Verify environment variables are set
   - Test the function locally first
   - Monitor deployment logs