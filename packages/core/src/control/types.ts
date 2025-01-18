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
  edgeFunction: z.string(),
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

export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentCommand = z.infer<typeof AgentCommandSchema>;
export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;
export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;
export type AgentHeartbeat = z.infer<typeof AgentHeartbeatSchema>;
export type AgentControlCommand = z.infer<typeof AgentControlCommandSchema>;