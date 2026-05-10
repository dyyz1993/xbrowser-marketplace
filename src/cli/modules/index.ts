import type { Command } from 'commander'
import { registerTodoCommands } from './todo'
import { registerNotificationCommands } from './notification'
import { registerConfigCommands } from './config'
import { registerPublishCommands } from './publish'

export function registerModules(program: Command) {
  registerTodoCommands(program)
  registerNotificationCommands(program)
  registerConfigCommands(program)
  registerPublishCommands(program)
}

export {
  registerTodoCommands,
  registerNotificationCommands,
  registerConfigCommands,
  registerPublishCommands,
}
