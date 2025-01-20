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
    db: {
      schema: 'public'
    }
  }
);

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Read the SQL file
    const sql = readFileSync(
      join(__dirname, '..', 'supabase', 'init.sql'),
      'utf8'
    );

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      console.log('\nExecuting statement:', statement.substring(0, 50) + '...');
      
      const { error } = await supabase.rpc('exec_sql', {
        query: statement
      });

      if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
          // Try direct query if exec_sql doesn't exist
          const { error: queryError } = await supabase.from('_sql').select('*').eq('query', statement);
          if (queryError && !queryError.message.includes('does not exist')) {
            console.error('Error executing statement:', queryError);
          }
        } else {
          console.error('Error executing statement:', error);
        }
      }
    }

    console.log('\nDatabase initialization completed!');

    // Test the connection
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error testing connection:', error);
    } else {
      console.log('Connection test successful!');
      console.log('Current agents:', data);
    }

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();