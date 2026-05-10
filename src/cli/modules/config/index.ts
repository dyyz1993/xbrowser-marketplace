import { Command } from 'commander'
import {
  getBaseUrl,
  setBaseUrl,
  getClient,
  loadConfig,
  saveConfig,
  getConfigPath,
} from '../../utils/api'
import { getLogger } from '../../utils/logger'

export function registerConfigCommands(program: Command) {
  const config = program.command('config').description('CLI configuration and service management')

  config
    .command('get')
    .description('Show current configuration')
    .option('-k, --key <key>', 'Get specific config key')
    .action((options: { key?: string }) => {
      const logger = getLogger()
      const cfg = loadConfig()

      if (options.key) {
        logger.info(
          `${options.key}: ${(cfg as unknown as Record<string, unknown>)[options.key] || 'not set'}`
        )
      } else {
        logger.info(JSON.stringify(cfg, null, 2))
      }
    })

  config
    .command('set')
    .description('Set configuration value')
    .option('-u, --url <url>', 'Set server URL')
    .action((options: { url?: string }) => {
      const logger = getLogger()
      const cfg = loadConfig()

      if (options.url) {
        cfg.baseUrl = options.url
        setBaseUrl(options.url)
        logger.success(`Server URL set to: ${options.url}`)
      }

      saveConfig(cfg)
    })

  config
    .command('url')
    .description('Show or set server URL')
    .argument('[url]', 'New server URL')
    .action((url?: string) => {
      const logger = getLogger()
      if (url) {
        const cfg = loadConfig()
        cfg.baseUrl = url
        setBaseUrl(url)
        saveConfig(cfg)
        logger.success(`Server URL set to: ${url}`)
      } else {
        logger.info(`Current server URL: ${getBaseUrl()}`)
      }
    })

  config
    .command('status')
    .description('Check server connection status')
    .action(async () => {
      const logger = getLogger()
      const client = getClient()

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (client as any).health.$get()
        const data = await res.json()
        logger.success('Server is reachable')
        logger.info(JSON.stringify(data, null, 2))
      } catch (error) {
        logger.error(`Server not reachable: ${getBaseUrl()}`)
        logger.error(String(error))
      }
    })

  config
    .command('reset')
    .description('Reset configuration to defaults')
    .action(() => {
      const logger = getLogger()
      saveConfig({ baseUrl: 'http://localhost:3000' })
      setBaseUrl('http://localhost:3000')
      logger.success('Configuration reset to defaults')
    })

  config
    .command('path')
    .description('Show config file path')
    .action(() => {
      const logger = getLogger()
      logger.info(`Config file: ${getConfigPath()}`)
    })
}

export { loadConfig, saveConfig, getConfigPath }
