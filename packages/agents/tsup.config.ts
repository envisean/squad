import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: './src/index.ts',
    compilerOptions: {
      moduleResolution: "node",
      composite: false,
      incremental: false,
      skipLibCheck: true,
      paths: {
        "@squad/*": ["../*/src"]
      }
    },
    resolve: {
      skipNodeModulesBundle: true
    }
  },
  splitting: true,
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
    'yaml',
    'cli-progress',
    'zod',
  ],
  noExternal: ['@squad/*']
}); 