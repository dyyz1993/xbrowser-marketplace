/**
 * SSG Pre-render Script
 * Runs AFTER `vite build` to generate pre-rendered HTML for static pages.
 *
 * Strategy: Use the SPA index.html (which Vite generates with correct
 * script/link tags) as a template, and inject SSG content into it.
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
        </div>
      </main>
      <footer className="py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        © 2024 XBrowser Marketplace
      </footer>
    </div>
  )
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHTMLFromTemplate(
  template: string,
  title: string,
  desc: string,
  content: string
): string {
  let html = template

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)

  html = html.replace(
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${escapeAttr(desc)}" />`
  )

  const ogMeta = `<meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(desc)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(desc)}" />`

  html = html.replace('</head>', `    ${ogMeta}\n  </head>`)

  html = html.replace(/<div id="root"><\/div>/, `<div id="root">${content}</div>`)

  return html
}

async function main() {
  console.log('🔨 SSG Pre-rendering...\n')

  const indexPath = join(DIST, 'index.html')
  const spaPath = join(DIST, 'index.spa.html')
  if (!existsSync(indexPath)) {
    console.error('❌ No index.html found. Run `npm run build:client` first.')
    process.exit(1)
  }

  const template = readFileSync(indexPath, 'utf-8')
  writeFileSync(spaPath, template)
  console.log('📋 Backed up index.html → index.spa.html')

  const hasScripts = template.includes('<script')
  const hasStyles = template.includes('<link') && template.includes('stylesheet')
  console.log(`📦 Template has scripts: ${hasScripts}, styles: ${hasStyles}\n`)

  for (const page of PAGES) {
    const content = renderSkeletonPage(page.title)
    const html = buildHTMLFromTemplate(template, page.title, page.desc, content)

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
