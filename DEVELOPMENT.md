# Squad Development Guide

## Local Development Setup

1. **Prerequisites**
```bash
# Install Supabase CLI
curl -fsSL https://cli.supabase.com/install.sh | sh

# Install dependencies
pnpm install

# Install Docker (if not already installed)
# Follow instructions at https://docs.docker.com/get-docker/
```

2. **Initialize Local Supabase**
```bash
# Initialize Supabase project
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

3. **Environment Setup**
```bash
# Copy example env file
cp .env.example .env.local

# Update with your local Supabase details
# These will be shown after running supabase start
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Running Tests

```bash
# Install test dependencies
pnpm add -D vitest @vitest/ui @testing-library/react

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui
```

## Creating Your First Agent

1. **Create a Simple Job Agent**

```typescript
// packages/agents/src/examples/file-processor/types.ts
import { z } from 'zod';

export const FileProcessorConfigSchema = z.object({
  supportedTypes: z.array(z.string()),
  maxFileSize: z.number(),
  outputFormat: z.enum(['json', 'yaml', 'text'])
});

export const FileProcessorInputSchema = z.object({
  fileUrl: z.string().url(),
  type: z.string(),
  options: z.record(z.unknown()).optional()
});

export type FileProcessorConfig = z.infer<typeof FileProcessorConfigSchema>;
export type FileProcessorInput = z.infer<typeof FileProcessorInputSchema>;

// packages/agents/src/examples/file-processor/index.ts
import { JobAgent } from '../../core/job-agent';
import type { Task, TaskResult } from '../../core/types';
import {
  FileProcessorConfig,
  FileProcessorConfigSchema,
  FileProcessorInputSchema
} from './types';

export class FileProcessorAgent extends JobAgent {
  private config: FileProcessorConfig;

  constructor(config: FileProcessorConfig) {
    super();
    this.config = FileProcessorConfigSchema.parse(config);
  }

  async validateInput(input: unknown): Promise<boolean> {
    try {
      const validated = FileProcessorInputSchema.parse(input);
      return this.config.supportedTypes.includes(validated.type);
    } catch {
      return false;
    }
  }

  async processTask(task: Task): Promise<TaskResult> {
    const input = FileProcessorInputSchema.parse(task.input);
    
    // Download file
    const content = await this.downloadFile(input.fileUrl);
    
    // Process based on type
    const processed = await this.processContent(content, input.type);
    
    // Format output
    return this.formatOutput(processed);
  }

  private async downloadFile(url: string): Promise<string> {
    // Implementation
    return '';
  }

  private async processContent(
    content: string,
    type: string
  ): Promise<unknown> {
    // Implementation
    return {};
  }

  private formatOutput(data: unknown): TaskResult {
    return {
      status: 'success',
      data,
      metadata: {
        format: this.config.outputFormat
      }
    };
  }
}
```

2. **Create Integration Tests**

```typescript
// packages/agents/src/examples/file-processor/file-processor.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FileProcessorAgent } from './index';
import { ControlPlane } from '@squad/core';

describe('FileProcessorAgent', () => {
  let agent: FileProcessorAgent;
  let controlPlane: ControlPlane;

  beforeEach(() => {
    agent = new FileProcessorAgent({
      supportedTypes: ['csv', 'json'],
      maxFileSize: 1024 * 1024, // 1MB
      outputFormat: 'json'
    });

    controlPlane = new ControlPlane({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_KEY!
    });
  });

  it('should process a simple file', async () => {
    // Enqueue task
    const taskId = await controlPlane.enqueueTask({
      agentId: agent.id,
      taskType: 'file-processing',
      priority: 'medium',
      payload: {
        fileUrl: 'https://example.com/data.csv',
        type: 'csv'
      }
    });

    // Process task
    const task = await controlPlane.getNextTask(
      agent.id,
      ['file-processing']
    );

    expect(task).toBeDefined();
    expect(task?.id).toBe(taskId);

    // Process and verify
    const result = await agent.processTask(task!);
    expect(result.status).toBe('success');
  });

  it('should reject unsupported file types', async () => {
    const valid = await agent.validateInput({
      fileUrl: 'https://example.com/data.pdf',
      type: 'pdf'
    });

    expect(valid).toBe(false);
  });
});
```

3. **Run the Agent**

```typescript
// examples/run-file-processor.ts
import { FileProcessorAgent } from '@squad/agents';
import { ControlPlane } from '@squad/core';

async function main() {
  // Initialize agent
  const agent = new FileProcessorAgent({
    supportedTypes: ['csv', 'json'],
    maxFileSize: 1024 * 1024,
    outputFormat: 'json'
  });

  // Initialize control plane
  const controlPlane = new ControlPlane({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!
  });

  // Register agent
  await controlPlane.registerAgent({
    id: agent.id,
    type: 'job',
    status: 'idle',
    edgeFunction: 'file-processor',
    config: {
      supportedTypes: ['csv', 'json'],
      maxFileSize: 1024 * 1024
    }
  });

  // Start processing
  console.log('Starting file processor agent...');
  
  while (true) {
    const task = await controlPlane.getNextTask(
      agent.id,
      ['file-processing']
    );

    if (task) {
      try {
        console.log('Processing task:', task.id);
        const result = await agent.processTask(task);
        await controlPlane.completeTask(task.id, result);
        console.log('Task completed:', task.id);
      } catch (error) {
        console.error('Task failed:', error);
        await controlPlane.failTask(task.id, error as Error);
      }
    }

    // Wait before checking for new tasks
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(console.error);
```

## Development Workflow

1. **Start Infrastructure**
```bash
# Start Supabase
supabase start

# Start development server
pnpm dev
```

2. **Run Tests**
```bash
# Run all tests
pnpm test

# Run specific test
pnpm test file-processor
```

3. **Try the Agent**
```bash
# Run the example agent
pnpm tsx examples/run-file-processor.ts

# In another terminal, enqueue a task
pnpm tsx examples/enqueue-task.ts
```

4. **Monitor Progress**
```bash
# Start monitoring UI
pnpm dev

# Open http://localhost:3000/monitoring
```

## Common Development Tasks

1. **Adding a New Agent**
   - Create directory in `packages/agents/src`
   - Define types and schemas
   - Implement agent class
   - Add tests
   - Create example usage

2. **Updating Database Schema**
   ```bash
   # Create new migration
   supabase db diff -f my_migration_name

   # Apply migration
   supabase db push
   ```

3. **Testing Workflows**
   ```bash
   # Start required infrastructure
   docker-compose up -d

   # Run workflow tests
   pnpm test:workflows
   ```

4. **Debugging**
   - Use `pnpm dev:debug` for Node.js debugging
   - Check Supabase logs with `supabase logs`
   - Monitor queues in the web UI
   - Use `pnpm test:ui` for visual test debugging

## Best Practices

1. **Agent Development**
   - Always define input/output schemas
   - Implement proper validation
   - Add comprehensive error handling
   - Include monitoring hooks

2. **Testing**
   - Write unit tests for core logic
   - Add integration tests for workflows
   - Test error conditions
   - Mock external services

3. **Monitoring**
   - Add detailed logging
   - Track important metrics
   - Set up alerts for failures
   - Monitor queue depths

4. **Performance**
   - Profile agent operations
   - Monitor memory usage
   - Track processing times
   - Optimize hot paths