import { Command } from 'commander'
import { getClient } from '../../utils/api'
import { getLogger } from '../../utils/logger'

export function registerPluginCommands(program: Command) {
  const plugin = program.command('plugin').description('Plugin management commands')

  plugin
    .command('list')
    .description('List all approved plugins')
    .option('--page <number>', 'Page number', '1')
    .option('--limit <number>', 'Results per page', '20')
    .option('--category <slug>', 'Filter by category')
    .option('--sort <field>', 'Sort by: newest, popular, most_downloaded, name', 'newest')
    .action(async options => {
      const logger = getLogger()
      const client = getClient()

      const res = await client.api.plugins.$get({
        query: {
          page: options.page || '1',
          limit: options.limit || '20',
          category: options.category,
          sort: options.sort || 'newest',
        },
      })
      const data = await res.json()
      if (data.success && data.data) {
        const items = data.data.items
        logger.info(`Found ${data.data.total} plugins (page ${data.data.page}):`)
        for (const p of items) {
          logger.info(`  ${p.name} (${p.slug}) v${p.version} - ${p.downloadCount} downloads`)
        }
      } else {
        logger.info(JSON.stringify(data, null, 2))
      }
    })

  plugin
    .command('search')
    .description('Search plugins')
    .argument('<query>', 'Search query')
    .option('--tag <tag>', 'Filter by tag')
    .option('--category <slug>', 'Filter by category')
    .option('--limit <number>', 'Results per page', '10')
    .action(async (query: string, options) => {
      const logger = getLogger()
      const client = getClient()

      const res = await client.api.plugins.search.$get({
        query: {
          q: query,
          tag: options.tag,
          category: options.category,
          limit: options.limit || '10',
        },
      })
      const data = await res.json()
      if (data.success && data.data) {
        const items = data.data.items
        logger.info(`Search results for "${query}" (${data.data.total} found):`)
        for (const p of items) {
          logger.info(
            `  ${p.name} (${p.slug}) v${p.version} - ★${p.avgRating ?? '-'} (${p.downloadCount} downloads)`
          )
        }
      } else {
        logger.info(JSON.stringify(data, null, 2))
      }
    })

  plugin
    .command('info')
    .description('Get plugin details')
    .argument('<slug>', 'Plugin slug')
    .action(async (slug: string) => {
      const logger = getLogger()
      const client = getClient()

      const res = await client.api.plugins[':slug'].$get({ param: { slug } })
      const data = await res.json()
      if (data.success && data.data) {
        const p = data.data
        logger.info(`Name:        ${p.name}`)
        logger.info(`Slug:        ${p.slug}`)
        logger.info(`Author:      ${p.authorName}`)
        logger.info(`Version:     ${p.version}`)
        logger.info(`Status:      ${p.status}`)
        logger.info(`Downloads:   ${p.downloadCount}`)
        logger.info(`Rating:      ${p.avgRating ?? '-'} (${p.reviewCount ?? 0} reviews)`)
        logger.info(`License:     ${p.license ?? '-'}`)
        logger.info(`Description: ${p.description}`)
        if (p.repositoryUrl) logger.info(`Repository:  ${p.repositoryUrl}`)
        if (p.homepageUrl) logger.info(`Homepage:    ${p.homepageUrl}`)
        if (p.tags?.length) logger.info(`Tags:        ${p.tags.join(', ')}`)
      } else {
        logger.info(JSON.stringify(data, null, 2))
      }
    })

  plugin
    .command('categories')
    .description('List all categories')
    .action(async () => {
      const logger = getLogger()
      const client = getClient()

      const res = await client.api.categories.$get()
      const data = await res.json()
      if (data.success && data.data) {
        const cats = data.data
        logger.info(`Found ${cats.length} categories:`)
        for (const c of cats) {
          logger.info(`  ${c.name} (${c.slug}) - ${c.pluginCount} plugins`)
        }
      } else {
        logger.info(JSON.stringify(data, null, 2))
      }
    })
}
