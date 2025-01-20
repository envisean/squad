import { BaseAgent } from './base-agent';
import type { Task, TaskResult } from './types';

export abstract class JobAgent extends BaseAgent {
  constructor() {
    super();
  }

  abstract validateInput(input: unknown): Promise<boolean>;
  abstract processTask(task: Task): Promise<TaskResult>;
}