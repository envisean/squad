import { ControlPlane } from './control'
import { AgentMonitor } from './monitoring'
import { AgentTask, TaskResult, AgentConfig, AgentState, AgentMetrics } from './types'

export abstract class BaseAgent {
  abstract name: string
  abstract description: string
  abstract version: string

  protected config: AgentConfig
  protected state: AgentState
  protected controlPlane?: ControlPlane
  protected monitor?: AgentMonitor

  constructor(config: AgentConfig, state: AgentState) {
    this.config = config
    this.state = state
  }

  // Core functionality
  abstract validateInput(input: unknown): Promise<boolean>
  abstract processTask(task: AgentTask): Promise<TaskResult>

  // Control plane integration
  async initialize(): Promise<void> {
    if (this.controlPlane && this.config.id) {
      await this.controlPlane.registerAgent({
        type: this.config.type,
        status: this.state.status,
        edge_function: this.name,
        config: { ...this.config } as Record<string, unknown>,
        metadata: {
          version: this.version,
          resources: { cpu: 1, memory: 512 },
        },
      })

      // Start heartbeat
      this.controlPlane.startHeartbeat(this.config.id, async () => ({
        cpu: 0, // TODO: Implement actual metrics
        memory: 0,
        activeJobs: 0,
        errorCount: 0,
        avgResponseTime: 0,
      }))
    }
  }

  async cleanup(): Promise<void> {
    if (this.controlPlane && this.config.id) {
      this.controlPlane.stopHeartbeat()
      await this.controlPlane.unregisterAgent(this.config.id)
    }
  }

  // State management
  protected async updateState(newState: Partial<AgentState>): Promise<void> {
    this.state = { ...this.state, ...newState }
    if (this.controlPlane && this.config.id && newState.status) {
      await this.controlPlane.updateStatus(this.config.id, newState.status)
    }
  }

  // Monitoring
  protected async reportMetrics(metrics: AgentMetrics): Promise<void> {
    if (this.monitor) {
      await this.monitor.startTask()
      this.monitor.completeTask(
        metrics.status === 'success',
        metrics.error,
        metrics.metadata
      )
    }
  }

  // Getters
  getConfig(): AgentConfig {
    return this.config
  }

  getState(): AgentState {
    return this.state
  }
}
