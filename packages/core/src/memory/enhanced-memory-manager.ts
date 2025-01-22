import { VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";

export interface MemoryManager {
  store(documents: Document[]): Promise<void>;
  search(query: string, limit?: number): Promise<Document[]>;
  clear(): Promise<void>;
}

export class EnhancedMemoryManager implements MemoryManager {
  private vectorStore: VectorStore;
  private embeddings: Embeddings;

  constructor(vectorStore: VectorStore, embeddings: Embeddings) {
    this.vectorStore = vectorStore;
    this.embeddings = embeddings;
  }

  async store(documents: Document[]): Promise<void> {
    await this.vectorStore.addDocuments(documents);
  }

  async search(query: string, limit = 5): Promise<Document[]> {
    return this.vectorStore.similaritySearch(query, limit);
  }

  async clear(): Promise<void> {
    // Implementation depends on the specific vector store
    if ('clear' in this.vectorStore) {
      await (this.vectorStore as any).clear();
    }
  }
}