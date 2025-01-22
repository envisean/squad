import { AgentTask, TaskResult } from './types';

export abstract class BaseAgent {
  abstract name: string;
  abstract description: string;
  abstract version: string;

  abstract validateInput(input: unknown): Promise<boolean>;
  abstract processTask(task: AgentTask): Promise<TaskResult>;
} 