const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Agent type definitions
const AGENT_TYPES = {
  ORCHESTRATOR: 'orchestrator',
  DOMAIN: 'domain',
  LEGACY: 'legacy'
};

// Helper to find agent directory
function findAgentDirectory(agentName, type) {
  const basePath = path.join(__dirname, '../packages/agents/src');
  
  switch(type) {
    case AGENT_TYPES.ORCHESTRATOR:
      return path.join(basePath, 'orchestrators', agentName);
    
    case AGENT_TYPES.DOMAIN:
      // Search through domain directories
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

function buildAgent(agentName, type = AGENT_TYPES.DOMAIN, customPath = null) {
  const agentPath = validateAgent(agentName, type, customPath);
  console.log(`Building ${type} agent: ${agentName}`);
  
  // Determine entry point relative to packages/agents/src
  const relativePath = path.relative(
    path.join(__dirname, '../packages/agents/src'),
    agentPath
  );
  
  // Create agent-specific tsup config
  const tsupConfig = {
    entry: [`src/${relativePath}/index.ts`],
    format: ['esm'],
    dts: {
      entry: `src/${relativePath}/index.ts`,
      resolve: true,
      compilerOptions: {
        moduleResolution: "node",
        composite: false,
        incremental: false,
        include: [
          `src/${relativePath}/**/*`,
          "src/types/**/*"
        ]
      }
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
      'zod'
    ],
    noExternal: ['@squad/core'],
    esbuildOptions(options) {
      options.treeShaking = true;
      options.ignoreAnnotations = false;
    }
  };

  // Write temporary config
  const configPath = path.join(__dirname, `../packages/agents/tsup.${agentName}.config.js`);
  fs.writeFileSync(
    configPath,
    `module.exports = ${JSON.stringify(tsupConfig, null, 2)}`
  );

  try {
    // Build using agent-specific config
    execSync(`pnpm tsup --config tsup.${agentName}.config.js`, {
      cwd: path.join(__dirname, '../packages/agents'),
      stdio: 'inherit'
    });

    // Copy to edge function directory if needed
    if (type !== AGENT_TYPES.ORCHESTRATOR) {
      execSync(`mkdir -p supabase/functions/${agentName}/dist && cp -r packages/agents/dist/* supabase/functions/${agentName}/dist/`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
    }
  } finally {
    // Cleanup temp config
    fs.unlinkSync(configPath);
  }
}

// Parse command line arguments
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

buildAgent(agentName, type, customPath); 