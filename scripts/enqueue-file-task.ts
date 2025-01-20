import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Create Supabase client with connection pooling
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function enqueueTask() {
  try {
    console.log('Finding available agent...');

    // Get the first available file processor agent
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('edge_function', 'file-processor')
      .eq('status', 'idle')
      .limit(1);

    if (agentError) {
      console.error('Error finding agent:', agentError);
      return;
    }

    if (!agents || agents.length === 0) {
      console.error('No available file processor agents found');
      return;
    }

    const agent = agents[0];
    console.log('Found agent:', agent.id);

    // Enqueue a test task
    console.log('Enqueueing test task...');
    const { data: task, error: taskError } = await supabase
      .from('task_queues')
      .insert([
        {
          agent_id: agent.id,
          task_type: 'file-processing',
          priority: 'medium',
          status: 'pending',
          payload: {
            fileUrl: 'https://raw.githubusercontent.com/envisean/squad/main/package.json',
            type: 'json'
          }
        }
      ])
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      return;
    }

    console.log('Task enqueued successfully:', task);

  } catch (error) {
    console.error('Error:', error);
  }
}

enqueueTask();