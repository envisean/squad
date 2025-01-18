# Quick Reference Guide

## Common Development Tasks

### 1. Creating a New Agent

```typescript
// 1. Create agent definition
// packages/agents/src/custom-agent/types.ts
interface CustomAgentConfig extends AgentConfig {
  capabilities: string[];
  tools: string[];
}

// 2. Implement agent
// packages/agents/src/custom-agent/index.ts
class CustomAgent extends BaseAgent {
  async executeTask(task: Task): Promise<TaskResult> {
    // Implementation
  }
}

// 3. Add to registry
// packages/agents/src/index.ts
export * from './custom-agent';
```

### 2. Adding Memory Operations

```typescript
// 1. Use memory manager
const memory = new EnhancedMemoryManager(config);

// 2. Store memory
await memory.saveMemory({
  content: "Important information",
  type: "conversation",
  agentId: "agent-123",
  metadata: { /* ... */ }
});

// 3. Query memories
const results = await memory.queryMemories({
  content: "search terms",
  type: "conversation",
  limit: 5
});
```

### 3. Implementing CLI Commands

```typescript
// 1. Create command file
// packages/cli/src/commands/custom.ts
export function customCommands(program: Command) {
  const custom = program.command('custom');
  
  custom
    .command('action')
    .description('Perform custom action')
    .action(async () => {
      // Implementation
    });

  return custom;
}

// 2. Register in index
// packages/cli/src/index.ts
import { customCommands } from './commands/custom';
customCommands(program);
```

### 4. Adding Monitoring

```typescript
// 1. Create monitor
const monitor = new AgentMonitor(config);

// 2. Track metrics
monitor.trackMetric('custom_metric', value);

// 3. Add logging
monitor.log({
  level: 'info',
  category: 'custom',
  message: 'Action performed'
});
```

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Run tests
pnpm test

# Start development
pnpm dev
```

### Database
```bash
# Apply migrations
supabase db push

# Create migration
supabase db diff -f migration_name

# Reset database
supabase db reset
```

### CLI
```bash
# Build CLI
cd packages/cli
pnpm build

# Run CLI command
./dist/index.js command
```

## Directory Structure

```
squad/
├── .ai/                    # AI development context
├── apps/
│   ├── web/               # Web interface
│   └── docs/              # Documentation
├── packages/
│   ├── core/              # Core functionality
│   ├── agents/            # Agent implementations
│   ├── integrations/      # External integrations
│   └── cli/               # CLI tool
└── supabase/              # Database
```

## Common Patterns

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof OperationalError) {
    // Handle operational error
  } else {
    // Log and rethrow
    monitor.error('Unexpected error', error);
    throw error;
  }
}
```

### Configuration
```typescript
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  },
  memory: {
    consolidation: {
      interval: 3600,
      threshold: 50
    }
  }
};
```

### Testing
```typescript
describe('Component', () => {
  let component: Component;
  
  beforeEach(() => {
    component = new Component(config);
  });

  it('should perform action', async () => {
    const result = await component.action();
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

1. **Database Connection**
```bash
# Check Supabase status
supabase status

# Reset connection
supabase stop && supabase start
```

2. **Build Issues**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

3. **Memory Issues**
```typescript
// Check memory stats
const stats = await memory.getStats();
console.log(stats);

// Force consolidation
await memory.consolidateMemories();
```

4. **Agent Issues**
```typescript
// Enable debug logging
monitor.setLevel('debug');

// Check agent status
const status = await agent.getStatus();
console.log(status);
```