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

async function checkQueue() {
  try {
    // Check agents
    console.log('\nChecking agents...');
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*');

    if (agentError) {
      console.error('Error checking agents:', agentError);
    } else {
      console.log('Agents:', agents);
    }

    // Check tasks
    console.log('\nChecking tasks...');
    const { data: tasks, error: taskError } = await supabase
      .from('task_queues')
      .select('*');

    if (taskError) {
      console.error('Error checking tasks:', taskError);
    } else {
      console.log('Tasks:', tasks);
    }

    // Check if claim_next_task function exists
    console.log('\nChecking claim_next_task function...');
    const { data: funcTest, error: funcError } = await supabase
      .rpc('claim_next_task', {
        p_agent_id: agents?.[0]?.id,
        p_task_types: ['file-processing']
      });

    if (funcError) {
      console.error('Error testing claim_next_task:', funcError);
    } else {
      console.log('Function test result:', funcTest);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkQueue();