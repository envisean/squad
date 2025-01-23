# Squad AI Platform Codex

## AI Code Generation Process

### Overview

When generating code with AI assistance, follow this structured process to ensure consistent, high-quality results:

1. **Define Specifications**

   - Create a clear problem statement
   - Document requirements and constraints
   - Identify integration points with existing systems
   - List expected inputs and outputs

2. **Document Session**

   - Create a new session file: `.ai/sessions/YYYY-MM-DD_task_name.md`
   - Include:
     - Original requirements
     - Key decisions and rationale
     - Code snippets and iterations
     - Test results and feedback

3. **Iterative Development**

   ```typescript
   interface AICodeGenProcess {
     steps: {
       1: 'Break down into small, testable milestones'
       2: 'Generate initial code with AI assistance'
       3: 'Review and test with human oversight'
       4: 'Document feedback and iterations'
       5: 'Evaluate impact and performance'
     }
     bestPractices: {
       askClarifyingQuestions: true // Ensure full understanding
       provideContext: true // Share relevant existing code
       validateAssumptions: true // Confirm approach
       documentDecisions: true // Record key choices
     }
   }
   ```

4. **Quality Checks**

   - Verify adherence to project patterns
   - Ensure proper error handling
   - Confirm test coverage
   - Review performance implications

5. **Integration**
   - Document integration points
   - Update relevant tests
   - Add monitoring if needed
   - Update documentation

## Architecture Overview

### Core Concepts

1. **Agent Types**

   ```typescript
   interface StrategicAgent {
     type: 'strategic'
     capabilities: {
       reasoning: boolean // Complex decision making
       planning: boolean // Task planning and delegation
       conversation: boolean // Natural dialogue
       memory: boolean // Context retention
     }
   }

   interface JobAgent {
     type: 'job'
     jobType: string // Specific task type
     inputSchema: Schema // Expected input format
     outputSchema: Schema // Expected output format
     constraints: {
       maxRuntime?: number
       retryLimit?: number
       rateLimit?: number
     }
   }
   ```

2. **Memory System**

   ```typescript
   interface MemorySystem {
     shortTerm: {
       type: 'buffer'
       implementation: 'LangChain.ConversationBufferWindowMemory'
       purpose: 'Recent context retention'
     }
     workingMemory: {
       type: 'summary'
       implementation: 'LangChain.ConversationSummaryMemory'
       purpose: 'Active task context'
     }
     longTerm: {
       type: 'vector'
       implementation: 'Supabase.pgvector'
       purpose: 'Semantic search and retrieval'
     }
     episodic: {
       type: 'vector'
       implementation: 'LangChain.VectorStoreRetrieverMemory'
       purpose: 'Important events and patterns'
     }
   }
   ```

3. **Tool Integration**
   ```typescript
   interface ToolSystem {
     native: {
       type: 'LangChain'
       tools: ['SerpAPI', 'Calculator', 'WebBrowser']
     }
     external: {
       type: 'Composio'
       maxTools: 20 // Optimal limit for performance
       categories: ['development', 'communication', 'data-processing', 'automation']
     }
     custom: {
       type: 'internal'
       implementation: 'ToolDefinition'
     }
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
       base: '/api/v1'
       endpoints: {
         agents: '/agents'
         tasks: '/tasks'
         memory: '/memory'
         monitoring: '/monitoring'
       }
     }
     websocket: {
       events: ['agent:status', 'task:update', 'memory:change', 'metrics:update']
     }
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
  protected memory: EnhancedMemoryManager
  protected tools: ComposioToolSet
  protected monitor: AgentMonitor

  abstract async plan(input: unknown): Promise<ExecutionPlan>
  abstract async execute(plan: ExecutionPlan): Promise<unknown>
  abstract async evaluate(result: unknown): Promise<EvaluationResult>
}

// Base Pattern for Job Agents
abstract class BaseJobAgent {
  protected tools: ComposioToolSet
  protected monitor: AgentMonitor

  abstract async validateInput(input: unknown): Promise<boolean>
  abstract async process(input: unknown): Promise<unknown>
  abstract async handleError(error: Error): Promise<void>
}
```

### 2. Memory Management

```typescript
// Memory Access Patterns
interface MemoryAccess {
  shortTerm: {
    retention: '30 minutes'
    access: 'in-memory'
    cleanup: 'automatic'
  }
  working: {
    retention: '24 hours'
    access: 'database'
    cleanup: 'manual'
  }
  longTerm: {
    retention: 'permanent'
    access: 'vector-search'
    cleanup: 'consolidation'
  }
}

// Memory Consolidation Strategy
interface ConsolidationStrategy {
  triggers: {
    threshold: 50 // entries
    interval: 3600 // seconds
    importance: 0.7 // minimum score
  }
  process: {
    1: 'collect_entries'
    2: 'generate_summary'
    3: 'create_embedding'
    4: 'store_consolidated'
    5: 'cleanup_original'
  }
}
```

### 3. Monitoring and Observability

```typescript
// Metric Collection
interface MetricCollection {
  types: {
    performance: ['response_time', 'token_usage', 'memory_usage', 'error_rate']
    quality: ['task_success_rate', 'decision_accuracy', 'context_relevance']
    resource: ['cpu_usage', 'memory_usage', 'vector_store_size', 'database_operations']
  }
  intervals: {
    realtime: 10 // seconds
    rollup: 300 // 5 minutes
    retention: 2592000 // 30 days
  }
}

// Logging Strategy
interface LoggingStrategy {
  levels: ['debug', 'info', 'warn', 'error', 'critical']
  contexts: {
    agent: ['status', 'decision', 'action']
    memory: ['access', 'consolidation', 'cleanup']
    task: ['creation', 'execution', 'completion']
    system: ['health', 'performance', 'security']
  }
  storage: {
    hot: '24h' // Immediate access
    warm: '7d' // Quick access
    cold: '30d+' // Archived
  }
}
```

### 4. Security and Access Control

```typescript
interface SecurityModel {
  authentication: {
    methods: ['JWT', 'API Key']
    roles: ['admin', 'agent', 'monitor']
  }
  authorization: {
    agent: {
      create: ['admin']
      manage: ['admin']
      monitor: ['admin', 'monitor']
    }
    memory: {
      read: ['admin', 'agent']
      write: ['admin', 'agent']
      delete: ['admin']
    }
    tasks: {
      create: ['admin', 'agent']
      execute: ['agent']
      monitor: ['admin', 'monitor']
    }
  }
}
```

## Development Workflow

### 1. Creating New Agents

```typescript
// 1. Define Agent Type
interface CustomAgent extends StrategicAgent {
  capabilities: string[]
  tools: Tool[]
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
    return super.execute(plan)
  }
}
```

### 2. Adding New Tools

```typescript
// 1. Define Tool Interface
interface CustomTool {
  name: string
  description: string
  parameters: z.ZodSchema
  execute(params: unknown): Promise<unknown>
}

// 2. Implement Tool
class CustomToolImpl implements CustomTool {
  @validate('tool:params')
  async execute(params: unknown): Promise<unknown> {
    // Tool logic
  }
}

// 3. Register Tool
toolRegistry.register(new CustomToolImpl())
```

### 3. Memory Operations

```typescript
// 1. Memory Access
const memory = new EnhancedMemoryManager(config)

// 2. Store Memory
await memory.saveMemory({
  content: 'Important information',
  type: 'episodic',
  metadata: { importance: 0.8 },
})

// 3. Query Memory
const relevant = await memory.queryMemories({
  content: 'search terms',
  type: 'longTerm',
  similarity: 0.7,
})
```

### 4. Monitoring Integration

```typescript
// 1. Set Up Monitoring
const monitor = new AgentMonitor(config)

// 2. Track Metrics
monitor.trackMetric('response_time', 150)

// 3. Log Events
monitor.log({
  level: 'info',
  category: 'agent',
  message: 'Task completed',
  metadata: { taskId: '123' },
})
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

## Agent Organization & Development

### Directory Structure

Agents should be organized by their domain in `packages/agents/src/`:

```
packages/agents/src/
├── document-agents/     # Document processing, summarization
├── sales-agents/       # Sales, prospecting, CRM
├── email-agents/       # Email processing, responses
├── search-agents/      # Search and retrieval
└── orchestrators/      # High-level coordination
```

Each domain directory should:

1. Have a clear, single responsibility
2. Use Zod for schema validation
3. Follow consistent file structure:
   ```
   domain-agents/
   ├── types.ts         # Zod schemas & types
   ├── index.ts         # Main agent implementation
   ├── processors/      # Domain-specific processors
   └── utils/           # Helper functions
   ```

### Agent Types

1. **Orchestrator Agents**

   - Strategic, high-level agents that coordinate other agents
   - Not deployed as edge functions
   - Handle complex workflows and decision-making
   - Example: `pnpm build:orchestrator task-manager`

2. **Domain Agents**

   - Specialized agents for specific business domains
   - Typically deployed as edge functions
   - Single responsibility principle
   - Example: `pnpm build:agent search-agent`

3. **Legacy Agents**
   - Existing agents pending migration
   - Maintained for backwards compatibility
   - Example: `pnpm build:legacy sales-prospecting`

### Build Commands

```bash
# Build domain agent (auto-discovers location)
pnpm build:agent sales-prospecting     # Searches all *-agents directories

# Build domain agent (explicit path)
pnpm build:agent sales-agents/sales-prospecting  # Uses specific domain

# Build orchestrator agent
pnpm build:orchestrator marketing-manager        # Searches in orchestrators/
```

The build system will:

1. For domain agents:
   - Search all `*-agents` directories if no domain specified
   - Use explicit domain if provided (e.g., `sales-agents/agent-name`)
   - Error if multiple matches found, showing possible locations
2. For orchestrators:
   - Search only in the `orchestrators/` directory
3. For legacy agents:
   - Fall back to `agents/` directory as last resort

**Directory Structure:**

```
packages/agents/src/
├── orchestrators/     # High-level coordination agents
├── *-agents/         # Domain-specific agent directories
│   ├── sales-agents/
│   ├── document-agents/
│   └── etc...
└── agents/           # Legacy agents (to be migrated)
```

### Development Workflow

1. **Local Development**

   ```typescript
   // Create test script
   import { YourAgent } from '@squad/agents/domain/your-domain/your-agent'

   const agent = new YourAgent({
     // configuration
   })

   const result = await agent.processTask({
     type: 'task-type',
     id: 'test-1',
     input: {
       // task input
     },
   })
   ```

2. **Testing**

   ```bash
   # Run test script
   pnpm tsx scripts/test-your-agent.ts

   # Run with specific input
   pnpm tsx scripts/test-your-agent.ts "your test input"
   ```

3. **Deployment**
   ```bash
   # Build and deploy
   pnpm build:agent your-agent
   pnpm deploy:agent your-agent
   ```

### Best Practices

1. **Agent Design**

   - One agent, one responsibility
   - Clear domain boundaries
   - Explicit dependencies
   - Proper error handling

2. **Edge Function Optimization**

   - Keep bundles small
   - Minimize cold starts
   - Use appropriate imports:

     ```typescript
     // Standard packages
     import { z } from 'npm:zod@3.22.4'

     // LangChain ecosystem
     import { OpenAIEmbeddings } from 'https://esm.sh/v135/@langchain/openai@0.3.17'
     ```

Why? LangChain's ecosystem is rapidly evolving and sometimes requires specific version pinning for ESM compatibility in Deno.

3. **Testing & Validation**

   - Create comprehensive test scripts
   - Test edge cases
   - Validate inputs
   - Monitor performance

4. **Documentation**
   - Clear agent description
   - Input/output examples
   - Configuration options
   - Usage patterns

## Development Standards

### Schema Validation

All agents must use Zod for schema validation:

```typescript
// Example pattern
import { z } from 'zod'

export const InputSchema = z.object({
  // Input validation
})

export const OutputSchema = z.object({
  // Output validation
})

export type Input = z.infer<typeof InputSchema>
export type Output = z.infer<typeof OutputSchema>
```

Key rules:

1. Define schemas before types
2. Export both schema and inferred types
3. Validate all inputs and outputs
4. Use descriptive schema names

### Session Management

#### Date Handling

When creating session files, use a reliable external time source:

1. **Preferred Method** - Using World Time API:

   ```bash
   # Get current UTC date
   CURRENT_DATE=$(curl -s 'https://worldtimeapi.org/api/timezone/UTC' | grep -o '"datetime":"[^"]*"' | cut -d'"' -f4 | cut -d'T' -f1)

   # Create session file
   echo "Creating session: ${CURRENT_DATE}_task_name.md"
   ```

2. **Fallback Method** - Using system time in UTC:

   ```bash
   # Get current UTC date
   CURRENT_DATE=$(TZ=UTC date +%Y-%m-%d)
   ```

3. **Validation** - Ensure date format is YYYY-MM-DD:
   ```bash
   if [[ ! $CURRENT_DATE =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
     echo "Invalid date format"
     exit 1
   fi
   ```

Example session creation:

```bash
#!/bin/bash
TASK_NAME=$1
CURRENT_DATE=$(curl -s 'https://worldtimeapi.org/api/timezone/UTC' | grep -o '"datetime":"[^"]*"' | cut -d'"' -f4 | cut -d'T' -f1)

# Validate date
if [[ ! $CURRENT_DATE =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  CURRENT_DATE=$(TZ=UTC date +%Y-%m-%d)  # Fallback to system time
fi

SESSION_FILE=".ai/sessions/${CURRENT_DATE}_${TASK_NAME}.md"
cp .ai/sessions/template.md "$SESSION_FILE"

# Update date in session file
sed -i "" "s/Date: .*/Date: ${CURRENT_DATE}/" "$SESSION_FILE"

echo "Created session file: $SESSION_FILE"
```

## Cardinal Rules for Code Generation

### 1. Preserve Architectural Integrity

- **NEVER** suggest changes that could destabilize the existing monorepo architecture
- **ALWAYS** respect existing patterns and conventions
- **MAINTAIN** consistency with established import patterns (@squad/\*)
- **PRESERVE** build and deployment configurations that are known to work

### 2. Scope of Changes

- **ISOLATE** changes to the specific task or file at hand
- **AVOID** suggesting "while we're at it" changes to working systems
- **FOCUS** on minimal, targeted solutions for specific problems
- If broader changes are truly needed, propose them separately with full impact analysis

### 3. Dependencies and Configuration

- **RESPECT** existing dependency structures in the monorepo
- **MAINTAIN** compatibility with current build tools (tsup, turbo)
- **PRESERVE** working TypeScript configurations
- **AVOID** changes to shared configuration files unless absolutely necessary

### 4. Problem-Solving Approach

1. First, try to solve within existing patterns
2. If that fails, look for minimal adjustments to the specific file
3. If architectural changes are truly needed:
   - Document the full impact
   - Propose as a separate refactoring task
   - Get explicit approval before proceeding

### 5. Testing and Scripts

- Keep test files consistent with main codebase patterns
- Prefer fixing script-specific issues over changing shared configs
- Maintain separation between test utilities and production code
- Document any special handling needed for test scenarios
