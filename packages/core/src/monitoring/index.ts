import { z } from 'zod';
import { AgentMetricsSchema } from '../types';

export class MonitoringService {
  private metrics: Map<string, z.infer<typeof AgentMetricsSchema>>;

  constructor() {
    this.metrics = new Map();
  }

  recordMetrics(agentId: string, metrics: z.infer<typeof AgentMetricsSchema>) {
    this.metrics.set(agentId, metrics);
  }

  getMetrics(agentId: string) {
    return this.metrics.get(agentId);
  }

  getAllMetrics() {
    return Array.from(this.metrics.entries());
  }
}

export const monitoring = new MonitoringService(); 