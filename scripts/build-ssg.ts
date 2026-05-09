/**
 * SSG Build Script
 *
 * Fetches data from the deployed API, renders static HTML using React SSR
 * components, and writes pre-built pages to dist/client/.
 *
 * Usage: npx tsx scripts/build-ssg.ts
 * Env:   SSG_API_URL=https://xbrowser-marketplace.dyyz1993.workers.dev
 */

import React from 'react'
import { renderToString } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

const proxyUrl =
  process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY || process.env.all_proxy
if (proxyUrl) {
  console.log(`  Using proxy: ${proxyUrl}`)
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const API_BASE =
  process.env.SSG_API_URL || 'https://xbrowser-marketplace.dyyz1993.workers.dev'
const DIST_CLIENT = path.join(ROOT, 'dist/client')
const SEO_BASE_URL = 'https://xbrowser-marketplace.dyyz1993.workers.dev'

async function fetchJSON<T = unknown>(url: string): Promise<T> {
  console.log(`  Fetching ${url}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API ${url} returned ${res.status}`)
  const body = (await res.json()) as { success?: boolean; data?: T; error?: string }
  if (body && typeof body === 'object' && 'success' in body && body.success && 'data' in body) {
    return body.data as T
  }
  return body as T
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface PageOptions {
  title: string
  description: string
  canonicalPath: string
  content: string
  ssgData: unknown
  extraHead?: string
}

function injectIntoTemplate(template: string, opts: PageOptions): string {
  const { title, description, canonicalPath, content, ssgData, extraHead = '' } = opts

  const dataScript = ssgData
    ? `<script id="__SSG_DATA__" type="application/json">${JSON.stringify(ssgData)}</script>`
    : ''

  const seoMeta = `
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="${SEO_BASE_URL}/og-image.svg" />
<meta property="og:url" content="${SEO_BASE_URL}${canonicalPath}" />
<link rel="canonical" href="${SEO_BASE_URL}${canonicalPath}" />
${dataScript}
${extraHead}`

  let html = template

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)

  html = html.replace(
    /<meta\s+name="description"[^>]*\/?>/,
    `<meta name="description" content="${escapeHtml(description)}" />`
  )

  html = html.replace(
    /<meta\s+(?:property|name)=["'](?:og:|twitter:)[^"']*["'][^>]*\/?>/g,
    ''
  )

  html = html.replace('</head>', `${seoMeta}\n  </head>`)

  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root" data-ssg="true">${content}</div>`
  )

  return html
}

function writePage(filePath: string, html: string): void {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, html)
  console.log(`  Written ${path.relative(DIST_CLIENT, filePath)} (${(html.length / 1024).toFixed(1)} KB)`)
}

async function buildSSG(): Promise<void> {
  console.log('SSG Build Started')
  console.log(`  API: ${API_BASE}`)
  console.log(`  Output: ${DIST_CLIENT}`)

  const templatePath = path.join(DIST_CLIENT, 'index.html')
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}. Run "npm run build:client" first.`)
  }

  const template = fs.readFileSync(templatePath, 'utf-8')

  // Save clean SPA shell for non-SSG routes
  const spaShellPath = path.join(DIST_CLIENT, 'index.spa.html')
  fs.writeFileSync(spaShellPath, template)
  console.log('  Saved index.spa.html (clean SPA shell)')

  // Fetch data
  console.log('\n  Fetching data from API...')
  type PluginItem = {
    name: string
    description: string
    slug: string
    downloads: number
    avgRating: number
    category: string
  }
  type CategoryItem = {
    name: string
    slug: string
    count: number
  }
  type PluginDetail = {
    name: string
    description: string
    slug: string
    avgRating: number
    reviewCount: number
    downloads: number
    author: string
    authorName: string
    category: string
    version: string
  }

  const pluginsResult = await fetchJSON<{
    items: PluginItem[]
    total: number
    page: number
    limit: number
  }>(`${API_BASE}/api/plugins?limit=50`)
  const plugins = pluginsResult.items ?? []
  const totalPlugins = pluginsResult.total ?? plugins.length

  const categories = await fetchJSON<CategoryItem[]>(`${API_BASE}/api/categories`)

  // Import SSR components (tsx resolves these)
  const { HomeSSR } = await import('../src/server/ssr/pages/HomeSSR')
  const { PluginDetailSSR } = await import('../src/server/ssr/pages/PluginDetailSSR')
  const { CategoriesSSR } = await import('../src/server/ssr/pages/CategoriesSSR')
  const { CliSSR } = await import('../src/server/ssr/pages/CliSSR')

  // 1. Homepage
  console.log('\n  Generating pages...')
  const homeContent = renderToString(
    React.createElement(HomeSSR, { plugins, categories, totalPlugins })
  )
  const homeData = { plugins, categories, totalPlugins }
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'XBrowser Marketplace',
        url: SEO_BASE_URL,
        description: 'Discover and install browser extensions and plugins for xbrowser.',
      },
      {
        '@type': 'ItemList',
        numberOfItems: totalPlugins,
        itemListElement: plugins.slice(0, 10).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: p.name,
            url: `${SEO_BASE_URL}/plugin/${p.slug}`,
          },
        })),
      },
    ],
  }
  const homeHtml = injectIntoTemplate(template, {
    title: 'XBrowser Marketplace - Browser Extensions & Plugins',
    description: 'Discover and install browser extensions and plugins for xbrowser.',
    canonicalPath: '/',
    content: homeContent,
    ssgData: homeData,
    extraHead: `<script type="application/ld+json">${JSON.stringify(homeJsonLd)}</script>`,
  })
  writePage(path.join(DIST_CLIENT, 'index.html'), homeHtml)

  // 2. Plugin detail pages
  console.log('\n  Generating plugin detail pages...')
  let pluginCount = 0
  for (const pluginSummary of plugins) {
    let detail: PluginDetail
    try {
      detail = await fetchJSON<PluginDetail>(`${API_BASE}/api/plugins/${pluginSummary.slug}`)
    } catch {
      // Fallback: use summary data
      detail = {
        ...pluginSummary,
        reviewCount: 0,
        author: 'Unknown',
        authorName: 'Unknown',
        version: '1.0.0',
      } as PluginDetail
    }

    const pluginData = {
      slug: pluginSummary.slug,
      name: detail.name,
      description: detail.description,
      avgRating: detail.avgRating ?? 0,
      reviewCount: detail.reviewCount ?? 0,
      downloads: detail.downloads ?? 0,
      author: detail.authorName ?? detail.author ?? 'Unknown',
      category: detail.category ?? 'other',
      version: detail.version ?? '1.0.0',
    }

    const detailContent = renderToString(
      React.createElement(PluginDetailSSR, { plugin: pluginData })
    )

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: pluginData.name,
      description: pluginData.description,
      applicationCategory: 'BrowserExtension',
      operatingSystem: 'CrossPlatform',
      author: { '@type': 'Person', name: pluginData.author },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: pluginData.avgRating,
        reviewCount: pluginData.reviewCount,
      },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    }

    const detailHtml = injectIntoTemplate(template, {
      title: `${pluginData.name} - xbrowser Plugin Marketplace`,
      description: pluginData.description.slice(0, 160),
      canonicalPath: `/plugin/${pluginSummary.slug}`,
      content: detailContent,
      ssgData: { plugin: pluginData },
      extraHead: `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    })
    writePage(
      path.join(DIST_CLIENT, 'plugin', pluginSummary.slug, 'index.html'),
      detailHtml
    )
    pluginCount++
  }
  console.log(`  Generated ${pluginCount} plugin detail pages`)

  // 3. Categories page
  console.log('\n  Generating categories page...')
  const catData = categories.map((cat: CategoryItem) => ({
    name: cat.name,
    slug: cat.slug,
    pluginCount: cat.count ?? 0,
  }))
  const catsContent = renderToString(
    React.createElement(CategoriesSSR, { categories: catData, totalPlugins })
  )
  const catsHtml = injectIntoTemplate(template, {
    title: 'Browse Categories - xbrowser Plugin Marketplace',
    description: 'Browse browser extension plugins by category.',
    canonicalPath: '/categories',
    content: catsContent,
    ssgData: { categories: catData, totalPlugins },
  })
  const catsDir = path.join(DIST_CLIENT, 'categories')
  fs.mkdirSync(catsDir, { recursive: true })
  writePage(path.join(catsDir, 'index.html'), catsHtml)

  // 4. CLI page (static, no API data)
  console.log('\n  Generating CLI page...')
  const cliContent = renderToString(React.createElement(CliSSR))
  const cliHtml = injectIntoTemplate(template, {
    title: 'CLI Tool - xbrowser Plugin Marketplace',
    description: 'Install and use xbrowser CLI to browse, install, and publish browser automation plugins.',
    canonicalPath: '/cli',
    content: cliContent,
    ssgData: null,
  })
  const cliDir = path.join(DIST_CLIENT, 'cli')
  fs.mkdirSync(cliDir, { recursive: true })
  writePage(path.join(cliDir, 'index.html'), cliHtml)

  console.log('\n  SSG Build Complete!')
  console.log(`  Pages: 1 home + ${pluginCount} plugins + 1 categories + 1 cli + 1 SPA shell`)
}

buildSSG().catch((err: Error) => {
  console.error('SSG build failed:', err)
  process.exit(1)
})
