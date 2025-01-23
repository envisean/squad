import { BaseAgent } from '@squad/core';
import { loadEnv } from './utils/env';

// Load environment variables
loadEnv();

async function testAgent() {
  // Initialize your agent with config
  const agent = new YourAgent({
    // agent-specific config here
  });

  // Run the agent
  const result = await agent.processTask({
    type: 'your-task-type',
    id: 'test-1',
    input: {
      // task-specific input here
    }
  });

  console.log('\nTask Result:', result);
}

testAgent().catch(console.error); 