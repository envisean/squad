import path from 'path'
import fs from 'fs'
import { loadEnv } from '../packages/core/src/utils/env'
import cliProgress from 'cli-progress'
import chalk from 'chalk'

// Load environment variables
loadEnv()

const BASE_PATH = path.join(__dirname, '../packages/agents/src')

// Create progress bar
const progressBar = new cliProgress.SingleBar(
  {
    format: chalk.cyan('{bar}') + ' | {percentage}% | {state} | Elapsed: {duration_formatted}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  },
  cliProgress.Presets.shades_classic
)

// Helper to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

// Helper to find agent directory (reusing pattern from build-agent.js)
function findAgentDirectory(agentPath: string) {
  // Check if path includes domain directory
  if (agentPath.includes('/')) {
    const [domain, agentName] = agentPath.split('/')
    // Handle domain-agents path
    if (domain.endsWith('-agents')) {
      const fullPath = path.join(BASE_PATH, domain, agentName)
      return fs.existsSync(fullPath) ? fullPath : null
    }
  }

  // Search for agent name in all domain directories
  const matches = []
  const dirs = fs.readdirSync(BASE_PATH)

  for (const dir of dirs) {
    // Skip non-domain directories
    if (!dir.endsWith('-agents')) continue

    const agentDir = path.join(BASE_PATH, dir, agentPath)
    if (fs.existsSync(agentDir)) {
      matches.push({ path: agentDir, domain: dir })
    }
  }

  if (matches.length > 1) {
    console.error('Multiple matching agents found:')
    matches.forEach(match => {
      console.error(`  - ${match.domain}/${path.basename(agentPath)}`)
    })
    console.error('Please specify the domain: pnpm test:agent <domain-agents>/<agent-name>')
    process.exit(1)
  }

  return matches[0]?.path || null
}

// Helper to find orchestrator
function findOrchestratorDirectory(agentName: string) {
  const orchestratorPath = path.join(BASE_PATH, 'orchestrators', agentName)
  return fs.existsSync(orchestratorPath) ? orchestratorPath : null
}

// Helper to find legacy agent
function findLegacyDirectory(agentName: string) {
  const legacyPath = path.join(BASE_PATH, 'agents', agentName)
  return fs.existsSync(legacyPath) ? legacyPath : null
}

async function testAgent(agentPath: string, isOrchestrator = false) {
  let fullPath: string | null

  if (isOrchestrator) {
    fullPath = findOrchestratorDirectory(agentPath)
    if (!fullPath) {
      console.error(`Orchestrator "${agentPath}" not found`)
      process.exit(1)
    }
  } else {
    fullPath = findAgentDirectory(agentPath)
    if (!fullPath) {
      // Try legacy as last resort
      fullPath = findLegacyDirectory(agentPath)
      if (!fullPath) {
        console.error(`Agent "${agentPath}" not found`)
        process.exit(1)
      }
    }
  }

  const agentName = path.basename(agentPath)
  const agentType = path.basename(path.dirname(fullPath))
  console.log(`Testing ${agentType} agent: ${agentName}\n`)

  try {
    // Start progress bar
    progressBar.start(100, 0, { state: 'Initializing test...', duration_formatted: '0s' })
    const startTime = Date.now()

    // Import and run the agent's test file
    const testModule = await import(path.join(fullPath, '__tests__/local.ts'))

    // Update progress periodically
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      progressBar.update(50, {
        state: 'Running tests...',
        duration_formatted: formatDuration(elapsed),
      })
    }, 100)

    await testModule.default()

    // Clean up and show success
    clearInterval(progressInterval)
    const totalTime = Date.now() - startTime
    progressBar.update(100, {
      state: 'Tests completed',
      duration_formatted: formatDuration(totalTime),
    })
    progressBar.stop()
    console.log(chalk.green('\n✓ Tests completed successfully\n'))
  } catch (error: unknown) {
    // Clean up and show error
    progressBar.stop()
    console.error(chalk.red('\n✗ Test failed:'), error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const agentPath = args[0]

if (!agentPath) {
  console.error('Please specify an agent path')
  console.error('Examples:')
  console.error('  pnpm test:agent sales-prospecting')
  console.error('  pnpm test:agent sales-agents/sales-prospecting')
  process.exit(1)
}

// Determine if this is an orchestrator test
const isOrchestrator = process.env.npm_lifecycle_event === 'test:orchestrator'

testAgent(agentPath, isOrchestrator)
