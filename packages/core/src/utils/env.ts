import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'

/**
 * Load environment variables from multiple .env files in order of precedence:
 * - .env.local (highest priority, always loaded)
 * - .env.[environment].local
 * - .env.[environment]
 * - .env (lowest priority)
 */
export function loadEnv(environment = process.env.NODE_ENV || 'development') {
  const rootDir = path.resolve(process.cwd())

  // Define env files in order of precedence (last one wins)
  const envFiles = ['.env', `.env.${environment}`, `.env.${environment}.local`, '.env.local']

  // Load each env file if it exists
  envFiles.forEach(file => {
    const envPath = path.resolve(rootDir, file)
    if (fs.existsSync(envPath)) {
      config({ path: envPath, override: true })
    }
  })

  // Validate required environment variables
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    // Add other required env vars here
  ]

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
        `Please ensure these are set in your .env files.`
    )
  }
}

/**
 * Get an environment variable with type safety
 */
export function getEnvVar(key: string, required = true): string {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Environment variable ${key} is required but not set`)
  }
  return value || ''
}

/**
 * Get an environment variable as a number
 */
export function getEnvVarAsNumber(key: string, required = true): number {
  const value = getEnvVar(key, required)
  const num = Number(value)
  if (required && isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number`)
  }
  return num
}

/**
 * Get an environment variable as a boolean
 */
export function getEnvVarAsBoolean(key: string, required = true): boolean {
  const value = getEnvVar(key, required).toLowerCase()
  if (required && !['true', 'false', '0', '1'].includes(value)) {
    throw new Error(`Environment variable ${key} must be a boolean`)
  }
  return ['true', '1'].includes(value)
}
