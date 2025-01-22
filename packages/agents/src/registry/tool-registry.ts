import { z } from 'zod';

export interface Tool {
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  validateInput(input: unknown): Promise<boolean>;
  process(input: unknown): Promise<unknown>;
}

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }
}

export const toolRegistry = new ToolRegistry(); 