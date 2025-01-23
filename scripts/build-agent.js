const { execSync } = require('child_process');
const path = require('path');

// Add validation for agent existence
function validateAgent(agentName) {
  const agentPath = path.join(__dirname, `../packages/agents/src/agents/${agentName}`);
  if (!require('fs').existsSync(agentPath)) {
    console.error(`Agent "${agentName}" not found in packages/agents/src/agents/`);
    process.exit(1);
  }
}

function buildAgent(agentName) {
  validateAgent(agentName);
  console.log(`Building agent: ${agentName}`);
  
  // Create agent-specific tsup config
  const tsupConfig = {
    entry: [`src/agents/${agentName}/index.ts`],
    format: ['esm'],
    dts: {
      entry: `src/agents/${agentName}/index.ts`,
      resolve: true,
      compilerOptions: {
        moduleResolution: "node",
        composite: false,
        incremental: false,
        include: [
          `src/agents/${agentName}/**/*`,
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
    // This tells esbuild to only include used exports
    esbuildOptions(options) {
      options.treeShaking = true;
      options.ignoreAnnotations = false;
    }
  };

  // Write temporary config
  const configPath = path.join(__dirname, `../packages/agents/tsup.${agentName}.config.js`);
  require('fs').writeFileSync(
    configPath,
    `module.exports = ${JSON.stringify(tsupConfig, null, 2)}`
  );

  try {
    // Build using agent-specific config
    execSync(`pnpm tsup --config tsup.${agentName}.config.js`, {
      cwd: path.join(__dirname, '../packages/agents'),
      stdio: 'inherit'
    });

    // Copy to edge function directory
    execSync(`mkdir -p supabase/functions/${agentName}/dist && cp -r packages/agents/dist/* supabase/functions/${agentName}/dist/`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
  } finally {
    // Cleanup temp config
    require('fs').unlinkSync(configPath);
  }
}

const agentName = process.argv[2];
if (!agentName) {
  console.error('Please specify an agent name');
  process.exit(1);
}

buildAgent(agentName); 