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

1. **Scalability**
   - Agent pool management
   - Distributed task processing
   - Vector store sharding
   - Memory federation

2. **Integration**
   - Additional LLM providers
   - More tool integrations
   - External system connections
   - API extensions

3. **Features**
   - Agent collaboration
   - Learning from feedback
   - Advanced memory models
   - Custom tool development

4. **Optimization**
   - Response time improvement
   - Resource usage optimization
   - Cost management
   - Performance tuning