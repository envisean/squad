import { ControlPlane } from '../packages/core/src/control';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  try {
    // Initialize control plane
    const controlPlane = new ControlPlane({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
    });

    // Get the first available file processor agent
    const agents = await controlPlane.getActiveAgents();
    const fileProcessor = agents.find(a => 
      a.edgeFunction === 'file-processor' && 
      a.status === 'idle'
    );

    if (!fileProcessor) {
      throw new Error('No available file processor agent found');
    }

    // Enqueue a test task
    console.log('Enqueueing test task...');
    const taskId = await controlPlane.enqueueTask({
      agentId: fileProcessor.id,
      taskType: 'file-processing',
      priority: 'medium',
      payload: {
        fileUrl: 'https://raw.githubusercontent.com/envisean/squad/main/package.json',
        type: 'json'
      }
    });

    console.log('Task enqueued with ID:', taskId);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);