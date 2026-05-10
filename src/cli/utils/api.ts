import { createRPCClient } from '../rpc/client'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const CONFIG_DIR = path.join(os.homedir(), '.xbrowser-marketplace')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_BASE_URL = 'http://localhost:3000'

interface CliConfig {
  baseUrl?: string
  token?: string
  user?: { id: string; username: string; email: string; role: string }
  stats?: { totalCalls: number; lastCallAt?: string; commands?: Record<string, number> }
}

export function loadConfig(): CliConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return {}
}

export function saveConfig(config: CliConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function getConfigPath(): string {
  return CONFIG_FILE
}

let globalBaseUrl = process.env.XBROWSER_API_URL || process.env.BIOMIMIC_API_URL || DEFAULT_BASE_URL

export function setBaseUrl(url: string) {
  globalBaseUrl = url
}

export function getBaseUrl(): string {
  return globalBaseUrl
}

export function getAuthToken(): string | undefined {
  return loadConfig().token
}

export function getClient() {
  const token = loadConfig().token
  return createRPCClient(globalBaseUrl, token)
}
