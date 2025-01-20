import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

async function createAgent() {
  try {
    console.log('Creating test agent...');

    // Create agent using REST API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          type: 'job',
          status: 'idle',
          edge_function: 'file-processor',
          config: {
            supportedTypes: ['json', 'yaml', 'csv', 'text'],
            maxFileSize: 1024 * 1024
          },
          metadata: {
            version: '1.0.0'
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create agent: ${error}`);
    }

    const agent = await response.json();
    console.log('Agent created successfully:', agent);

  } catch (error) {
    console.error('Error:', error);
  }
}

createAgent();