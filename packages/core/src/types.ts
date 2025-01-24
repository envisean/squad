import { z } from 'zod';

export const AgentMetricsSchema = z.object({
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  status: z.enum(['success', 'failure', 'in_progress']),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface AgentConfig {
  id?: string;
  type: 'strategic' | 'job';
  name: string;
  version: string;
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  status: AgentStatus;
  currentTask?: string;
  lastProcessedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  type: string;
  priority?: TaskPriority;
  input?: unknown;
  metadata?: Record<string, unknown>;
}

export interface TaskResult<TOutput = unknown> {
  taskId: string;
  status: 'success' | 'failure';
  output: TOutput;
  error?: string;
  metadata?: Record<string, unknown>;
} 