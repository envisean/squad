import { z } from 'zod';

export const FileProcessorConfigSchema = z.object({
  supportedTypes: z.array(z.string()),
  maxFileSize: z.number(),
  outputFormat: z.enum(['json', 'yaml', 'text'])
});

export const FileProcessorInputSchema = z.object({
  fileUrl: z.string().url(),
  type: z.string(),
  options: z.record(z.unknown()).optional()
});

export type FileProcessorConfig = z.infer<typeof FileProcessorConfigSchema>;
export type FileProcessorInput = z.infer<typeof FileProcessorInputSchema>;