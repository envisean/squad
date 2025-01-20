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

async function applyMigrations() {
  console.log('Applying migrations...');

  try {
    // Read migration files
    const migrations = [
      '20240117000001_memory_system.sql',
      '20240117000002_control_plane.sql',
      '20240117000003_task_queues.sql'
    ];

    for (const migration of migrations) {
      console.log(`\nApplying migration: ${migration}`);
      const sql = readFileSync(
        join(__dirname, '..', 'supabase', 'migrations', migration),
        'utf8'
      );

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Execute each statement
      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          console.error('Error executing statement:', error);
          console.error('Statement:', statement);
        }
      }
    }

    console.log('\nMigrations completed successfully!');
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  }
}

applyMigrations();