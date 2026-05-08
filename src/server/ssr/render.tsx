import React from 'react'
import { renderToString } from 'react-dom/server'

/**
 * Render a React element to HTML string
 */
export function renderToHTML(element: React.ReactElement): string {
  return renderToString(element)
}

/**
 * Build full HTML document
 */
export function buildDocument({
  title,
  description,
  content,
  cssFiles = [],
  jsFiles = [],
  extraHead = '',
}: {
  title: string
  description: string
  content: string
  cssFiles?: string[]
  jsFiles?: string[]
  extraHead?: string
}): string {
  const cssLinks = [...new Set(cssFiles)]
    .map(f => `    <link rel="stylesheet" href="${f}">`)
    .join('\n')
  const jsScripts = [...new Set(jsFiles)]
    .map(f => `    <script type="module" src="${f}"></script>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="sitemap" href="/sitemap.xml" />
${cssLinks}
${extraHead}
  </head>
  <body>
    <div id="root">${content}</div>
${jsScripts}
  </body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Parse Vite manifest to get asset file paths
 */
export interface AssetManifest {
  css: string[]
  js: string[]
}

export function parseManifest(
  manifest: Record<string, { file: string; css?: string[]; imports?: string[] }>
): AssetManifest {
  const css: Set<string> = new Set()
  const js: Set<string> = new Set()

  for (const [key, entry] of Object.entries(manifest)) {
    if (key.includes('admin')) continue
    if (entry.css) entry.css.forEach(f => css.add('/' + f))
    if (key.includes('main') || key.includes('index')) js.add('/' + entry.file)
    if (entry.imports) {
      for (const imp of entry.imports) {
        const imported = manifest[imp]
        if (imported?.css) imported.css.forEach(f => css.add('/' + f))
      }
    }
  }

  return { css: [...css], js: [...js] }
}
