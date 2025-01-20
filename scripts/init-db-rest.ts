import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Read the SQL file
    const sql = readFileSync(
      join(__dirname, '..', 'supabase', 'init.sql'),
      'utf8'
    );

    // Execute SQL through REST API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          query: sql
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute SQL: ${error}`);
    }

    console.log('Database initialization completed!');
    console.log('Response:', await response.text());

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();