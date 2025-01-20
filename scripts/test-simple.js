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

async function test() {
  try {
    console.log('Testing connection...');
    
    // List agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError) {
      console.error('Error listing agents:', agentsError);
      return;
    }

    console.log('Current agents:', agents);

    // Create a test task if we have any agents
    if (agents && agents.length > 0) {
      const { data: task, error: taskError } = await supabase
        .from('task_queues')
        .insert([
          {
            agent_id: agents[0].id,
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

      console.log('Created task:', task);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

test();