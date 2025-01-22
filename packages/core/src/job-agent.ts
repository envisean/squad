import { BaseAgent } from './base-agent';
import { AgentTask, TaskResult } from './types';

export abstract class JobAgent extends BaseAgent {
  abstract maxRetries: number;
  abstract retryDelay: number;

  async executeJob(jobId: string, input: unknown): Promise<TaskResult> {
    let attempts = 0;
    
    while (attempts < this.maxRetries) {
      try {
        return await this.processTask({
          type: 'job',
          id: jobId,
          input
        });
      } catch (error) {
        attempts++;
        if (attempts === this.maxRetries) {
          return {
            status: 'failure',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    return {
      status: 'failure',
      error: 'Max retries exceeded'
    };
  }
} 