import type { Command } from 'commander'
import { registerTodoCommands } from './todo'
import { registerNotificationCommands } from './notification'
import { registerConfigCommands } from './config'
import { registerPublishCommands } from './publish'
import { registerPluginCommands } from './plugin'
import { registerAuthCommands } from './auth'

export function registerModules(program: Command) {
  registerTodoCommands(program)
  registerNotificationCommands(program)
  registerConfigCommands(program)
  registerPublishCommands(program)
  registerPluginCommands(program)
  registerAuthCommands(program)
}

export {
  registerTodoCommands,
  registerNotificationCommands,
  registerConfigCommands,
  registerPublishCommands,
  registerPluginCommands,
  registerAuthCommands,
}
