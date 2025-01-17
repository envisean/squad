export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  agentId?: string;
  parentTaskId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface TaskResult {
  id: string;
  taskId: string;
  output: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  completedAt: Date;
}

export interface TaskMetrics {
  id: string;
  taskId: string;
  executionTime: number;
  memoryUsage: number;
  tokensUsed?: number;
  cost?: number;
}