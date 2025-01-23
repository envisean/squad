import { z } from 'zod'

export const DocumentSummarizationInputSchema = z.object({
  document: z.object({
    content: z.string(),
    metadata: z.object({
      type: z.enum(['markdown', 'text', 'html']),
      title: z.string().optional(),
      author: z.string().optional(),
      date: z.string().optional(),
    }),
  }),
  options: z.object({
    summaryType: z.enum(['brief', 'detailed', 'comprehensive']),
    preserveStructure: z.boolean(),
    maxLength: z.number().optional(),
    format: z.enum(['markdown', 'text', 'json']).optional(),
  }),
})

export const DocumentSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  subsections: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
      })
    )
    .optional(),
})

export const DocumentSummarizationOutputSchema = z.object({
  summary: z.object({
    brief: z.string(),
    detailed: z
      .object({
        overview: z.string(),
        sections: z.array(DocumentSectionSchema),
      })
      .optional(),
    keyPoints: z.array(z.string()),
    metadata: z.object({
      originalLength: z.number(),
      summaryLength: z.number(),
      compressionRatio: z.number(),
      processingTime: z.number(),
    }),
  }),
})

export type DocumentSummarizationInput = z.infer<typeof DocumentSummarizationInputSchema>
export type DocumentSummarizationOutput = z.infer<typeof DocumentSummarizationOutputSchema>
export type DocumentSection = z.infer<typeof DocumentSectionSchema>
