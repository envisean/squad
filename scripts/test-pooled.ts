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

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Try to list tables
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Current agents:', data);
    console.log('Connection successful!');

  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();