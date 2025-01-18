# Memory System Usage Examples

The memory system provides a comprehensive way to manage different types of memory for AI agents. Here are examples of common usage patterns:

## Basic Setup

```typescript
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { SupabaseVectorStore } from '@squad/integrations';
import { EnhancedMemoryManager } from '@squad/core';

// Initialize memory manager
const memoryManager = new EnhancedMemoryManager(
  // Memory configuration
  {
    shortTerm: {
      windowSize: 10,
      returnMessages: true
    },
    working: {
      llm: new ChatOpenAI({ modelName: 'gpt-4' }),
      maxTokens: 2000
    },
    longTerm: {
      embeddings: new OpenAIEmbeddings(),
      vectorStore: new SupabaseVectorStore(),
      dimensions: 1536,
      similarityMetric: 'cosine'
    },
    episodic: {
      embeddings: new OpenAIEmbeddings(),
      vectorStore: new SupabaseVectorStore(),
      searchK: 3
    }
  },
  // Maintenance configuration
  {
    consolidation: {
      enabled: true,
      interval: 60 * 60 * 1000, // 1 hour
      threshold: 50 // Consolidate after 50 entries
    },
    cleanup: {
      enabled: true,
      maxAge: {
        shortTerm: 30 * 60 * 1000,    // 30 minutes
        working: 24 * 60 * 60 * 1000, // 1 day
        longTerm: 30 * 24 * 60 * 60 * 1000, // 30 days
        episodic: undefined // Keep forever
      }
    }
  },
  // Supabase configuration
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);
```

## Saving Different Types of Memories

### Conversation Memory
```typescript
// Save a conversation exchange
await memoryManager.saveMemory({
  content: "User asked about project timeline",
  type: "conversation",
  agentId: agent.id,
  metadata: {
    role: "user",
    response: "The project is scheduled for completion in Q2",
    context: {
      project: "AI Implementation",
      priority: "high"
    }
  }
});
```

### Working Memory
```typescript
// Update current context
await memoryManager.saveMemory({
  content: "Currently reviewing code PR #123",
  type: "working",
  agentId: agent.id,
  metadata: {
    task: "code-review",
    pullRequest: "123",
    status: "in-progress",
    startedAt: new Date().toISOString()
  }
});
```

### Episodic Memory
```typescript
// Save a significant event
await memoryManager.saveMemory({
  content: "Successfully deployed major feature X",
  type: "episode",
  agentId: agent.id,
  metadata: {
    event: "deployment",
    feature: "X",
    outcome: "success",
    impact: "high",
    participants: ["agent1", "agent2"]
  }
});
```

## Querying Memories

### Recent Conversations
```typescript
const recentMemories = await memoryManager.queryMemories({
  content: "project timeline",
  type: "conversation",
  agentId: agent.id,
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  limit: 5
});
```

### Similar Episodes
```typescript
const similarEpisodes = await memoryManager.queryMemories({
  content: "deployment issues",
  type: "episode",
  similarity: 0.8, // High similarity threshold
  limit: 3
});
```

### Current Context
```typescript
const workingContext = await memoryManager.queryMemories({
  content: "current task",
  type: "working",
  agentId: agent.id,
  limit: 1
});
```

## Memory Maintenance

### Manual Consolidation
```typescript
// Force memory consolidation
await memoryManager.consolidateMemories();
```

### Cleanup Old Memories
```typescript
// Clean up based on configuration
await memoryManager.cleanupMemories();
```

### Get Memory Statistics
```typescript
const stats = await memoryManager.getStats();
console.log('Memory Usage:', {
  totalEntries: stats.totalEntries,
  byType: stats.byType,
  oldestMemory: stats.oldestEntry,
  averageEmbeddingSize: stats.averageEmbeddingSize
});
```

## Integration with Strategic Agents

```typescript
class StrategicAgent {
  private memoryManager: EnhancedMemoryManager;
  
  async processInput(input: string): Promise<string> {
    // Save user input to conversation memory
    await this.memoryManager.saveMemory({
      content: input,
      type: 'conversation',
      agentId: this.id,
      metadata: { role: 'user' }
    });

    // Get relevant context
    const context = await this.gatherContext(input);
    
    // Generate response
    const response = await this.generateResponse(input, context);
    
    // Save response to memory
    await this.memoryManager.saveMemory({
      content: response,
      type: 'conversation',
      agentId: this.id,
      metadata: {
        role: 'assistant',
        context
      }
    });

    return response;
  }

  private async gatherContext(input: string) {
    // Query different memory types
    const [conversations, episodes] = await Promise.all([
      // Get relevant conversations
      this.memoryManager.queryMemories({
        content: input,
        type: 'conversation',
        limit: 5
      }),
      // Get relevant episodes
      this.memoryManager.queryMemories({
        content: input,
        type: 'episode',
        limit: 3
      })
    ]);

    return {
      conversations: conversations.map(c => c.entry),
      episodes: episodes.map(e => e.entry)
    };
  }
}
```

## Best Practices

1. **Memory Types**
   - Use conversation memory for immediate context
   - Use working memory for active tasks/state
   - Use episodic memory for significant events
   - Use long-term memory for general knowledge

2. **Performance**
   - Set appropriate consolidation thresholds
   - Use cleanup policies to manage storage
   - Index frequently queried fields
   - Monitor memory statistics

3. **Context Management**
   - Combine different memory types for rich context
   - Use metadata for efficient filtering
   - Set appropriate similarity thresholds
   - Implement regular maintenance

4. **Error Handling**
   - Handle failed memory operations gracefully
   - Implement retry logic for critical operations
   - Monitor memory system health
   - Back up important memories