import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  TaskQueueEntry,
  OrchestratorQueueEntry,
  QueueMetrics,
  TaskQueueEntrySchema,
  OrchestratorQueueEntrySchema
} from './types';

export class QueueManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Task Queue Operations
  async enqueueTask(task: TaskQueueEntry): Promise<string> {
    const { data, error } = await this.supabase
      .from('task_queues')
      .insert({
        agent_id: task.agentId,
        task_type: task.taskType,
        priority: task.priority,
        payload: task.payload,
        metadata: task.metadata || {},
        max_retries: task.maxRetries,
        scheduled_for: task.scheduledFor?.toISOString() || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async claimNextTask(
    agentId: string,
    taskTypes: string[]
  ): Promise<TaskQueueEntry | null> {
    const { data, error } = await this.supabase
      .rpc('claim_next_task', {
        p_agent_id: agentId,
        p_task_types: taskTypes
      });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return {
      id: data[0].id,
      agentId,
      taskType: data[0].task_type,
      priority: data[0].priority || 'medium',
      payload: data[0].payload,
      maxRetries: data[0].max_retries || 3,
      metadata: data[0].metadata
    };
  }

  async completeTask(
    taskId: string,
    result?: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('task_queues')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...result,
          completedAt: new Date().toISOString()
        }
      })
      .eq('id', taskId);

    if (error) throw error;
  }

  async failTask(
    taskId: string,
    error: Error
  ): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('task_queues')
      .update({
        status: 'failed',
        error: error.message,
        metadata: {
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        }
      })
      .eq('id', taskId);

    if (updateError) throw updateError;
  }

  // Orchestrator Queue Operations
  async enqueueWorkflow(workflow: OrchestratorQueueEntry): Promise<string> {
    const { data, error } = await this.supabase
      .from('orchestrator_queues')
      .insert({
        orchestrator_id: workflow.orchestratorId,
        workflow_type: workflow.workflowType,
        priority: workflow.priority,
        workflow: workflow.workflow,
        metadata: workflow.metadata || {},
        sub_tasks: workflow.subTasks || [],
        scheduled_for: workflow.scheduledFor?.toISOString() || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async claimNextWorkflow(
    orchestratorId: string,
    workflowTypes: string[]
  ): Promise<OrchestratorQueueEntry | null> {
    const { data, error } = await this.supabase
      .rpc('claim_next_workflow', {
        p_orchestrator_id: orchestratorId,
        p_workflow_types: workflowTypes
      });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return {
      id: data[0].id,
      orchestratorId,
      workflowType: data[0].workflow_type,
      priority: data[0].priority || 'medium',
      workflow: data[0].workflow,
      metadata: data[0].metadata
    };
  }

  async completeWorkflow(
    workflowId: string,
    result?: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('orchestrator_queues')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...result,
          completedAt: new Date().toISOString()
        }
      })
      .eq('id', workflowId);

    if (error) throw error;
  }

  async failWorkflow(
    workflowId: string,
    error: Error
  ): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('orchestrator_queues')
      .update({
        status: 'failed',
        error: error.message,
        metadata: {
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        }
      })
      .eq('id', workflowId);

    if (updateError) throw updateError;
  }

  // Queue Monitoring
  async getQueueMetrics(agentId: string): Promise<QueueMetrics> {
    const { data, error } = await this.supabase
      .from('queue_metrics_view')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) throw error;
    
    return {
      pendingTasks: data.pending_tasks,
      processingTasks: data.processing_tasks,
      failedTasks: data.failed_tasks,
      completedTasks: data.completed_tasks,
      retryingTasks: data.retrying_tasks,
      avgProcessingTime: data.avg_processing_time,
      criticalTasks: data.critical_tasks,
      highPriorityTasks: data.high_priority_tasks
    };
  }

  // Queue Maintenance
  async retryFailedTasks(
    maxAgeHours: number = 24,
    batchSize: number = 100
  ): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('retry_failed_tasks', {
        p_max_age_hours: maxAgeHours,
        p_batch_size: batchSize
      });

    if (error) throw error;
    return data;
  }

  async cleanupCompletedTasks(
    maxAgeDays: number = 7,
    batchSize: number = 1000
  ): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('cleanup_completed_tasks', {
        p_max_age_days: maxAgeDays,
        p_batch_size: batchSize
      });

    if (error) throw error;
    return data;
  }

  // Queue Subscriptions
  subscribeToTaskUpdates(
    agentId: string,
    onUpdate: (task: TaskQueueEntry) => void
  ) {
    return this.supabase
      .channel(`task-updates-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_queues',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          onUpdate(payload.new as TaskQueueEntry);
        }
      )
      .subscribe();
  }

  subscribeToWorkflowUpdates(
    orchestratorId: string,
    onUpdate: (workflow: OrchestratorQueueEntry) => void
  ) {
    return this.supabase
      .channel(`workflow-updates-${orchestratorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orchestrator_queues',
          filter: `orchestrator_id=eq.${orchestratorId}`
        },
        (payload) => {
          onUpdate(payload.new as OrchestratorQueueEntry);
        }
      )
      .subscribe();
  }
}