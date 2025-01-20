const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

async function createTask() {
  try {
    console.log('Creating test task...');
    
    // Get first available agent
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'idle')
      .limit(1);

    if (agentError) {
      console.error('Error finding agent:', agentError);
      return;
    }

    if (!agents || agents.length === 0) {
      console.error('No available agents found');
      return;
    }

    const agent = agents[0];
    console.log('Using agent:', agent.id);

    // Create task
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
      .select();

    if (taskError) {
      console.error('Error creating task:', taskError);
      return;
    }

    console.log('Task created:', task);
  } catch (error) {
    console.error('Error:', error);
  }
}

createTask();