import { FileProcessorAgent } from '../packages/agents/src/examples/file-processor';
import { ControlPlane } from '../packages/core/src/control';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  try {
    // Initialize agent
    const agent = new FileProcessorAgent({
      supportedTypes: ['json', 'yaml', 'csv', 'text'],
      maxFileSize: 1024 * 1024, // 1MB
      outputFormat: 'json'
    });

    // Initialize control plane
    const controlPlane = new ControlPlane({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
    });

    // Register agent
    console.log('Registering agent...');
    const agentId = await controlPlane.registerAgent({
      type: 'job',
      status: 'idle',
      edge_function: 'file-processor',
      config: {
        supportedTypes: ['json', 'yaml', 'csv', 'text'],
        maxFileSize: 1024 * 1024
      }
    });

    console.log('Agent registered with ID:', agentId);

    // Start processing loop
    console.log('Starting processing loop...');
    
    while (true) {
      // Get next task
      const task = await controlPlane.getNextTask(
        agentId,
        ['file-processing']
      );

      if (task) {
        try {
          console.log('Processing task:', task.id);
          const result = await agent.processTask(task);
          await controlPlane.completeTask(task.id, result);
          console.log('Task completed:', task.id);
        } catch (error) {
          console.error('Task failed:', error);
          await controlPlane.failTask(task.id, error as Error);
        }
      }

      // Wait before checking for new tasks
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('Agent error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  process.exit();
});

main().catch(console.error);