import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // First, let's try to enable the pgvector extension
    const { data: extensionData, error: extensionError } = await supabase
      .from('extensions')
      .select('*')
      .eq('name', 'vector')
      .single();

    if (extensionError) {
      console.log('Creating vector extension...');
      const { error } = await supabase.rpc('create_extension', {
        name: 'vector'
      });
      if (error) console.error('Error creating extension:', error);
    }

    // Create agents table
    console.log('\nCreating agents table...');
    const { error: agentsError } = await supabase.rpc('create_table', {
      table_name: 'agents',
      definition: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL CHECK (type IN ('strategic', 'job')),
        status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'error', 'terminated')),
        edge_function TEXT NOT NULL,
        config JSONB NOT NULL DEFAULT '{}',
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      `
    });
    
    if (agentsError) console.error('Error creating agents table:', agentsError);

    // Create memory_embeddings table
    console.log('\nCreating memory_embeddings table...');
    const { error: memoryError } = await supabase.rpc('create_table', {
      table_name: 'memory_embeddings',
      definition: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        embedding vector(1536),
        type TEXT NOT NULL,
        agent_id UUID NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      `
    });

    if (memoryError) console.error('Error creating memory_embeddings table:', memoryError);

    // Test the connection by inserting a test agent
    console.log('\nTesting connection with test agent...');
    const { data: agent, error: insertError } = await supabase
      .from('agents')
      .insert({
        type: 'strategic',
        status: 'idle',
        edge_function: 'test',
        config: { test: true }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting test agent:', insertError);
    } else {
      console.log('Test agent created:', agent);
    }

    console.log('\nDatabase initialization completed!');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();