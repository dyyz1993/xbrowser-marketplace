import { Command } from 'commander'
import { getClient, getBaseUrl } from '../../utils/api'
import { getLogger } from '../../utils/logger'
import fs from 'node:fs'
import path from 'node:path'
import { File as NodeFile } from 'node:buffer'

export function registerPublishCommands(program: Command) {
  const publish = program.command('publish').description('Publish plugins to the marketplace')

  publish
    .command('create')
    .description('Submit a new plugin for review')
    .requiredOption('--name <name>', 'Plugin name')
    .requiredOption('--slug <slug>', 'Plugin slug (lowercase, hyphens)')
    .requiredOption('--version <version>', 'Version (semver: x.y.z)')
    .requiredOption('--description <desc>', 'Description')
    .option('--file <path>', 'Path to plugin tarball')
    .option('--author <author>', 'Author name')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--sites <sites>', 'Comma-separated supported sites')
    .option('--npm-package <pkg>', 'NPM package name')
    .action(
      async (options: {
        name: string
        slug: string
        version: string
        description: string
        file?: string
        author?: string
        tags?: string
        sites?: string
        npmPackage?: string
      }) => {
        const logger = getLogger()

        try {
          const metadata: Record<string, unknown> = {
            name: options.name,
            slug: options.slug,
            version: options.version,
            description: options.description,
            storageType: options.file ? 'r2' : 'npm',
          }

          if (options.author) metadata.author = options.author
          if (options.tags) metadata.tags = options.tags.split(',').map(t => t.trim())
          if (options.sites) metadata.sites = options.sites.split(',').map(s => s.trim())
          if (options.npmPackage) metadata.npmPackage = options.npmPackage

          if (options.file) {
            const filePath = path.resolve(options.file)
            if (!fs.existsSync(filePath)) {
              logger.error(`File not found: ${filePath}`)
              process.exit(1)
            }

            const undici = await import('undici')
            const form = new undici.FormData()
            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
            form.append('metadata', metadataBlob)

            const fileBuffer = fs.readFileSync(filePath)
            const fileName = path.basename(filePath)
            form.append('files', new NodeFile([fileBuffer], fileName))

            const baseUrl = getBaseUrl()
            // eslint-disable-next-line local-rules/no-direct-fetch
            const response = await fetch(`${baseUrl}/api/plugins/publish`, {
              method: 'POST',
              body: form as unknown as BodyInit,
            })

            const result = (await response.json()) as {
              success: boolean
              data?: unknown
              error?: string
            }

            if (result.success) {
              logger.success(`Plugin "${options.name}" submitted for review!`)
              logger.info('An admin will review and approve your plugin.')
            } else {
              logger.error(`Failed: ${result.error || 'Unknown error'}`)
              process.exit(1)
            }
          } else {
            const undici = await import('undici')
            const nativeForm = new undici.FormData()
            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
            nativeForm.append('metadata', metadataBlob)

            const baseUrl = getBaseUrl()
            // eslint-disable-next-line local-rules/no-direct-fetch
            const response = await fetch(`${baseUrl}/api/plugins/publish`, {
              method: 'POST',
              body: nativeForm as unknown as BodyInit,
            })

            const result = (await response.json()) as {
              success: boolean
              data?: unknown
              error?: string
            }

            if (result.success) {
              logger.success(`Plugin "${options.name}" submitted for review!`)
              logger.info('An admin will review and approve your plugin.')
            } else {
              logger.error(`Failed: ${result.error || 'Unknown error'}`)
              process.exit(1)
            }
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
    .action(async (options: { slug: string; version: string; changelog?: string }) => {
      const logger = getLogger()
      const client = getClient()

      try {
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
      } catch (error) {
        logger.error(
          `Version publish failed: ${error instanceof Error ? error.message : String(error)}`
        )
        process.exit(1)
      }
    })
}
