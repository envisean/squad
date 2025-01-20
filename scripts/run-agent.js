const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

async function processFile(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const content = await response.text();
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`File processing failed: ${error.message}`);
  }
}

async function runAgent() {
  try {
    console.log('Starting agent...');
    
    // Register agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert([
        {
          type: 'job',
          status: 'idle',
          edge_function: 'file-processor',
          config: {
            supportedTypes: ['json', 'yaml', 'csv', 'text'],
            maxFileSize: 1024 * 1024
          }
        }
      ])
      .select()
      .single();

    if (agentError) {
      console.error('Error registering agent:', agentError);
      return;
    }

    console.log('Agent registered:', agent.id);

    // Process tasks in a loop
    while (true) {
      // Get next task
      const { data: tasks, error: taskError } = await supabase
        .rpc('claim_next_task', {
          p_agent_id: agent.id,
          p_task_types: ['file-processing']
        });

      if (taskError) {
        console.error('Error claiming task:', taskError);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      if (!tasks || tasks.length === 0) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      const task = tasks[0];
      console.log('Processing task:', task.id);

      try {
        // Process the file
        const result = await processFile(task.payload.fileUrl);

        // Complete the task
        await supabase
          .rpc('complete_task', {
            p_task_id: task.id,
            p_result: result
          });

        console.log('Task completed:', task.id);
      } catch (error) {
        console.error('Task failed:', error);
        
        // Fail the task
        await supabase
          .rpc('fail_task', {
            p_task_id: task.id,
            p_error: error.message
          });
      }
    }
  } catch (error) {
    console.error('Agent error:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit();
});

runAgent();