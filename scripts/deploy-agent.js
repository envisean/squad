const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Helper to find agent directory
function findAgentDirectory(agentPath) {
  const basePath = path.join(__dirname, '../packages/agents/src')

  // Check if path includes domain directory
  if (agentPath.includes('/')) {
    const [domain, agentName] = agentPath.split('/')
    // Handle domain-agents path
    if (domain.endsWith('-agents')) {
      const fullPath = path.join(basePath, domain, agentName)
      return fs.existsSync(fullPath) ? fullPath : null
    }
  }

  // Search for agent name in all domain directories
  const matches = []
  const dirs = fs.readdirSync(basePath)

  for (const dir of dirs) {
    // Skip non-domain directories
    if (!dir.endsWith('-agents')) continue

    const agentDir = path.join(basePath, dir, agentPath)
    if (fs.existsSync(agentDir)) {
      matches.push({ path: agentDir, domain: dir })
    }
  }

  if (matches.length > 1) {
    console.error('Multiple matching agents found:')
    matches.forEach(match => {
      console.error(`  - ${match.domain}/${path.basename(agentPath)}`)
    })
    console.error('Please specify the domain: pnpm deploy:agent <domain-agents>/<agent-name>')
    process.exit(1)
  }

  return matches[0]?.path || null
}

// Helper to find orchestrator
function findOrchestratorDirectory(agentName) {
  const orchestratorPath = path.join(__dirname, '../packages/agents/src/orchestrators', agentName)
  return fs.existsSync(orchestratorPath) ? orchestratorPath : null
}

// Helper to find legacy agent
function findLegacyDirectory(agentName) {
  const legacyPath = path.join(__dirname, '../packages/agents/src/agents', agentName)
  return fs.existsSync(legacyPath) ? legacyPath : null
}

async function deployAgent(agentPath, isOrchestrator = false) {
  let fullPath

  if (isOrchestrator) {
    fullPath = findOrchestratorDirectory(agentPath)
    if (!fullPath) {
      console.error(`Orchestrator "${agentPath}" not found`)
      process.exit(1)
    }
    // Orchestrator agents don't get deployed to edge functions
    console.log('Orchestrator agents are not deployed to edge functions')
    process.exit(0)
  }

  fullPath = findAgentDirectory(agentPath)
  if (!fullPath) {
    // Try legacy as last resort
    fullPath = findLegacyDirectory(agentPath)
    if (!fullPath) {
      console.error(`Agent "${agentPath}" not found`)
      process.exit(1)
    }
  }

  const agentName = path.basename(agentPath)
  const agentType = path.basename(path.dirname(fullPath))
  console.log(`Deploying ${agentType} agent: ${agentName}`)

  try {
    // Ensure edge function directory exists
    const edgeFunctionPath = path.join(__dirname, `../supabase/functions/${agentName}`)
    if (!fs.existsSync(edgeFunctionPath)) {
      console.error(`Edge function directory not found: ${edgeFunctionPath}`)
      console.error('Please create the edge function directory first')
      process.exit(1)
    }

    // Ensure dist directory exists
    const distPath = path.join(edgeFunctionPath, 'dist')
    if (!fs.existsSync(distPath)) {
      console.error(`Agent build not found: ${distPath}`)
      console.error('Please build the agent first with: pnpm build:agent')
      process.exit(1)
    }

    // Deploy using Supabase CLI
    console.log('\nDeploying to Supabase...')
    execSync(`supabase functions deploy ${agentName}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    })

    console.log(`\n✅ Successfully deployed ${agentName} to Supabase Edge Functions`)
  } catch (error) {
    console.error('\n❌ Deploy failed:', error.message)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const agentPath = args[0]

if (!agentPath) {
  console.error('Please specify an agent path')
  console.error('Examples:')
  console.error('  pnpm deploy:agent sales-prospecting')
  console.error('  pnpm deploy:agent sales-agents/sales-prospecting')
  process.exit(1)
}

// Determine if this is an orchestrator deploy
const isOrchestrator = process.env.npm_lifecycle_event === 'deploy:orchestrator'

deployAgent(agentPath, isOrchestrator)
