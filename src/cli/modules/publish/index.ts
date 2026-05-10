import { Command } from 'commander'
import { getClient, getAuthToken, getBaseUrl } from '../../utils/api'
import { getLogger } from '../../utils/logger'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import { File as NodeFile } from 'node:buffer'

interface PackageXbrowser {
  slug?: string
  commands?: string[]
  sites?: string[]
  tags?: string[]
  category?: string
  license?: string
  homepageUrl?: string
  repositoryUrl?: string
  npmPackage?: string
  author?: string
}

interface PkgJson {
  name: string
  version: string
  description?: string
  author?: string
  license?: string
  xbrowser?: PackageXbrowser
}

function readPackageJson(dir: string): PkgJson | null {
  const pkgPath = path.join(dir, 'package.json')
  if (!fs.existsSync(pkgPath)) return null
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  } catch {
    return null
  }
}

function createTarballFromDir(dir: string, slug: string, version: string): Buffer {
  const tmpDir = os.tmpdir()
  const tmpFile = path.join(tmpDir, `${slug}-${version}-${Date.now()}.tar.gz`)

  const excludes = ['--exclude=node_modules', '--exclude=.git', '--exclude=.DS_Store']

  execSync(`tar ${excludes.join(' ')} -czf "${tmpFile}" -C "${dir}" .`, {
    stdio: 'pipe',
  })

  const buf = fs.readFileSync(tmpFile)
  try {
    fs.unlinkSync(tmpFile)
  } catch {
    /* ignore */
  }
  return buf
}

function tryCreateTarball(dir: string, slug: string, version: string): Buffer | null {
  try {
    return createTarballFromDir(dir, slug, version)
  } catch {
    return null
  }
}

function isDirectoryPath(arg: string): boolean {
  return (
    arg === '.' ||
    arg === '..' ||
    arg.startsWith('./') ||
    arg.startsWith('../') ||
    arg.startsWith('/') ||
    arg.startsWith('~')
  )
}

function buildAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

async function uploadWithAuth(url: string, form: FormData): Promise<Response> {
  const headers = buildAuthHeaders()
  return globalThis.fetch(url, { method: 'POST', headers, body: form })
}

export function registerPublishCommands(program: Command) {
  const publish = program.command('publish').description('Publish plugins to the marketplace')

  publish
    .command('create')
    .description('Submit a new plugin for review')
    .argument('[directory]', 'Plugin directory (reads package.json for metadata)')
    .option('--name <name>', 'Plugin name')
    .option('--slug <slug>', 'Plugin slug (lowercase, hyphens)')
    .option('--version <version>', 'Version (semver: x.y.z)')
    .option('--description <desc>', 'Description')
    .option('--file <path>', 'Path to plugin tarball')
    .option('--author <author>', 'Author name')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--sites <sites>', 'Comma-separated supported sites')
    .option('--npm-package <pkg>', 'NPM package name')
    .action(
      async (
        directory: string | undefined,
        options: {
          name?: string
          slug?: string
          version?: string
          description?: string
          file?: string
          author?: string
          tags?: string
          sites?: string
          npmPackage?: string
        }
      ) => {
        const logger = getLogger()
        const client = getClient()

        try {
          let name = options.name
          let slug = options.slug
          let version = options.version
          let description = options.description
          let author = options.author
          let tags = options.tags
          let sites = options.sites
          let npmPackage = options.npmPackage
          let xbrowserMeta: PackageXbrowser = {}
          let tarballBuffer: Buffer | null = null

          if (directory && isDirectoryPath(directory)) {
            const resolvedDir = path.resolve(directory)
            if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
              logger.error(`Directory not found: ${resolvedDir}`)
              process.exit(1)
            }

            const pkg = readPackageJson(resolvedDir)
            if (!pkg) {
              logger.error(`No valid package.json found in ${resolvedDir}`)
              process.exit(1)
            }

            name = name || pkg.name
            version = version || pkg.version
            description = description || pkg.description || ''
            author = author || pkg.author || ''
            xbrowserMeta = pkg.xbrowser || {}
            slug = slug || xbrowserMeta.slug || pkg.name.replace(/^@[^/]+\//, '')

            if (xbrowserMeta.tags && !tags) {
              tags = xbrowserMeta.tags.join(',')
            }
            if (xbrowserMeta.sites && !sites) {
              sites = xbrowserMeta.sites.join(',')
            }
            npmPackage = npmPackage || xbrowserMeta.npmPackage

            if (!options.file) {
              logger.info('Creating tarball from directory...')
              tarballBuffer = tryCreateTarball(resolvedDir, slug!, version!)
              if (tarballBuffer) {
                logger.success(`Tarball created (${(tarballBuffer.length / 1024).toFixed(1)} KB)`)
              } else {
                logger.warn(
                  'Could not create tarball (tar module not available). Publish without file.'
                )
              }
            }
          }

          if (!name || !slug || !version || !description) {
            logger.error('Missing required fields: --name, --slug, --version, --description')
            logger.info('Provide a directory argument or specify all flags manually.')
            process.exit(1)
          }

          const metadata: Record<string, unknown> = {
            name,
            slug,
            version,
            description,
            storageType: options.file || tarballBuffer ? 'r2' : 'npm',
          }

          if (author) metadata.author = author
          if (tags) metadata.tags = tags.split(',').map(t => t.trim())
          if (sites) metadata.sites = sites.split(',').map(s => s.trim())
          if (npmPackage) metadata.npmPackage = npmPackage
          if (xbrowserMeta.commands) metadata.commands = xbrowserMeta.commands
          if (xbrowserMeta.category) metadata.category = xbrowserMeta.category
          if (xbrowserMeta.license) metadata.license = xbrowserMeta.license
          if (xbrowserMeta.homepageUrl) metadata.homepageUrl = xbrowserMeta.homepageUrl
          if (xbrowserMeta.repositoryUrl) metadata.repositoryUrl = xbrowserMeta.repositoryUrl

          const form = new FormData()
          const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
          form.append('metadata', metadataBlob)

          if (options.file) {
            const filePath = path.resolve(options.file)
            if (!fs.existsSync(filePath)) {
              logger.error(`File not found: ${filePath}`)
              process.exit(1)
            }
            const fileBuffer = fs.readFileSync(filePath)
            const fileName = path.basename(filePath)
            form.append('files', new NodeFile([fileBuffer], fileName))
          } else if (tarballBuffer) {
            form.append('files', new NodeFile([tarballBuffer], `${slug}-${version}.tar.gz`))
          }

          try {
            const checkRes = await client.api.plugins[':slug'].$get({ param: { slug } })
            if (checkRes.ok) {
              const existing = await checkRes.json()
              if (existing.success && existing.data) {
                const currentVersion = existing.data.version || existing.data.latestVersion
                if (currentVersion === version) {
                  logger.error(`Version '${version}' already exists for plugin '${slug}'`)
                  logger.info(
                    'Use a different version number or use "publish version" to publish a new version'
                  )
                  process.exit(1)
                }
                logger.warn(
                  `Plugin '${slug}' already exists (current: v${currentVersion}). Publishing as new version v${version}`
                )
              }
            }
          } catch {
            // Plugin doesn't exist yet, proceed with publish
          }

          const res = await client.api.plugins.publish.$post({ form })
          const result = (await res.json()) as {
            success: boolean
            data?: unknown
            error?: string
          }

          if (result.success) {
            logger.success(`Plugin "${name}" submitted for review!`)
            logger.info(`  Slug: ${slug}`)
            logger.info(`  Version: ${version}`)
            logger.info('An admin will review and approve your plugin.')
          } else {
            logger.error(`Failed: ${result.error || 'Unknown error'}`)
            process.exit(1)
          }
        } catch (error) {
          getLogger().error(
            `Publish failed: ${error instanceof Error ? error.message : String(error)}`
          )
          process.exit(1)
        }
      }
    )

  publish
    .command('version')
    .description('Publish a new version of an existing plugin')
    .requiredOption('--slug <slug>', 'Plugin slug')
    .requiredOption('--version <version>', 'New version (semver: x.y.z)')
    .option('--changelog <changelog>', 'Changelog for this version')
    .option('--file <path>', 'Path to version tarball')
    .action(
      async (options: { slug: string; version: string; changelog?: string; file?: string }) => {
        const logger = getLogger()
        const client = getClient()

        try {
          try {
            const checkRes = await client.api.plugins[':slug'].$get({
              param: { slug: options.slug },
            })
            if (checkRes.ok) {
              const existing = await checkRes.json()
              if (existing.success && existing.data) {
                const currentVersion = existing.data.version || existing.data.latestVersion
                if (currentVersion === options.version) {
                  logger.error(`Version '${options.version}' already exists for plugin '${options.slug}'`)
                  process.exit(1)
                }
              }
            }
          } catch {
            // ignore
          }

          if (options.file) {
            const filePath = path.resolve(options.file)
            if (!fs.existsSync(filePath)) {
              logger.error(`File not found: ${filePath}`)
              process.exit(1)
            }

            const baseUrl = getBaseUrl()
            const url = `${baseUrl}/api/plugins/${encodeURIComponent(options.slug)}/versions/upload`

            const fileBuffer = fs.readFileSync(filePath)
            const fileName = path.basename(filePath)
            const form = new FormData()
            form.append('version', options.version)
            if (options.changelog) form.append('changelog', options.changelog)
            form.append('files', new NodeFile([fileBuffer], fileName))

            const res = await uploadWithAuth(url, form)
            const result = await res.json()

            if ((result as { success?: boolean }).success) {
              logger.success(`Version ${options.version} published for ${options.slug}`)
            } else {
              const errMsg = (result as { error?: string }).error || 'Unknown error'
              logger.error(`Failed: ${errMsg}`)
              if (res.status === 401) {
                logger.info('Hint: Run "xbrowser-marketplace auth login" first.')
              }
              process.exit(1)
            }
          } else {
            const res = await client.api.plugins[':slug'].versions.$post({
              param: { slug: options.slug },
              json: { version: options.version, changelog: options.changelog },
            })
            const result = await res.json()

            if (result.success) {
              logger.success(`Version ${options.version} published for ${options.slug}`)
            } else {
              const errMsg = 'error' in result ? (result.error as string) : 'Unknown error'
              logger.error(`Failed: ${errMsg}`)
              process.exit(1)
            }
          }
        } catch (error) {
          logger.error(
            `Version publish failed: ${error instanceof Error ? error.message : String(error)}`
          )
          process.exit(1)
        }
      }
    )
}
