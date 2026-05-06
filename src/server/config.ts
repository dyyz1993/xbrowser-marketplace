import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { join } from 'path'
import { isCloudflare } from './utils/env'

export type DatabaseDriver = 'sqlite' | 'mysql' | 'd1'

export interface DatabaseConfig {
  driver: DatabaseDriver
  sqlitePath?: string
  mysqlHost?: string
  mysqlPort?: number
  mysqlUser?: string
  mysqlPassword?: string
  mysqlDatabase?: string
  d1Database?: D1Database
}

export interface AppConfig {
  nodeEnv: string
  port: number
  enableDocs: boolean
  database: DatabaseConfig
  authSecretKey: string
  enableDevTokens: boolean
  mockPasswordHash: string
  publicUrl: string
  corsOrigin: string[]
  fileStorage: {
    storagePath: string
    tempPath: string
    tempFileTTL: number
    privateUrlExpiry: number
    secretKey: string
  }
}

function loadEnvFileSync(): void {
  if (isCloudflare) return

  const nodeEnv = process.env.NODE_ENV || 'development'

  const envFiles: Record<string, string> = {
    test: '.env.test',
    development: '.env.local',
    production: '.env.production',
  }

  const envFile = envFiles[nodeEnv]
  if (envFile) {
    const envPath = resolve(process.cwd(), envFile)
    if (existsSync(envPath)) {
      config({ path: envPath })
    }
  }
}

loadEnvFileSync()

export function getAppConfig(): AppConfig {
  const nodeEnv =
    typeof process !== 'undefined' ? process.env.NODE_ENV || 'development' : 'production'

  const port = typeof process !== 'undefined' ? parseInt(process.env.PORT || '3010', 10) : 3010

  const enableDocs = typeof process !== 'undefined' ? process.env.ENABLE_DOCS !== 'false' : false

  const dbDriver =
    typeof process !== 'undefined' ? (process.env.DB_DRIVER as DatabaseDriver) || 'sqlite' : 'd1'

  const isTest = nodeEnv === 'test'
  const isDev = nodeEnv === 'development'
  const isProd = nodeEnv === 'production'

  const authSecretKeyRaw = typeof process !== 'undefined' ? process.env.AUTH_SECRET_KEY : ''

  if (isProd && !authSecretKeyRaw && !isCloudflare) {
    throw new Error('AUTH_SECRET_KEY environment variable is required in production')
  }

  if (isDev && !authSecretKeyRaw) {
    console.warn(
      '[WARN] AUTH_SECRET_KEY not set, using insecure dev default. Set AUTH_SECRET_KEY in production!'
    )
  }

  const authSecretKey: string = authSecretKeyRaw || 'dev-secret-key-change-in-production'

  const enableDevTokens =
    typeof process !== 'undefined' ? process.env.ENABLE_DEV_TOKENS === 'true' && !isProd : false

  if (enableDevTokens) {
    console.warn('⚠️  WARNING: Dev tokens are ENABLED. Do not use in production!')
  }

  const mockPasswordHash =
    typeof process !== 'undefined'
      ? process.env.MOCK_PASSWORD_HASH ||
        '$2b$10$zOV1yAf1zhU6jcszonK3xOjjk4pHVFLatyFmwpQvWYphf4iFg2Kii'
      : ''

  if (typeof process !== 'undefined' && !process.env.MOCK_PASSWORD_HASH && !isTest) {
    console.warn('[WARN] MOCK_PASSWORD_HASH not set, using insecure default')
  }

  const publicUrl = typeof process !== 'undefined' ? process.env.PUBLIC_URL || '' : ''

  const corsOrigin = isProd
    ? typeof process !== 'undefined'
      ? process.env.CORS_ORIGIN?.split(',') || []
      : []
    : ['http://localhost:5173', 'http://localhost:3010']

  const fileStorageBaseDir =
    typeof process !== 'undefined'
      ? process.env.FILE_STORAGE_PATH || join(process.cwd(), 'uploads')
      : ''

  const fileSecretKeyRaw = typeof process !== 'undefined' ? process.env.FILE_SECRET_KEY : ''

  if (!isTest && !fileSecretKeyRaw && !isCloudflare) {
    throw new Error('FILE_SECRET_KEY environment variable is required in production')
  }

  const fileSecretKey: string = fileSecretKeyRaw || 'test-secret-key'

  return {
    nodeEnv,
    port,
    enableDocs,
    authSecretKey,
    enableDevTokens,
    mockPasswordHash,
    publicUrl,
    corsOrigin,
    fileStorage: {
      storagePath: fileStorageBaseDir,
      tempPath:
        typeof process !== 'undefined'
          ? process.env.FILE_TEMP_PATH || join(fileStorageBaseDir, 'temp')
          : '',
      tempFileTTL:
        typeof process !== 'undefined'
          ? parseInt(process.env.FILE_TEMP_TTL || '3600000', 10)
          : 3600000,
      privateUrlExpiry:
        typeof process !== 'undefined'
          ? parseInt(process.env.FILE_PRIVATE_URL_EXPIRY || '3600', 10)
          : 3600,
      secretKey: fileSecretKey,
    },
    database: {
      driver: isCloudflare ? 'd1' : dbDriver,
      sqlitePath:
        typeof process !== 'undefined'
          ? process.env.SQLITE_PATH || `./data/${nodeEnv}.db`
          : undefined,
      mysqlHost: typeof process !== 'undefined' ? process.env.MYSQL_HOST || 'localhost' : undefined,
      mysqlPort:
        typeof process !== 'undefined' ? parseInt(process.env.MYSQL_PORT || '3306', 10) : undefined,
      mysqlUser: typeof process !== 'undefined' ? process.env.MYSQL_USER || 'root' : undefined,
      mysqlPassword: typeof process !== 'undefined' ? process.env.MYSQL_PASSWORD || '' : undefined,
      mysqlDatabase:
        typeof process !== 'undefined' ? process.env.MYSQL_DATABASE || 'app' : undefined,
      d1Database: (globalThis as unknown as { DB?: D1Database }).DB,
    },
  }
}

export function getDatabaseConfig(): DatabaseConfig {
  return getAppConfig().database
}

let _cachedConfig: AppConfig | null = null

export function getConfig(): AppConfig {
  if (isCloudflare || !_cachedConfig) {
    _cachedConfig = getAppConfig()
  }
  return _cachedConfig
}

export function resetConfig(): void {
  _cachedConfig = null
}
