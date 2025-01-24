import { AgentMetrics } from './types';

export class AgentMonitor {
  private metrics: AgentMetrics[] = [];

  constructor(private readonly agentId: string) {}

  startTask(): void {
    this.metrics.push({
      startTime: new Date(),
      status: 'in_progress'
    });
  }

  completeTask(success: boolean, error?: string, metadata?: Record<string, unknown>): void {
    const currentMetrics = this.metrics[this.metrics.length - 1];
    if (currentMetrics) {
      const endTime = new Date();
      currentMetrics.endTime = endTime;
      currentMetrics.duration = endTime.getTime() - currentMetrics.startTime.getTime();
      currentMetrics.status = success ? 'success' : 'failure';
      if (error) currentMetrics.error = error;
      if (metadata) currentMetrics.metadata = metadata;
    }
  }

  getMetrics(): AgentMetrics[] {
    return this.metrics;
  }

  getLastMetrics(): AgentMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  clearMetrics(): void {
    this.metrics = [];
  }
} 