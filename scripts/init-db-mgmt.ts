import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

// Extract project reference from URL
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
  .split('//')[1]
  .split('.')[0];

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    console.log('Project ref:', projectRef);

    // Read the SQL file
    const sql = readFileSync(
      join(__dirname, '..', 'supabase', 'init.sql'),
      'utf8'
    );

    // Execute SQL through Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          query: sql
        })
      }
    );

    const result = await response.text();
    console.log('Response:', result);

    if (!response.ok) {
      throw new Error(`Failed to execute SQL: ${result}`);
    }

    console.log('Database initialization completed!');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();