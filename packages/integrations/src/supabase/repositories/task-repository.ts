import type { Task, TaskResult } from '@squad/core';
import type { SupabaseClient } from '../client';

export class TaskRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTask(id: string) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateTaskStatus(id: string, status: Task['status']) {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createTaskResult(result: Omit<TaskResult, 'id' | 'createdAt'>) {
    const { data, error } = await this.supabase
      .from('task_results')
      .insert(result)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTaskResult(taskId: string) {
    const { data, error } = await this.supabase
      .from('task_results')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error) throw error;
    return data;
  }
}