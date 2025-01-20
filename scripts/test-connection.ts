import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');

    // Test connection using our test function
    const { data, error } = await supabase
      .rpc('test_connection');

    if (error) {
      console.error('Connection error:', error);
      process.exit(1);
    }

    console.log('Connection successful!');
    console.log('Database response:', data);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testConnection();