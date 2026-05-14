import type { Command } from 'commander'
import { registerNotificationCommands } from './notification'
import { registerConfigCommands } from './config'
import { registerPublishCommands } from './publish'
import { registerPluginCommands } from './plugin'
import { registerAuthCommands } from './auth'

export function registerModules(program: Command) {
  registerNotificationCommands(program)
  registerConfigCommands(program)
  registerPublishCommands(program)
  registerPluginCommands(program)
  registerAuthCommands(program)
}

export {
  registerNotificationCommands,
  registerConfigCommands,
  registerPublishCommands,
  registerPluginCommands,
  registerAuthCommands,
}
