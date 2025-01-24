import { z } from 'zod';

export const AgentStatusSchema = z.enum([
  'idle',
  'running',
  'error',
  'terminated'
]);

export const AgentCommandSchema = z.enum([
  'start',
  'stop',
  'restart',
  'update',
  'pause',
  'resume'
]);

export const AgentMetricsSchema = z.object({
  cpu: z.number(),
  memory: z.number(),
  activeJobs: z.number(),
  lastCompletedJob: z.string().optional(),
  errorCount: z.number(),
  avgResponseTime: z.number()
});

export const AgentRegistrationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['strategic', 'job']),
  status: AgentStatusSchema,
  edge_function: z.string(),
  config: z.record(z.unknown()),
  metadata: z.object({
    region: z.string().optional(),
    version: z.string(),
    resources: z.object({
      cpu: z.number(),
      memory: z.number()
    })
  })
});

export const AgentHeartbeatSchema = z.object({
  agentId: z.string().uuid(),
  timestamp: z.date(),
  metrics: AgentMetricsSchema
});

export const AgentControlCommandSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  command: AgentCommandSchema,
  parameters: z.record(z.unknown()),
  status: z.enum(['pending', 'completed', 'failed']),
  timestamp: z.date(),
  error: z.string().optional()
});

export const QueueStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'retrying'
]);

export const TaskPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
]);

export const TaskQueueEntrySchema = z.object({
  id: z.string().uuid().optional(),
  agentId: z.string().uuid(),
  taskType: z.string(),
  priority: TaskPrioritySchema.default('medium'),
  payload: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
  maxRetries: z.number().default(3),
  scheduledFor: z.date().optional()
});

export const OrchestratorQueueEntrySchema = z.object({
  id: z.string().uuid().optional(),
  orchestratorId: z.string().uuid(),
  workflowType: z.string(),
  priority: TaskPrioritySchema.default('medium'),
  workflow: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
  subTasks: z.array(z.record(z.unknown())).optional(),
  scheduledFor: z.date().optional()
});

export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentCommand = z.infer<typeof AgentCommandSchema>;
export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;
export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;
export type AgentHeartbeat = z.infer<typeof AgentHeartbeatSchema>;
export type AgentControlCommand = z.infer<typeof AgentControlCommandSchema>;
export type QueueStatus = z.infer<typeof QueueStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskQueueEntry = z.infer<typeof TaskQueueEntrySchema>;
export type OrchestratorQueueEntry = z.infer<typeof OrchestratorQueueEntrySchema>;

export interface QueueMetrics {
  pendingTasks: number;
  processingTasks: number;
  failedTasks: number;
  completedTasks: number;
  retryingTasks: number;
  avgProcessingTime: number;
  criticalTasks: number;
  highPriorityTasks: number;
}