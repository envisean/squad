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

async function checkTasks() {
  try {
    // List all tasks
    const { data: tasks, error } = await supabase
      .from('task_queues')
      .select('*');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Current tasks:', tasks);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTasks();