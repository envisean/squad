import { Task, TaskResult } from './types';

export abstract class BaseAgent {
  protected id: string;

  constructor() {
    this.id = crypto.randomUUID();
  }

  getId(): string {
    return this.id;
  }

  abstract validateInput(input: unknown): Promise<boolean>;
  abstract processTask(task: Task): Promise<TaskResult>;
}