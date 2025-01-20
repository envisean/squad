const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Try to access the database
    const { data, error } = await supabase
      .from('_schema')
      .select('*')
      .limit(1);

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