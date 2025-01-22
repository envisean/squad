import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

export function loadEnv() {
  const rootDir = resolve(__dirname, '../..');
  const envLocal = resolve(rootDir, '.env.local');
  const envFile = resolve(rootDir, '.env');

  // Try .env.local first, then fall back to .env
  if (existsSync(envLocal)) {
    config({ path: envLocal });
  } else if (existsSync(envFile)) {
    config({ path: envFile });
  } else {
    console.warn('No .env or .env.local file found');
  }
} 