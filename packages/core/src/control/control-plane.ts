import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { QueueManager } from './queue-manager';
import { RealtimeChannel } from '@supabase/supabase-js';
import type {
  AgentRegistration,
  AgentHeartbeat,
  AgentControlCommand,
  AgentCommand,
  AgentStatus
} from './types';

interface ControlPlaneConfig {
  supabaseUrl: string;
  supabaseKey: string;
  heartbeatInterval?: number; // milliseconds
  heartbeatTimeout?: number;  // milliseconds
}

export class ControlPlane {
  private supabase: SupabaseClient;
  private config: ControlPlaneConfig;
  private commandChannel?: RealtimeChannel;
  private heartbeatInterval?: NodeJS.Timer;
  private queueManager: QueueManager;

  constructor(config: ControlPlaneConfig) {
    this.config = {
      heartbeatInterval: 30000,  // 30 seconds
      heartbeatTimeout: 90000,   // 90 seconds
      ...config
    };

    this.supabase = createClient(
      config.supabaseUrl,
      config.supabaseKey
    );

    this.queueManager = new QueueManager(
      config.supabaseUrl,
      config.supabaseKey
    );
  }

  // Agent Registration
  async registerAgent(registration: Omit<AgentRegistration, 'id'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('agents')
      .insert({
        ...registration,
        status: 'idle',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async unregisterAgent(agentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('agents')
      .update({
        status: 'terminated',
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);

    if (error) throw error;
  }

  // Agent Control
  async sendCommand(
    agentId: string,
    command: AgentCommand,
    parameters: Record<string, unknown> = {}
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('agent_controls')
      .insert({
        agentId,
        command,
        parameters,
        status: 'pending',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateCommandStatus(
    commandId: string,
    status: 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('agent_controls')
      .update({
        status,
        error,
        updated_at: new Date().toISOString()
      })
      .eq('id', commandId);

    if (updateError) throw updateError;
  }

  // Agent Status Management
  async updateStatus(agentId: string, status: AgentStatus): Promise<void> {
    const { error } = await this.supabase
      .from('agents')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);

    if (error) throw error;
  }

  async sendHeartbeat(heartbeat: Omit<AgentHeartbeat, 'timestamp'>): Promise<void> {
    const { error } = await this.supabase
      .from('agent_heartbeats')
      .insert({
        ...heartbeat,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Command Subscription
  async subscribeToCommands(
    agentId: string,
    onCommand: (command: AgentControlCommand) => Promise<void>
  ): Promise<void> {
    this.commandChannel = this.supabase
      .channel(`agent-commands:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_controls',
          filter: `agentId=eq.${agentId}`
        },
        async (payload) => {
          try {
            await onCommand(payload.new as AgentControlCommand);
          } catch (error) {
            console.error('Error processing command:', error);
            // Update command status as failed
            await this.updateCommandStatus(
              payload.new.id,
              'failed',
              error.message
            );
          }
        }
      )
      .subscribe();
  }

  // Heartbeat Management
  startHeartbeat(agentId: string, metrics: () => Promise<AgentHeartbeat['metrics']>): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const currentMetrics = await metrics();
        await this.sendHeartbeat({
          agentId,
          metrics: currentMetrics
        });
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    }, this.config.heartbeatInterval);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  // Agent Discovery
  async getActiveAgents(): Promise<AgentRegistration[]> {
    const cutoff = new Date(
      Date.now() - (this.config.heartbeatTimeout || 90000)
    ).toISOString();

    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .neq('status', 'terminated')
      .gt('updated_at', cutoff);

    if (error) throw error;
    return data;
  }

  async getAgentMetrics(agentId: string): Promise<AgentHeartbeat[]> {
    const { data, error } = await this.supabase
      .from('agent_heartbeats')
      .select('*')
      .eq('agentId', agentId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  }

  // Cleanup
  // Queue Management
  async enqueueTask(task: TaskQueueEntry): Promise<string> {
    return this.queueManager.enqueueTask(task);
  }

  async enqueueWorkflow(workflow: OrchestratorQueueEntry): Promise<string> {
    return this.queueManager.enqueueWorkflow(workflow);
  }

  async getNextTask(agentId: string, taskTypes: string[]): Promise<TaskQueueEntry | null> {
    return this.queueManager.claimNextTask(agentId, taskTypes);
  }

  async getNextWorkflow(orchestratorId: string, workflowTypes: string[]): Promise<OrchestratorQueueEntry | null> {
    return this.queueManager.claimNextWorkflow(orchestratorId, workflowTypes);
  }

  async completeTask(taskId: string, result?: Record<string, unknown>): Promise<void> {
    await this.queueManager.completeTask(taskId, result);
  }

  async completeWorkflow(workflowId: string, result?: Record<string, unknown>): Promise<void> {
    await this.queueManager.completeWorkflow(workflowId, result);
  }

  async failTask(taskId: string, error: Error): Promise<void> {
    await this.queueManager.failTask(taskId, error);
  }

  async failWorkflow(workflowId: string, error: Error): Promise<void> {
    await this.queueManager.failWorkflow(workflowId, error);
  }

  async getQueueMetrics(agentId: string): Promise<QueueMetrics> {
    return this.queueManager.getQueueMetrics(agentId);
  }

  subscribeToTaskUpdates(agentId: string, onUpdate: (task: TaskQueueEntry) => void) {
    return this.queueManager.subscribeToTaskUpdates(agentId, onUpdate);
  }

  subscribeToWorkflowUpdates(orchestratorId: string, onUpdate: (workflow: OrchestratorQueueEntry) => void) {
    return this.queueManager.subscribeToWorkflowUpdates(orchestratorId, onUpdate);
  }

  async cleanup(): Promise<void> {
    this.stopHeartbeat();
    if (this.commandChannel) {
      await this.commandChannel.unsubscribe();
    }
  }
}