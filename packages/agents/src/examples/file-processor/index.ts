import { z } from 'zod';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { Tool } from '../../registry/tool-registry';
import { type TaskResult } from '@squad/core';

const FileProcessorInputSchema = z.object({
  content: z.string(),
  type: z.string(),
  options: z.record(z.unknown()).optional()
});

const FileProcessorConfigSchema = z.object({
  supportedTypes: z.array(z.string()).default(['json', 'yaml', 'csv', 'text']),
  maxFileSize: z.number().default(1024 * 1024), // 1MB
  outputFormat: z.enum(['json', 'yaml', 'text']).default('json')
});

export class FileProcessorTool implements Tool {
  name = 'file-processor';
  description = 'Process files of various formats';
  category = 'data-processing';
  capabilities = ['file-processing'];

  private config: z.infer<typeof FileProcessorConfigSchema>;

  constructor(config?: z.infer<typeof FileProcessorConfigSchema>) {
    this.config = FileProcessorConfigSchema.parse(config ?? {});
  }

  async validateInput(input: unknown): Promise<boolean> {
    return FileProcessorInputSchema.safeParse(input).success;
  }

  async process(input: unknown) {
    const parsed = FileProcessorInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error('Invalid input');
    }
    
    const { content, type, options } = parsed.data;
    
    try {
      if (!this.config.supportedTypes.includes(type)) {
        throw new Error(`Unsupported file type: ${type}`);
      }

      const processedContent = await this.processContent(content, type, options);
      return this.formatOutput(processedContent);
    } catch (err) {
      const error = err as Error;
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  private async processContent(
    content: string,
    type: string,
    options?: Record<string, unknown>
  ): Promise<unknown> {
    switch (type) {
      case 'json':
        return JSON.parse(content);
      
      case 'yaml':
        return parseYaml(content);
      
      case 'csv':
        return this.processCsv(content, options);
      
      case 'text':
        return this.processText(content, options);
      
      default:
        throw new Error(`Unsupported file type: ${type}`);
    }
  }

  private processCsv(
    content: string,
    options?: Record<string, unknown>
  ): unknown {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return Object.fromEntries(
        headers.map((h, i) => [h, values[i]])
      );
    });
    return rows;
  }

  private processText(
    content: string,
    options?: Record<string, unknown>
  ): unknown {
    return {
      content,
      length: content.length,
      lines: content.split('\n').length,
      words: content.split(/\s+/).length
    };
  }

  private formatOutput(data: unknown): unknown {
    switch (this.config.outputFormat) {
      case 'json':
        return JSON.stringify(data);
      
      case 'yaml':
        return stringifyYaml(data);
      
      case 'text':
        return String(data);
      
      default:
        return data;
    }
  }
}