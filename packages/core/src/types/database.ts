export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          name: string;
          description: string;
          type: string;
          model: string;
          parameters: Record<string, unknown>;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      agent_states: {
        Row: {
          id: string;
          agent_id: string;
          status: string;
          last_active: string;
          current_task: string | null;
          memory: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_states']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agent_states']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          agent_id: string | null;
          parent_task_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      task_results: {
        Row: {
          id: string;
          task_id: string;
          output: unknown;
          error: string | null;
          metadata: Record<string, unknown> | null;
          completed_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['task_results']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['task_results']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}