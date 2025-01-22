import { BaseAgent, type AgentTask, type TaskResult } from '@squad/core';

export class TaskAgent extends BaseAgent {
  async executeTask(task: Task): Promise<TaskResult> {
    try {
      await this.updateState({
        status: 'running',
        currentTask: task.id,
        lastActive: new Date(),
      });

      // TODO: Implement actual task execution logic
      const result: TaskResult = {
        id: `result_${task.id}`,
        taskId: task.id,
        output: { message: 'Task completed successfully' },
        completedAt: new Date(),
      };

      await this.updateState({
        status: 'idle',
        currentTask: undefined,
        lastActive: new Date(),
      });

      return result;
    } catch (error) {
      await this.updateState({
        status: 'error',
        lastActive: new Date(),
      });

      throw error;
    }
  }

  async initialize(): Promise<void> {
    await this.updateState({
      status: 'idle',
      lastActive: new Date(),
    });
  }

  async cleanup(): Promise<void> {
    await this.updateState({
      status: 'idle',
      currentTask: undefined,
      lastActive: new Date(),
    });
  }
}