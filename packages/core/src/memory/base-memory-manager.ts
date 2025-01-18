import { 
  ConversationBufferWindowMemory,
  ConversationSummaryMemory,
  VectorStoreRetrieverMemory
} from 'langchain/memory';
import { SupabaseVectorStore } from '@squad/integrations';
import type {
  MemoryConfig,
  MemoryEntry,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryMaintenanceConfig
} from './types/memory-types';

export abstract class BaseMemoryManager {
  protected shortTermMemory: ConversationBufferWindowMemory;
  protected workingMemory: ConversationSummaryMemory;
  protected longTermMemory: SupabaseVectorStore;
  protected episodicMemory: VectorStoreRetrieverMemory;
  protected config: MemoryConfig;
  protected maintenanceConfig: MemoryMaintenanceConfig;
  private maintenanceInterval?: NodeJS.Timer;

  constructor(
    config: MemoryConfig,
    maintenanceConfig: MemoryMaintenanceConfig
  ) {
    this.config = config;
    this.maintenanceConfig = maintenanceConfig;

    // Initialize memory systems
    this.initializeMemorySystems();

    // Start maintenance if enabled
    if (maintenanceConfig.consolidation.enabled) {
      this.startMaintenance();
    }
  }

  protected abstract initializeMemorySystems(): void;

  protected abstract consolidateMemories(): Promise<void>;

  protected abstract cleanupMemories(): Promise<void>;

  /**
   * Save a memory entry across appropriate memory systems
   */
  abstract saveMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Query memories based on content and criteria
   */
  abstract queryMemories(query: MemoryQuery): Promise<MemorySearchResult[]>;

  /**
   * Get statistics about memory usage
   */
  abstract getStats(): Promise<MemoryStats>;

  /**
   * Start the maintenance cycle
   */
  protected startMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
    }

    this.maintenanceInterval = setInterval(
      async () => {
        try {
          if (this.maintenanceConfig.consolidation.enabled) {
            await this.consolidateMemories();
          }
          if (this.maintenanceConfig.cleanup.enabled) {
            await this.cleanupMemories();
          }
        } catch (error) {
          console.error('Memory maintenance failed:', error);
        }
      },
      this.maintenanceConfig.consolidation.interval
    );
  }

  /**
   * Stop the maintenance cycle
   */
  protected stopMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = undefined;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stopMaintenance();
    await this.cleanupMemories();
  }
}