import { SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryType } from './types';

export interface StreamConfig {
  type: MemoryType;
  agentId: string;
  environment: string;
}

export interface QueryOptions {
  content: unknown;
  limit?: number;
  timeframe?: string;
  metadata?: Record<string, unknown>;
}

export class MemoryStream {
  constructor(
    private supabase: SupabaseClient,
    private embeddings: OpenAIEmbeddings,
    private config: StreamConfig
  ) {}

  async store(content: unknown): Promise<void> {
    try {
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(content);

      // Store in the appropriate table
      await this.supabase.from(`memory_${this.config.type}`).insert({
        content,
        embedding,
        agent_id: this.config.agentId,
        environment: this.config.environment,
        created_at: new Date(),
        metadata: {
          type: this.config.type,
          version: '1.0'
        }
      });

    } catch (error) {
      console.error(`Error storing in ${this.config.type} stream:`, error);
      throw error;
    }
  }

  async query(options: QueryOptions): Promise<any[]> {
    try {
      // Generate embedding for the query content
      const queryEmbedding = await this.generateEmbedding(options.content);

      // Construct the query
      let query = this.supabase
        .from(`memory_${this.config.type}`)
        .select('*')
        .eq('agent_id', this.config.agentId)
        .eq('environment', this.config.environment);

      // Add timeframe filter if specified
      if (options.timeframe) {
        const timeframe = this.parseTimeframe(options.timeframe);
        query = query.gte('created_at', timeframe);
      }

      // Add metadata filters if specified
      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          query = query.eq(`metadata->>${key}`, value);
        }
      }

      // Perform vector similarity search
      query = query.order(
        'embedding <-> $1::vector',
        { ascending: true }
      ).limit(options.limit || 10);

      const { data, error } = await query.execute({
        bind: [queryEmbedding]
      });

      if (error) throw error;
      return data;

    } catch (error) {
      console.error(`Error querying ${this.config.type} stream:`, error);
      throw error;
    }
  }

  private async generateEmbedding(content: unknown): Promise<number[]> {
    // Convert content to string for embedding
    const text = this.contentToString(content);
    
    // Generate embedding
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  private contentToString(content: unknown): string {
    if (typeof content === 'string') return content;
    if (typeof content === 'number') return content.toString();
    if (typeof content === 'boolean') return content.toString();
    if (content === null) return '';
    if (Array.isArray(content)) return content.map(item => this.contentToString(item)).join(' ');
    if (typeof content === 'object') return JSON.stringify(content);
    return '';
  }

  private parseTimeframe(timeframe: string): Date {
    const now = new Date();
    const match = timeframe.match(/^(\d+)([dhm])$/);
    
    if (!match) throw new Error('Invalid timeframe format. Use format: 1d, 2h, 30m');
    
    const [, amount, unit] = match;
    const value = parseInt(amount);
    
    switch (unit) {
      case 'd':
        now.setDate(now.getDate() - value);
        break;
      case 'h':
        now.setHours(now.getHours() - value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() - value);
        break;
    }
    
    return now;
  }
}