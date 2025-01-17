import { createClient } from '@supabase/supabase-js';
import { ChatOpenAI } from '@langchain/openai';
import { SupabaseVectorStore } from '@squad/integrations';
import {
  MemoryConfig,
  MemoryEntry,
  ConversationMemory,
  WorkingMemory,
  EpisodicMemory
} from './types';

export class MemoryManager {
  private supabase;
  private vectorStore: SupabaseVectorStore;
  private config: MemoryConfig;
  private model: ChatOpenAI;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.supabase = createClient(
      config.storage.config.url as string,
      config.storage.config.key as string
    );

    this.vectorStore = new SupabaseVectorStore({
      tableName: 'memory_embeddings',
      queryName: 'match_memories',
      dimensions: config.vectorStore.dimensions
    });

    this.model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.3
    });
  }

  // Conversation Memory Management
  async addToConversationMemory(
    entry: Omit<MemoryEntry, 'id' | 'timestamp' | 'type'>
  ): Promise<void> {
    const fullEntry: MemoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'conversation',
      ...entry
    };

    // Store the memory entry
    const { error } = await this.supabase
      .from('memories')
      .insert(fullEntry);

    if (error) throw error;

    // If embeddings are provided, store in vector store
    if (entry.embedding) {
      await this.vectorStore.addDocuments([{
        pageContent: JSON.stringify(entry.content),
        metadata: {
          id: fullEntry.id,
          type: 'conversation',
          ...entry.metadata
        }
      }]);
    }

    // Check if summarization is needed
    await this.checkAndSummarize('conversation');
  }

  // Working Memory Management
  async updateWorkingMemory(
    data: Partial<WorkingMemory>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('working_memory')
      .upsert({
        data,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async getWorkingMemory(): Promise<WorkingMemory> {
    const { data, error } = await this.supabase
      .from('working_memory')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Episodic Memory Management
  async addEpisode(
    episode: Omit<EpisodicMemory['episodes'][0], 'id' | 'timestamp'>
  ): Promise<void> {
    const fullEpisode = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...episode
    };

    const { error } = await this.supabase
      .from('episodes')
      .insert(fullEpisode);

    if (error) throw error;

    // Create embeddings for the episode
    const embedding = await this.createEmbedding(
      episode.summary + '\n' + JSON.stringify(episode.details)
    );

    // Store in vector store
    await this.vectorStore.addDocuments([{
      pageContent: episode.summary,
      metadata: {
        id: fullEpisode.id,
        type: 'episodic',
        details: episode.details
      },
      embedding
    }]);
  }

  // Memory Retrieval
  async searchMemory(
    query: string,
    options: {
      type?: MemoryEntry['type'];
      k?: number;
      filter?: Record<string, unknown>;
    } = {}
  ): Promise<MemoryEntry[]> {
    const results = await this.vectorStore.similaritySearch(
      query,
      options.k || 5,
      options.filter
    );

    return results.map(result => ({
      id: result.metadata.id,
      type: result.metadata.type,
      content: result.pageContent,
      metadata: result.metadata,
      timestamp: new Date(result.metadata.timestamp)
    }));
  }

  // Memory Summarization
  private async checkAndSummarize(type: MemoryEntry['type']): Promise<void> {
    if (!this.config.summarization.enabled) return;

    const { data: memories } = await this.supabase
      .from('memories')
      .select('*')
      .eq('type', type)
      .order('timestamp', { ascending: false })
      .limit(this.config.summarization.triggerLength);

    if (memories.length >= this.config.summarization.triggerLength) {
      const summary = await this.summarizeMemories(memories);
      await this.storeSummary(type, summary);
    }
  }

  private async summarizeMemories(
    memories: MemoryEntry[]
  ): Promise<string> {
    const content = memories
      .map(m => JSON.stringify(m.content))
      .join('\n');

    const summary = await this.model.predict(
      `Summarize these memories, maintaining key information and relationships:

      ${content}

      Provide a concise summary that captures the essential information.`
    );

    return summary;
  }

  private async storeSummary(
    type: MemoryEntry['type'],
    summary: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('memory_summaries')
      .insert({
        type,
        summary,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Memory Cleanup
  async cleanup(): Promise<void> {
    const now = new Date();

    // Clean up conversation memory
    if (this.config.ttl.conversation) {
      const conversationCutoff = new Date(
        now.getTime() - this.config.ttl.conversation * 1000
      );

      await this.supabase
        .from('memories')
        .delete()
        .eq('type', 'conversation')
        .lt('timestamp', conversationCutoff.toISOString());
    }

    // Clean up working memory
    if (this.config.ttl.working) {
      const workingCutoff = new Date(
        now.getTime() - this.config.ttl.working * 1000
      );

      await this.supabase
        .from('working_memory')
        .delete()
        .lt('updated_at', workingCutoff.toISOString());
    }

    // Clean up episodic memory if TTL is set
    if (this.config.ttl.episodic) {
      const episodicCutoff = new Date(
        now.getTime() - this.config.ttl.episodic * 1000
      );

      await this.supabase
        .from('episodes')
        .delete()
        .lt('timestamp', episodicCutoff.toISOString());
    }
  }

  // Utility Functions
  private async createEmbedding(text: string): Promise<number[]> {
    // Implement embedding creation using your preferred method
    // This could use OpenAI's embeddings API or another embedding service
    return []; // Placeholder
  }
}