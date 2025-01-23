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

/* IMPORTANT: 

Generally you do NOT want to add new agents, tools, or examples to this file as they should be imported from the appropriate directories to avoid large bundle sizes.

- Add new agents to the ./agents directory
- Add new tools to the ./tools directory
- Add new examples to the ./examples directory

The exports below are for internal use only, testing, or even for legacy purposes.

*/

// Export our agent implementations
export * from './agents/sales-prospecting';
export * from './agents/sales-prospecting/types';

// Export tools
export * from './tools/website-ingestion';
export * from './registry/tool-registry';

// Export examples
export * from './examples/file-processor';
export * from './examples/simple-search';