import { z } from 'zod';
import { Document } from "@langchain/core/documents";

export const MemoryEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['conversation', 'working', 'episodic']),
  content: z.unknown(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()),
  timestamp: z.date(),
  ttl: z.number().optional() // seconds
});

export const ConversationMemorySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.unknown()).optional()
  })),
  summary: z.string().optional(),
  context: z.record(z.unknown()).optional()
});

export const WorkingMemorySchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    status: z.enum(['active', 'completed', 'failed']),
    data: z.unknown(),
    lastUpdated: z.date()
  })),
  context: z.record(z.unknown()),
  temporary: z.record(z.unknown()).optional()
});

export const EpisodicMemorySchema = z.object({
  episodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string(),
    details: z.unknown(),
    timestamp: z.date(),
    relationships: z.array(z.object({
      targetId: z.string(),
      type: z.string(),
      strength: z.number()
    }))
  }))
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type ConversationMemory = z.infer<typeof ConversationMemorySchema>;
export type WorkingMemory = z.infer<typeof WorkingMemorySchema>;
export type EpisodicMemory = z.infer<typeof EpisodicMemorySchema>;

export interface MemoryConfig {
  storage: {
    type: 'supabase' | 'postgres' | 'redis';
    config: Record<string, unknown>;
  };
  vectorStore: {
    dimensions: number;
    similarity: 'cosine' | 'euclidean' | 'dot';
  };
  ttl: {
    conversation: number; // seconds
    working: number;     // seconds
    episodic?: number;   // seconds, optional for permanent storage
  };
  summarization: {
    enabled: boolean;
    maxTokens: number;
    triggerLength: number; // number of messages before summarizing
  };
}

export interface MemoryManager {
  store(documents: Document[]): Promise<void>;
  search(query: string, limit?: number): Promise<Document[]>;
  clear(): Promise<void>;
}