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

async function createAgent() {
  try {
    console.log('Creating test agent...');

    // Create agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert([
        {
          type: 'job',
          status: 'idle',
          edgefunction: 'file-processor',
          config: {
            supportedTypes: ['json', 'yaml', 'csv', 'text'],
            maxFileSize: 1024 * 1024
          },
          metadata: {
            version: '1.0.0'
          }
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return;
    }

    console.log('Agent created successfully:', agent);

  } catch (error) {
    console.error('Error:', error);
  }
}

createAgent();