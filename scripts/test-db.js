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

async function testConnection() {
  try {
    console.log('Testing connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // List agents
    const { data, error } = await supabase
      .from('agents')
      .select('*');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Current agents:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();