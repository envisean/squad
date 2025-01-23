const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Agent type definitions (matching build-agent.js)
const AGENT_TYPES = {
  ORCHESTRATOR: 'orchestrator',
  DOMAIN: 'domain',
  LEGACY: 'legacy'
};

// Helper to find agent directory (reuse from build-agent.js)
function findAgentDirectory(agentName, type) {
  const basePath = path.join(__dirname, '../packages/agents/src');
  
  switch(type) {
    case AGENT_TYPES.ORCHESTRATOR:
      return path.join(basePath, 'orchestrators', agentName);
    case AGENT_TYPES.DOMAIN:
      const domainDirs = fs.readdirSync(path.join(basePath, 'domain'));
      for (const dir of domainDirs) {
        const agentPath = path.join(basePath, 'domain', dir, agentName);
        if (fs.existsSync(agentPath)) {
          return agentPath;
        }
      }
      return null;
    case AGENT_TYPES.LEGACY:
      return path.join(basePath, 'agents', agentName);
    default:
      return null;
  }
}

// Validate agent exists
function validateAgent(agentName, type, customPath = null) {
  if (customPath) {
    if (!fs.existsSync(customPath)) {
      console.error(`Agent not found at path: ${customPath}`);
      process.exit(1);
    }
    return customPath;
  }

  const agentPath = findAgentDirectory(agentName, type);
  if (!agentPath || !fs.existsSync(agentPath)) {
    console.error(`Agent "${agentName}" not found in ${type} directory`);
    process.exit(1);
  }
  return agentPath;
}

async function deployAgent(agentName, type = AGENT_TYPES.DOMAIN, customPath = null) {
  // Validate agent exists
  const agentPath = validateAgent(agentName, type, customPath);
  console.log(`Deploying ${type} agent: ${agentName}`);

  // Orchestrator agents don't get deployed to edge functions
  if (type === AGENT_TYPES.ORCHESTRATOR) {
    console.log('Orchestrator agents are not deployed to edge functions');
    process.exit(0);
  }

  try {
    // Ensure edge function directory exists
    const edgeFunctionPath = path.join(__dirname, `../supabase/functions/${agentName}`);
    if (!fs.existsSync(edgeFunctionPath)) {
      console.error(`Edge function directory not found: ${edgeFunctionPath}`);
      console.error('Please create the edge function directory first');
      process.exit(1);
    }

    // Ensure dist directory exists
    const distPath = path.join(edgeFunctionPath, 'dist');
    if (!fs.existsSync(distPath)) {
      console.error(`Agent build not found: ${distPath}`);
      console.error('Please build the agent first with: pnpm build:agent');
      process.exit(1);
    }

    // Deploy using Supabase CLI
    console.log('\nDeploying to Supabase...');
    execSync(`supabase functions deploy ${agentName}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    console.log(`\n✅ Successfully deployed ${agentName} to Supabase Edge Functions`);

  } catch (error) {
    console.error('\n❌ Deploy failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments (matching build-agent.js pattern)
const args = process.argv.slice(2);
let type = AGENT_TYPES.DOMAIN; // Default to domain agent
let agentName = args[0];
let customPath = null;

if (args[0] === '--orchestrator' || args[0] === '-o') {
  type = AGENT_TYPES.ORCHESTRATOR;
  agentName = args[1];
} else if (args[0] === '--path' || args[0] === '-p') {
  customPath = path.resolve(args[1]);
  agentName = path.basename(path.dirname(customPath));
} else if (args[0] === '--legacy' || args[0] === '-l') {
  type = AGENT_TYPES.LEGACY;
  agentName = args[1];
}

if (!agentName) {
  console.error('Please specify an agent name');
  process.exit(1);
}

deployAgent(agentName, type, customPath); 