import { z } from 'zod';

export const EmailPrioritySchema = z.enum([
  'urgent',
  'high',
  'medium',
  'low'
]);

export const EmailCategorySchema = z.enum([
  'action_required',
  'meeting',
  'fyi',
  'delegation',
  'follow_up',
  'personal',
  'newsletter',
  'other'
]);

export const EmailSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string(),
  body: z.object({
    text: z.string(),
    html: z.string().optional()
  }),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
    url: z.string()
  })).optional(),
  labels: z.array(z.string()).optional(),
  timestamp: z.date()
});

export const EmailClassificationSchema = z.object({
  priority: EmailPrioritySchema,
  categories: z.array(EmailCategorySchema),
  confidence: z.number(),
  requires_human: z.boolean(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  metadata: z.record(z.unknown())
});

export const ActionItemSchema = z.object({
  type: z.enum(['task', 'meeting', 'follow_up', 'delegation']),
  description: z.string(),
  due_date: z.date().optional(),
  assignee: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  metadata: z.record(z.unknown())
});

export const EmailProcessingResultSchema = z.object({
  email_id: z.string(),
  classification: EmailClassificationSchema,
  action_items: z.array(ActionItemSchema),
  suggested_response: z.string().optional(),
  next_steps: z.array(z.string()),
  metadata: z.record(z.unknown())
});

export type Email = z.infer<typeof EmailSchema>;
export type EmailPriority = z.infer<typeof EmailPrioritySchema>;
export type EmailCategory = z.infer<typeof EmailCategorySchema>;
export type EmailClassification = z.infer<typeof EmailClassificationSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type EmailProcessingResult = z.infer<typeof EmailProcessingResultSchema>;