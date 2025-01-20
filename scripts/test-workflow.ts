import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    }
  }
);

async function testWorkflow() {
  try {
    // 1. List current agents
    console.log('\nListing current agents...');
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError) throw agentsError;
    console.log('Agents:', agents);

    // 2. List current tasks
    console.log('\nListing current tasks...');
    const { data: tasks, error: tasksError } = await supabase
      .from('task_queues')
      .select('*');

    if (tasksError) throw tasksError;
    console.log('Tasks:', tasks);

    // 3. Create a test task
    console.log('\nCreating test task...');
    if (agents && agents.length > 0) {
      const { data: newTask, error: createError } = await supabase
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
        .select()
        .single();

      if (createError) throw createError;
      console.log('Created task:', newTask);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testWorkflow();