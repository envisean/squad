// Import specific types/classes from core that we need
import type { 
  AgentTask, 
  TaskResult 
} from '@squad/core';

// Re-export core types that agents need
export type { 
  AgentTask, 
  TaskResult 
};

// Export our agent implementations
export * from './agents/sales-prospecting';
export * from './agents/sales-prospecting/types';

// Export tools
export * from './tools/website-ingestion';
export * from './registry/tool-registry';

// Export examples
export * from './examples/file-processor';