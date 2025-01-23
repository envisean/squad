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
    console.error('Please specify the domain: pnpm build:agent <domain-agents>/<agent-name>')
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

function buildAgent(agentPath, isOrchestrator = false) {
  let fullPath

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
  console.log(`Building ${agentType} agent: ${agentName}`)

  // Determine entry point relative to packages/agents/src
  const relativePath = path.relative(path.join(__dirname, '../packages/agents/src'), fullPath)

  // Create agent-specific tsup config
  const tsupConfig = {
    entry: [`src/${relativePath}/index.ts`],
    format: ['esm'],
    dts: {
      entry: `src/${relativePath}/index.ts`,
      resolve: true,
      compilerOptions: {
        moduleResolution: 'node',
        composite: false,
        incremental: false,
        include: [`src/${relativePath}/**/*`, 'src/types/**/*'],
      },
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    treeshake: true,
    external: [
      '@langchain/community',
      '@langchain/openai',
      '@langchain/core',
      'langchain',
      '@supabase/supabase-js',
      'zod',
    ],
    noExternal: ['@squad/core'],
    esbuildOptions(options) {
      options.treeShaking = true
      options.ignoreAnnotations = false
    },
  }

  // Write temporary config
  const configPath = path.join(__dirname, `../packages/agents/tsup.${agentName}.config.js`)
  fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(tsupConfig, null, 2)}`)

  try {
    // Build using agent-specific config
    execSync(`pnpm tsup --config tsup.${agentName}.config.js`, {
      cwd: path.join(__dirname, '../packages/agents'),
      stdio: 'inherit',
    })

    // Copy to edge function directory if needed
    if (!isOrchestrator) {
      execSync(
        `mkdir -p supabase/functions/${agentName}/dist && cp -r packages/agents/dist/* supabase/functions/${agentName}/dist/`,
        {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        }
      )
    }
  } finally {
    // Cleanup temp config
    fs.unlinkSync(configPath)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const agentPath = args[0]

if (!agentPath) {
  console.error('Please specify an agent path')
  console.error('Examples:')
  console.error('  pnpm build:agent sales-prospecting')
  console.error('  pnpm build:agent sales-agents/sales-prospecting')
  process.exit(1)
}

// Determine if this is an orchestrator build
const isOrchestrator = process.env.npm_lifecycle_event === 'build:orchestrator'

buildAgent(agentPath, isOrchestrator)
