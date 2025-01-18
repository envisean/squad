import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ControlPlane } from '../../../packages/core/src/control';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const controlPlane = new ControlPlane({
  supabaseUrl,
  supabaseKey,
  heartbeatInterval: 30000  // 30 seconds
});

serve(async (req) => {
  try {
    const { agent: agentConfig } = await req.json();
    
    // Register agent with control plane
    const agentId = await controlPlane.registerAgent({
      type: agentConfig.type,
      edgeFunction: 'agent-runner',
      config: agentConfig,
      metadata: {
        version: '1.0.0',
        region: Deno.env.get('DENO_REGION'),
        resources: {
          cpu: 1,
          memory: 512  // MB
        }
      }
    });

    // Start heartbeat
    controlPlane.startHeartbeat(agentId, async () => ({
      cpu: 0.5,  // Example metrics
      memory: 256,
      activeJobs: 1,
      errorCount: 0,
      avgResponseTime: 150
    }));

    // Subscribe to commands
    await controlPlane.subscribeToCommands(agentId, async (command) => {
      switch (command.command) {
        case 'start':
          await controlPlane.updateStatus(agentId, 'running');
          break;
        case 'stop':
          await controlPlane.updateStatus(agentId, 'idle');
          break;
        case 'pause':
          await controlPlane.updateStatus(agentId, 'idle');
          break;
        case 'resume':
          await controlPlane.updateStatus(agentId, 'running');
          break;
        case 'update':
          // Handle agent update
          break;
      }

      // Mark command as completed
      await controlPlane.updateCommandStatus(command.id, 'completed');
    });

    // Keep the function running
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Agent runner error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});