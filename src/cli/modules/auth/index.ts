import { Command } from 'commander'
import { getClient } from '../../utils/api'
import { getLogger } from '../../utils/logger'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const CONFIG_DIR = path.join(os.homedir(), '.xbrowser-marketplace')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

interface CliConfig {
  baseUrl?: string
  token?: string
  user?: { id: string; username: string; email: string; role: string }
}

function loadConfig(): CliConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return {}
}

function saveConfig(config: CliConfig) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function registerAuthCommands(program: Command) {
  const auth = program.command('auth').description('Authentication commands')

  auth
    .command('login')
    .description('Login with email and password')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .action(async options => {
      const logger = getLogger()

      let { email, password } = options
      if (!email || !password) {
        logger.error('Both --email and --password are required')
        process.exit(1)
      }

      const client = getClient()

      try {
        const res = await client.api.auth.login.$post({ json: { email, password } })
        const data = await res.json()

        if (data.success && data.data) {
          const config = loadConfig()
          config.token = data.data.token
          config.user = data.data.profile
          saveConfig(config)
          logger.success(`Logged in as ${data.data.profile.username} (${data.data.profile.email})`)
        } else {
          logger.error('Login failed: Invalid credentials')
          process.exit(1)
        }
      } catch (err) {
        logger.error(`Login failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        process.exit(1)
      }
    })

  auth
    .command('logout')
    .description('Clear stored authentication token')
    .action(() => {
      const logger = getLogger()
      const config = loadConfig()
      if (config.token) {
        delete config.token
        delete config.user
        saveConfig(config)
        logger.success('Logged out successfully')
      } else {
        logger.info('Not logged in')
      }
    })

  auth
    .command('whoami')
    .description('Show current authenticated user')
    .action(async () => {
      const logger = getLogger()
      const config = loadConfig()

      if (!config.token) {
        logger.info('Not logged in. Use "auth login" to authenticate.')
        return
      }

      if (config.user) {
        logger.info(`Username: ${config.user.username}`)
        logger.info(`Email:    ${config.user.email}`)
        logger.info(`Role:     ${config.user.role}`)
        logger.info(`ID:       ${config.user.id}`)
      }

      try {
        const client = getClient()
        const res = await client.api.auth.verify.$get()
        const data = await res.json()
        if (data.success && data.data) {
          config.user = data.data
          saveConfig(config)
          logger.info(`\nVerified: ${data.data.username} (${data.data.email})`)
        }
      } catch {
        logger.warn('Token verification failed. Your token may be expired.')
      }
    })
}
