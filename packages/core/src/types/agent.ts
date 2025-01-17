export type AgentStatus = 'idle' | 'running' | 'error' | 'completed';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  model: string;
  parameters: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  id: string;
  agentId: string;
  status: AgentStatus;
  lastActive: Date;
  currentTask?: string;
  memory?: Record<string, unknown>;
}

export interface AgentMetrics {
  id: string;
  agentId: string;
  timestamp: Date;
  successRate: number;
  taskCount: number;
  averageResponseTime: number;
  errorRate: number;
}