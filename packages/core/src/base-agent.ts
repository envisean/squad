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
    if (this.controlPlane) {
      await this.controlPlane.registerAgent({
        type: 'job',
        status: 'idle',
        edge_function: this.name,
        config: this.config,
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
    if (this.controlPlane) {
      this.controlPlane.stopHeartbeat()
      await this.controlPlane.unregisterAgent(this.config.id)
    }
  }

  // State management
  protected async updateState(newState: Partial<AgentState>): Promise<void> {
    this.state = { ...this.state, ...newState }
    if (this.controlPlane) {
      await this.controlPlane.updateStatus(this.config.id, newState.status || this.state.status)
    }
  }

  // Monitoring
  protected async reportMetrics(metrics: AgentMetrics): Promise<void> {
    if (this.monitor) {
      await this.monitor.recordMetric({
        agentId: this.config.id,
        name: 'agent_metrics',
        value: 1,
        labels: metrics,
      })
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
