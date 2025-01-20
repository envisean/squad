import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function initializeDatabase() {
  try {
    console.log('Testing database connection...');

    // Try to insert a test agent
    const { data, error } = await supabase
      .from('agents')
      .insert({
        type: 'job',
        status: 'idle',
        edgefunction: 'test',
        config: { test: true },
        metadata: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('Successfully inserted test agent:', data);
    console.log('Database connection working!');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();