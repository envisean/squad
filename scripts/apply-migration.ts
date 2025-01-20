import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  try {
    console.log('Applying migration...');

    // Read migration file
    const sql = readFileSync(
      join(__dirname, '..', 'supabase', 'migrations', '20240120000001_update_agents.sql'),
      'utf8'
    );

    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql
    });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();