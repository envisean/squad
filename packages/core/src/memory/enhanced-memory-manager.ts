import { 
  ConversationBufferWindowMemory,
  ConversationSummaryMemory,
  VectorStoreRetrieverMemory
} from 'langchain/memory';
import { SupabaseVectorStore } from '@squad/integrations';
import { createClient } from '@supabase/supabase-js';
import { BaseMemoryManager } from './base-memory-manager';
import type {
  MemoryConfig,
  MemoryEntry,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryMaintenanceConfig
} from './types/memory-types';

export class EnhancedMemoryManager extends BaseMemoryManager {
  private supabase;

  constructor(
    config: MemoryConfig,
    maintenanceConfig: MemoryMaintenanceConfig,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    super(config, maintenanceConfig);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  protected initializeMemorySystems(): void {
    // Initialize short-term memory
    this.shortTermMemory = new ConversationBufferWindowMemory({
      k: this.config.shortTerm.windowSize,
      returnMessages: this.config.shortTerm.returnMessages,
      memoryKey: 'chat_history'
    });

    // Initialize working memory
    this.workingMemory = new ConversationSummaryMemory({
      llm: this.config.working.llm,
      maxTokens: this.config.working.maxTokens,
      memoryKey: 'working_memory'
    });

    // Initialize long-term memory
    this.longTermMemory = new SupabaseVectorStore({
      client: this.supabase,
      tableName: 'memory_embeddings',
      queryName: 'match_memories',
      embeddings: this.config.longTerm.embeddings
    });

    // Initialize episodic memory
    this.episodicMemory = new VectorStoreRetrieverMemory({
      vectorStoreRetriever: this.longTermMemory.asRetriever(
        this.config.episodic.searchK
      ),
      memoryKey: 'episodic_memory'
    });
  }

  async saveMemory(
    entry: Omit<MemoryEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    const timestamp = new Date();
    const id = crypto.randomUUID();

    // Create full memory entry
    const fullEntry: MemoryEntry = {
      id,
      timestamp,
      ...entry
    };

    // Save to appropriate memory systems based on type
    switch (entry.type) {
      case 'conversation':
        await this.saveConversationMemory(fullEntry);
        break;
      case 'summary':
        await this.saveSummaryMemory(fullEntry);
        break;
      case 'episode':
        await this.saveEpisodicMemory(fullEntry);
        break;
      case 'working':
        await this.saveWorkingMemory(fullEntry);
        break;
    }

    // Check if consolidation is needed
    await this.checkConsolidation();
  }

  private async saveConversationMemory(entry: MemoryEntry): Promise<void> {
    // Save to short-term memory
    await this.shortTermMemory.saveContext(
      { input: entry.content },
      { output: entry.metadata.response as string }
    );

    // If embedding exists, save to long-term memory
    if (entry.embedding) {
      await this.longTermMemory.addDocuments([{
        pageContent: entry.content,
        metadata: {
          id: entry.id,
          type: entry.type,
          agentId: entry.agentId,
          timestamp: entry.timestamp,
          ...entry.metadata
        }
      }]);
    }
  }

  private async saveSummaryMemory(entry: MemoryEntry): Promise<void> {
    // Save to working memory
    await this.workingMemory.saveContext(
      { input: entry.content },
      { output: entry.metadata.summary as string }
    );

    // Also save to long-term memory
    if (entry.embedding) {
      await this.longTermMemory.addDocuments([{
        pageContent: entry.content,
        metadata: {
          id: entry.id,
          type: entry.type,
          agentId: entry.agentId,
          timestamp: entry.timestamp,
          ...entry.metadata
        }
      }]);
    }
  }

  private async saveEpisodicMemory(entry: MemoryEntry): Promise<void> {
    // Save to episodic memory
    await this.episodicMemory.saveContext(
      { input: entry.content },
      { output: entry.metadata.outcome as string }
    );

    // Also save to long-term memory
    if (entry.embedding) {
      await this.longTermMemory.addDocuments([{
        pageContent: entry.content,
        metadata: {
          id: entry.id,
          type: entry.type,
          agentId: entry.agentId,
          timestamp: entry.timestamp,
          ...entry.metadata
        }
      }]);
    }
  }

  private async saveWorkingMemory(entry: MemoryEntry): Promise<void> {
    // Update working memory
    const { error } = await this.supabase
      .from('working_memory')
      .upsert({
        agent_id: entry.agentId,
        content: entry.content,
        metadata: entry.metadata,
        updated_at: entry.timestamp
      });

    if (error) throw error;
  }

  async queryMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    // Build query filters
    const filters: Record<string, unknown> = {};
    
    if (query.type) filters.type = query.type;
    if (query.agentId) filters.agentId = query.agentId;
    if (query.startTime) filters.timestamp = { gte: query.startTime };
    if (query.endTime) {
      filters.timestamp = {
        ...filters.timestamp,
        lte: query.endTime
      };
    }

    // Search vector store
    const results = await this.longTermMemory.similaritySearch(
      query.content,
      query.limit,
      filters
    );

    // Format results
    return results.map(result => ({
      entry: {
        id: result.metadata.id,
        content: result.pageContent,
        type: result.metadata.type,
        agentId: result.metadata.agentId,
        timestamp: new Date(result.metadata.timestamp),
        metadata: result.metadata,
        embedding: result.metadata.embedding
      },
      score: result.metadata.score || 1
    }));
  }

  async getStats(): Promise<MemoryStats> {
    // Query memory statistics
    const { data: stats, error } = await this.supabase
      .from('memory_embeddings')
      .select('type, created_at, embedding')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Calculate statistics
    const byType = stats.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const embeddings = stats
      .filter(s => s.embedding)
      .map(s => s.embedding.length);

    return {
      totalEntries: stats.length,
      byType,
      oldestEntry: new Date(stats[0].created_at),
      newestEntry: new Date(stats[stats.length - 1].created_at),
      averageEmbeddingSize: embeddings.length
        ? embeddings.reduce((a, b) => a + b, 0) / embeddings.length
        : 0
    };
  }

  protected async consolidateMemories(): Promise<void> {
    // Get recent memories from short-term memory
    const shortTermMemories = await this.shortTermMemory
      .loadMemoryVariables({});

    if (!shortTermMemories.chat_history) return;

    // Generate summary using working memory
    const summary = await this.workingMemory.predictSummary(
      shortTermMemories.chat_history
    );

    // Save summary to long-term memory
    await this.saveMemory({
      content: summary,
      type: 'summary',
      agentId: 'system', // or specific agent ID
      metadata: {
        source: 'consolidation',
        originalMemories: shortTermMemories.chat_history
      }
    });

    // Clear short-term memory
    await this.shortTermMemory.clear();
  }

  protected async cleanupMemories(): Promise<void> {
    const now = new Date();

    // Clean up short-term memory after configured age
    if (this.maintenanceConfig.cleanup.maxAge.shortTerm) {
      await this.shortTermMemory.clear();
    }

    // Clean up working memory
    if (this.maintenanceConfig.cleanup.maxAge.working) {
      const workingCutoff = new Date(
        now.getTime() - this.maintenanceConfig.cleanup.maxAge.working
      );

      await this.supabase
        .from('working_memory')
        .delete()
        .lt('updated_at', workingCutoff.toISOString());
    }

    // Clean up long-term memory if configured
    if (this.maintenanceConfig.cleanup.maxAge.longTerm) {
      const longTermCutoff = new Date(
        now.getTime() - this.maintenanceConfig.cleanup.maxAge.longTerm
      );

      await this.supabase
        .from('memory_embeddings')
        .delete()
        .lt('created_at', longTermCutoff.toISOString())
        .neq('type', 'episode'); // Don't auto-delete episodes
    }

    // Clean up episodic memory if configured
    if (this.maintenanceConfig.cleanup.maxAge.episodic) {
      const episodicCutoff = new Date(
        now.getTime() - this.maintenanceConfig.cleanup.maxAge.episodic
      );

      await this.supabase
        .from('memory_embeddings')
        .delete()
        .lt('created_at', episodicCutoff.toISOString())
        .eq('type', 'episode');
    }
  }

  private async checkConsolidation(): Promise<void> {
    if (!this.maintenanceConfig.consolidation.enabled) return;

    // Check number of entries in short-term memory
    const { chat_history } = await this.shortTermMemory
      .loadMemoryVariables({});

    if (Array.isArray(chat_history) && 
        chat_history.length >= this.maintenanceConfig.consolidation.threshold) {
      await this.consolidateMemories();
    }
  }
}