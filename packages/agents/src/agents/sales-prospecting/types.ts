import { z } from 'zod';

export const ProspectSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  email: z.string().email().optional(),
  score: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const ProspectingConfigSchema = z.object({
  searchCriteria: z.object({
    industries: z.array(z.string()).optional(),
    roles: z.array(z.string()).optional(),
    companySize: z.array(z.string()).optional(),
    location: z.array(z.string()).optional()
  }),
  enrichment: z.object({
    useLinkedIn: z.boolean().default(true),
    useClearbit: z.boolean().default(true),
    useApollo: z.boolean().default(true)
  }),
  scoring: z.object({
    minScore: z.number().min(0).max(1).default(0.6),
    weights: z.object({
      roleMatch: z.number().default(0.4),
      industryMatch: z.number().default(0.3),
      companySizeMatch: z.number().default(0.2),
      locationMatch: z.number().default(0.1)
    })
  })
});

export type Prospect = z.infer<typeof ProspectSchema>;
export type ProspectingConfig = z.infer<typeof ProspectingConfigSchema>; 