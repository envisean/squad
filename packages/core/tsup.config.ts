import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: './src/index.ts',
    compilerOptions: {
      moduleResolution: "node",
      composite: false,
      incremental: false
    }
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@langchain/community',
    '@langchain/openai',
    '@langchain/core',
    'langchain',
    '@supabase/supabase-js',
    'zod'
  ]
});