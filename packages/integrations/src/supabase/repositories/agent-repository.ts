import type { AgentConfig, AgentState } from '@squad/core';
import type { SupabaseClient } from '../client';

export class AgentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createAgent(agent: Omit<AgentConfig, 'id'>) {
    const { data, error } = await this.supabase
      .from('agents')
      .insert(agent)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAgent(id: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateAgentState(state: Omit<AgentState, 'id'>) {
    const { data, error } = await this.supabase
      .from('agent_states')
      .upsert({ agent_id: state.agentId, ...state })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAgentState(agentId: string) {
    const { data, error } = await this.supabase
      .from('agent_states')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) throw error;
    return data;
  }
}