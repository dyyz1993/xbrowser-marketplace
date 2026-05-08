/**
 * SSG Pre-render Script
 * Runs AFTER `vite build` to generate pre-rendered HTML for static pages.
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const DIST = join(process.cwd(), 'dist', 'client')

const PAGES = [
  {
    url: '/',
    title: 'XBrowser Marketplace - Browser Extensions & Plugins',
    desc: 'Discover and install browser extensions and plugins.',
    file: 'index.html',
  },
  {
    url: '/categories',
    title: 'Categories - XBrowser Marketplace',
    desc: 'Browse browser extensions by category.',
    file: 'categories/index.html',
  },
  {
    url: '/cli',
    title: 'CLI Tool - XBrowser Marketplace',
    desc: 'Command-line tool for managing browser extensions.',
    file: 'cli/index.html',
  },
]

function getAssets(): { css: string[]; js: string[] } {
  const manifestPath = join(DIST, '.vite', 'manifest.json')
  if (!existsSync(manifestPath)) return { css: [], js: [] }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const css = new Set<string>()
  const js = new Set<string>()

  for (const [key, entry] of Object.entries(manifest) as [string, any][]) {
    if (key.includes('admin')) continue
    if (entry.css) entry.css.forEach((f: string) => css.add('/' + f))
    if (key.includes('main') || key === 'index.html') js.add('/' + entry.file)
    if (entry.imports) {
      for (const imp of entry.imports) {
        const imported = manifest[imp]
        if (imported?.css) imported.css.forEach((f: string) => css.add('/' + f))
      }
    }
  }

  return { css: [...css], js: [...js] }
}

function renderSkeletonPage(title: string): string {
  return renderToString(
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">XBrowser Marketplace</span>
        </div>
      </nav>
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
          {/* Client-side React will hydrate and replace this content */}
        </div>
      </main>
      <footer className="py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        © 2024 XBrowser Marketplace
      </footer>
    </div>
  )
}

function buildHTML(
  title: string,
  desc: string,
  content: string,
  css: string[],
  js: string[]
): string {
  const cssLinks = css.map(f => `    <link rel="stylesheet" href="${f}">`).join('\n')
  const jsScripts = js.map(f => `    <script type="module" src="${f}"></script>`).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <link rel="sitemap" href="/sitemap.xml" />
${cssLinks}
  </head>
  <body>
    <div id="root">${content}</div>
${jsScripts}
  </body>
</html>`
}

async function main() {
  console.log('🔨 SSG Pre-rendering...\n')

  const indexPath = join(DIST, 'index.html')
  const spaPath = join(DIST, 'index.spa.html')
  if (existsSync(indexPath)) {
    writeFileSync(spaPath, readFileSync(indexPath))
    console.log('📋 Backed up index.html → index.spa.html')
  }

  const { css, js } = getAssets()
  console.log(`📦 Assets: ${css.length} CSS, ${js.length} JS\n`)

  for (const page of PAGES) {
    const content = renderSkeletonPage(page.title)
    const html = buildHTML(page.title, page.desc, content, css, js)

    const outPath = join(DIST, page.file)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, html, 'utf-8')
    console.log(`✅ ${page.url} → ${page.file} (${(html.length / 1024).toFixed(1)} KB)`)
  }

  console.log('\n✅ SSG complete!')
}

main().catch(err => {
  console.error('❌ SSG failed:', err)
  process.exit(1)
})
