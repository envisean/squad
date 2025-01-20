import { JobAgent } from '../../core/job-agent';
import type { Task, TaskResult } from '../../core/types';
import {
  FileProcessorConfig,
  FileProcessorConfigSchema,
  FileProcessorInputSchema
} from './types';
import fetch from 'node-fetch';
import { parse as parseYaml } from 'yaml';

export class FileProcessorAgent extends JobAgent {
  private config: FileProcessorConfig;

  constructor(config: FileProcessorConfig) {
    super();
    this.config = FileProcessorConfigSchema.parse(config);
  }

  async validateInput(input: unknown): Promise<boolean> {
    try {
      const validated = FileProcessorInputSchema.parse(input);
      return this.config.supportedTypes.includes(validated.type);
    } catch {
      return false;
    }
  }

  async processTask(task: Task): Promise<TaskResult> {
    const input = FileProcessorInputSchema.parse(task.input);
    
    try {
      // Download file
      const content = await this.downloadFile(input.fileUrl);
      
      // Check file size
      const size = Buffer.from(content).length;
      if (size > this.config.maxFileSize) {
        throw new Error(`File size ${size} exceeds maximum ${this.config.maxFileSize}`);
      }
      
      // Process based on type
      const processed = await this.processContent(content, input.type, input.options);
      
      // Format output
      return this.formatOutput(processed);
    } catch (error) {
      throw new Error(`Processing failed: ${error.message}`);
    }
  }

  private async downloadFile(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return response.text();
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

  private formatOutput(data: unknown): TaskResult {
    switch (this.config.outputFormat) {
      case 'json':
        return {
          status: 'success',
          data: JSON.stringify(data),
          metadata: {
            format: 'json'
          }
        };
      
      case 'yaml':
        return {
          status: 'success',
          data: parseYaml.stringify(data),
          metadata: {
            format: 'yaml'
          }
        };
      
      case 'text':
        return {
          status: 'success',
          data: String(data),
          metadata: {
            format: 'text'
          }
        };
    }
  }
}