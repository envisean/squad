import { z } from 'zod';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { VectorStore } from 'langchain/vectorstores/base';
import type { Embeddings } from 'langchain/embeddings/base';

export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  type: z.enum(['conversation', 'summary', 'episode', 'working']),
  metadata: z.record(z.unknown()),
  embedding: z.array(z.number()).optional(),
  timestamp: z.date(),
  agentId: z.string().uuid(),
});

export const MemoryQuerySchema = z.object({
  content: z.string(),
  type: MemoryEntrySchema.shape.type.optional(),
  agentId: z.string().uuid().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  limit: z.number().min(1).max(100).default(10),
  similarity: z.number().min(0).max(1).default(0.7),
});

export interface MemoryConfig {
  shortTerm: {
    windowSize: number;
    returnMessages: boolean;
  };
  working: {
    llm: BaseLanguageModel;
    maxTokens: number;
  };
  longTerm: {
    embeddings: Embeddings;
    vectorStore: VectorStore;
    dimensions: number;
    similarityMetric: 'cosine' | 'euclidean' | 'dot';
  };
  episodic: {
    embeddings: Embeddings;
    vectorStore: VectorStore;
    searchK: number;
  };
}

export interface MemoryMaintenanceConfig {
  consolidation: {
    enabled: boolean;
    interval: number; // milliseconds
    threshold: number; // number of entries before consolidation
  };
  cleanup: {
    enabled: boolean;
    maxAge: {
      shortTerm: number;  // milliseconds
      working: number;    // milliseconds
      longTerm?: number;  // optional, some memories might be permanent
      episodic?: number;
    };
  };
}

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryEntry['type'], number>;
  oldestEntry: Date;
  newestEntry: Date;
  averageEmbeddingSize: number;
}