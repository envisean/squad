import { beforeAll, afterAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

beforeAll(async () => {
  // Set up test database
  const { error } = await supabase
    .from('_test_setup')
    .select('*')
    .limit(1);

  if (error?.message.includes('relation "_test_setup" does not exist')) {
    console.log('Setting up test database...');
    // Apply migrations
    // This would typically be done through supabase db push
  }
});

afterEach(async () => {
  // Clean up test data
  await Promise.all([
    supabase.from('task_queues').delete().neq('id', ''),
    supabase.from('workflow_queues').delete().neq('id', ''),
    supabase.from('agents').delete().neq('id', '')
  ]);
});

afterAll(async () => {
  // Additional cleanup if needed
});