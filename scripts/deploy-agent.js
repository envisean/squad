const { execSync } = require('child_process');
const path = require('path');

// Add validation for agent existence
function validateAgent(agentName) {
  const agentPath = path.join(__dirname, `../supabase/functions/${agentName}`);
  if (!require('fs').existsSync(agentPath)) {
    console.error(`Agent "${agentName}" not found in supabase/functions/`);
    process.exit(1);
  }
}

function deployAgent(agentName) {
  validateAgent(agentName);
  console.log(`Deploying agent: ${agentName}`);
  
  try {
    // Deploy using Supabase CLI
    execSync(`supabase functions deploy ${agentName}`, {
      cwd: path.join(__dirname, '../'),
      stdio: 'inherit'
    });

    console.log(`\n✅ Successfully deployed ${agentName} edge function`);
  } catch (error) {
    console.error(`\n❌ Failed to deploy ${agentName}:`, error.message);
    process.exit(1);
  }
}

const agentName = process.argv[2];
if (!agentName) {
  console.error('Please specify an agent name');
  process.exit(1);
}

deployAgent(agentName); 