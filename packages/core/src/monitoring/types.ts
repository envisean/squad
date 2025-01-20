import { z } from 'zod';

export const MetricValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.record(z.unknown())
]);

export const MetricSchema = z.object({
  name: z.string(),
  value: MetricValueSchema,
  timestamp: z.date(),
  labels: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const LogLevelSchema = z.enum([
  'debug',
  'info',
  'warn',
  'error',
  'critical'
]);

export const LogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  level: LogLevelSchema,
  category: z.string(),
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional()
});

export const ConversationLogSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.enum(['incoming', 'outgoing']),
  content: z.string(),
  metadata: z.object({
    userId: z.string(),
    context: z.record(z.unknown()).optional(),
    relatedTasks: z.array(z.string()).optional(),
    sentiment: z.string().optional(),
    embeddings: z.array(z.number()).optional()
  })
});

export const DecisionLogSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  context: z.string(),
  options: z.array(z.string()),
  selectedOption: z.string(),
  reasoning: z.string(),
  confidence: z.number(),
  metadata: z.record(z.unknown())
});

export const ActionLogSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.string(),
  status: z.enum(['started', 'completed', 'failed']),
  duration: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown())
});

export type Metric = z.infer<typeof MetricSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type ConversationLog = z.infer<typeof ConversationLogSchema>;
export type DecisionLog = z.infer<typeof DecisionLogSchema>;
export type ActionLog = z.infer<typeof ActionLogSchema>;

export interface MonitoringConfig {
  logLevel: LogLevel;
  metrics: {
    interval: number;  // seconds
    retention: number; // days
  };
  storage: {
    type: 'supabase' | 'postgres' | 'clickhouse';
    config: Record<string, unknown>;
  };
  tracing: {
    enabled: boolean;
    sampler?: number; // 0-1, percentage of traces to sample
  };
}