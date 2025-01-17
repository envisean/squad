import { AgentConfig, AgentState, Task, TaskResult } from '@squad/core';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected state: AgentState;

  constructor(config: AgentConfig, state: AgentState) {
    this.config = config;
    this.state = state;
  }

  abstract executeTask(task: Task): Promise<TaskResult>;
  
  abstract initialize(): Promise<void>;
  
  abstract cleanup(): Promise<void>;

  getConfig(): AgentConfig {
    return this.config;
  }

  getState(): AgentState {
    return this.state;
  }

  protected async updateState(newState: Partial<AgentState>): Promise<void> {
    this.state = { ...this.state, ...newState };
    // TODO: Implement state persistence
  }
}