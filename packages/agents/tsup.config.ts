import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    entry: './src/index.ts',
    compilerOptions: {
      moduleResolution: "node",
      composite: false,
      incremental: false
    }
  },
  splitting: true,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: {
    moduleSideEffects: false,
  },
  external: [
    '@langchain/community',
    '@langchain/openai',
    '@langchain/core',
    'langchain',
    '@supabase/supabase-js',
    'yaml',
    'cli-progress',
    'zod',
    'langchain/text_splitter',
    /^@langchain\/.*/,
    /^node:.*/,
  ],
  noExternal: ['@squad/core'],
  // This tells esbuild to only include used exports
  esbuildOptions(options) {
    options.treeShaking = true;
    options.ignoreAnnotations = false;
  }
}); 