import { z } from 'zod';

export const MemoryTypeSchema = z.enum([
  'episodic',    // Specific experiences/events
  'semantic',    // General knowledge/facts
  'procedural',  // How to do things
  'feedback',    // User feedback and corrections
  'decision',    // Decision-making history
  'relationship',// People/relationship understanding
  'preference',  // User preferences/patterns
  'context'      // Organizational context
]);

export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export const ExperienceSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: z.date(),
  content: z.unknown(),
  actions: z.array(z.object({
    type: z.string(),
    result: z.unknown(),
    timestamp: z.date()
  })),
  outcomes: z.array(z.object({
    type: z.string(),
    result: z.unknown(),
    timestamp: z.date()
  })),
  metadata: z.record(z.unknown()),
  context: z.object({
    agent_id: z.string(),
    environment: z.string(),
    session_id: z.string().optional()
  })
});

export type Experience = z.infer<typeof ExperienceSchema>;

export const KnowledgeSchema = z.object({
  id: z.string().uuid(),
  type: MemoryTypeSchema,
  content: z.unknown(),
  confidence: z.number().min(0).max(1),
  source_experiences: z.array(z.string().uuid()),
  metadata: z.record(z.unknown()),
  created_at: z.date(),
  updated_at: z.date()
});

export type Knowledge = z.infer<typeof KnowledgeSchema>;

export const PatternSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  pattern: z.unknown(),
  confidence: z.number().min(0).max(1),
  occurrences: z.number(),
  first_seen: z.date(),
  last_seen: z.date(),
  metadata: z.record(z.unknown())
});

export type Pattern = z.infer<typeof PatternSchema>;

export const InsightSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  content: z.unknown(),
  confidence: z.number().min(0).max(1),
  related_patterns: z.array(z.string().uuid()),
  metadata: z.record(z.unknown()),
  created_at: z.date()
});

export type Insight = z.infer<typeof InsightSchema>;