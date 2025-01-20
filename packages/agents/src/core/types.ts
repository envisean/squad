import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  input: z.unknown(),
  metadata: z.record(z.unknown()).optional()
});

export const TaskResultSchema = z.object({
  status: z.enum(['success', 'failure']),
  data: z.unknown(),
  metadata: z.record(z.unknown()).optional(),
  error: z.string().optional()
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskResult = z.infer<typeof TaskResultSchema>;