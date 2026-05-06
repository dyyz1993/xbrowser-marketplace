/**
 * 导入路径验证器（通用版本）
 *
 * 检测跨模块的相对路径导入
 * 可配置模块名称、路径别名、最小深度等
 *
 * 核心规则：
 * - 允许: ../ (同模块内相对导入)
 * - 禁止: ../../ 或更多 (跨模块，必须用别名)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'
import type { ImportsConfig, ImportError, ModuleName } from './index.js'

/**
 * 从文件路径提取模块名称
 */
function getModule(
  filePath: string,
  srcDir: string,
  modules: readonly ModuleName[]
): ModuleName | null {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const srcIndex = parts.indexOf(srcDir)

  if (srcIndex === -1 || srcIndex + 1 >= parts.length) return null

  const moduleName = parts[srcIndex + 1]
  return modules.includes(moduleName) ? moduleName : null
}

/**
 * 提取文件中的所有 import 语句
 */
function extractImports(content: string): string[] {
  const regex = /import\s+.*?from\s+['"]([^'"]+)['"]/g
  const imports: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

/**
 * 检查是否为相对路径
 */
function isRelativePath(path: string): boolean {
  return path.startsWith('./') || path.startsWith('../')
}

/**
 * 计算相对路径深度
 */
function getRelativeDepth(path: string): number {
  const matches = path.match(/\.\.\//g)
  return matches ? matches.length : 0
}

/**
 * 检查单个文件的导入
 */
export function validateImportsInFile(
  filePath: string,
  rootPath: string,
  config: ImportsConfig
): ImportError[] {
  const content = readFileSync(filePath, 'utf-8')
  const imports = extractImports(content)
  const fileModule = getModule(filePath, config.srcDir, config.modules)

  if (!fileModule) return []

  const errors: ImportError[] = []

  for (const imp of imports) {
    if (!isRelativePath(imp)) continue

    const depth = getRelativeDepth(imp)

    // ⭐ 核心规则：../ 允许，../../ 或更多禁止
    // 跨模块检测：达到最小深度且目标模块不同
    if (depth >= config.minCrossModuleDepth) {
      const fullPath = resolve(dirname(filePath), imp)
      const targetModule = getModule(fullPath, config.srcDir, config.modules)

      if (targetModule && targetModule !== fileModule) {
        // 计算建议的别名路径
        const targetSrcDir = join(rootPath, config.srcDir, targetModule)
        const relativePath = relative(targetSrcDir, fullPath).replace(/\\/g, '/')

        errors.push({
          file: relative(rootPath, filePath),
          importPath: imp,
          suggestion: `@${targetModule}/${relativePath}`,
        })
      }
    }
  }

  return errors
}

/**
 * 扫描目录中的所有文件
 */
function scanDirectory(rootPath: string, targetDir: string, config: ImportsConfig): ImportError[] {
  const errors: ImportError[] = []
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
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const fileErrors = validateImportsInFile(fullPath, rootPath, config)
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
export function validateImports(config: ImportsConfig, rootPath: string): ImportError[] {
  const allErrors: ImportError[] = []

  for (const dir of config.checkDirs) {
    const errors = scanDirectory(rootPath, dir, config)
    allErrors.push(...errors)
  }

  return allErrors
}

/**
 * 格式化错误输出
 */
export function formatImportErrors(errors: ImportError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} cross-module import(s):\n\n`

  for (const err of errors) {
    output += `  ${err.file}:\n`
    output += `    Import: '${err.importPath}'\n`
    output += `    Suggestion: Change to '${err.suggestion}'\n\n`
  }

  output += '📋 Import Path Guidelines:\n'
  output += '  ✅ OK:  import { X } from "./sibling-file"         (same directory)\n'
  output += '  ✅ OK:  import { X } from "../parent-file"          (parent directory)\n'
  output += '  ❌ BAD: import { X } from "../../shared/types"     (cross-module, 2+ levels)\n'
  output += '  ❌ BAD: import { X } from "../../../client/store"   (cross-module, 3+ levels)\n\n'
  output += '  Use path aliases for cross-module imports:\n'
  output += '  - @shared/* for shared types\n'
  output += '  - @client/* for client code\n'
  output += '  - @server/* for server code\n'

  return output
}
