/**
 * TODO/FIXME 验证器（通用版本）
 *
 * 检查代码中是否有未归属的 TODO/FIXME/HACK 注释
 * 可配置关键词、允许模式、忽略目录等
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { TodosConfig, TodoError } from './index.js'

/**
 * 检查单个文件中的 TODO/FIXME
 */
export function validateTodosInFile(
  filePath: string,
  rootPath: string,
  config: TodosConfig
): TodoError[] {
  const content = readFileSync(filePath, 'utf-8')
  const errors: TodoError[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // 检查是否包含关键词
    for (const keyword of config.keywords) {
      // 匹配注释中的 TODO/FIXME 等
      const regex = new RegExp(`//.*${keyword}:|/\\*.*${keyword}:|<!--.*${keyword}:`, 'i')

      if (regex.test(trimmedLine)) {
        // 检查是否有允许模式（如 @author）
        if (!config.allowedPattern.test(trimmedLine)) {
          errors.push({
            file: relative(rootPath, filePath),
            line: i + 1,
            keyword,
            content: trimmedLine,
          })
        }
        break
      }
    }
  }

  return errors
}

/**
 * 扫描目录中的所有文件
 */
function scanDirectory(rootPath: string, targetDir: string, config: TodosConfig): TodoError[] {
  const errors: TodoError[] = []
  const targetPath = join(rootPath, targetDir)

  if (!existsSync(targetPath)) {
    return errors
  }

  function scanDir(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        // 跳过忽略的目录
        if (!config.ignoreDirs.includes(entry.name)) {
          scanDir(fullPath)
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') ||
          entry.name.endsWith('.tsx') ||
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.jsx'))
      ) {
        const fileErrors = validateTodosInFile(fullPath, rootPath, config)
        errors.push(...fileErrors)
      }
    }
  }

  scanDir(targetPath)
  return errors
}

/**
 * 主验证函数
 */
export function validateTodos(config: TodosConfig, rootPath: string): TodoError[] {
  const allErrors: TodoError[] = []

  for (const dir of config.checkDirs) {
    const errors = scanDirectory(rootPath, dir, config)
    allErrors.push(...errors)
  }

  return allErrors
}

/**
 * 格式化错误输出
 */
export function formatTodoErrors(errors: TodoError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} unassigned TODO(s):\n\n`

  for (const err of errors) {
    output += `  ${err.file}:${err.line}:\n`
    output += `    ${err.content}\n`
    output += `    → Found unassigned "${err.keyword}"\n`
    output += `    → Fix: Remove "${err.keyword}" or add @author\n\n`
  }

  output += '📋 Guidelines:\n'
  output += '  Bad:  TODO or FIXME without @author\n'
  output += '  Good: TODO @john: implement feature X\n'
  output += '  Good: FIXME @sarah: refactor this function\n'
  output += '\n  Note: Add @author to your TODOs to mark them as assigned.\n'

  return output
}
