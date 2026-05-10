import React from 'react'
import { renderToString } from 'react-dom/server'

export function renderToHTML(element: React.ReactElement): string {
  return renderToString(element)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const SEO_BASE_URL = 'https://xbrowser-marketplace.dyyz1993.workers.dev'

export function buildDocument({
  title,
  description,
  content,
  cssFiles = [],
  jsFiles = [],
  extraHead = '',
  spaTemplate,
  canonicalPath,
}: {
  title: string
  description: string
  content: string
  cssFiles?: string[]
  jsFiles?: string[]
  extraHead?: string
  spaTemplate?: string
  canonicalPath?: string
}): string {
  if (spaTemplate) {
    return buildFromTemplate(spaTemplate, title, description, content, extraHead, canonicalPath)
  }

  const canonicalTag = canonicalPath
    ? `<link rel="canonical" href="${SEO_BASE_URL}${canonicalPath}" />`
    : ''
  const ogUrlTag = canonicalPath
    ? `<meta property="og:url" content="${SEO_BASE_URL}${canonicalPath}" />`
    : ''

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
    <meta property="og:image" content="${SEO_BASE_URL}/og-image.png" />
${canonicalTag}
${ogUrlTag}
${cssLinks}
${extraHead}
  </head>
  <body>
    <div id="root" data-ssr="true">${content}</div>
<script>!function(){var r=document.getElementById("root");if(r&&r.getAttribute("data-ssr")){var o=new MutationObserver(function(){r.removeAttribute("data-ssr");o.disconnect()});o.observe(r,{childList:true})}}()</script>
${jsScripts}
  </body>
</html>`
}

function buildFromTemplate(
  template: string,
  title: string,
  description: string,
  content: string,
  extraHead: string,
  canonicalPath?: string
): string {
  let html = template

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)

  html = html.replace(
    /<meta\s+name="description"[^>]*\/?>/s,
    `<meta name="description" content="${escapeHtml(description)}" />`
  )

  // Remove existing og/twitter meta to avoid duplicates (dotAll flag handles multi-line tags)
  html = html.replace(/<meta\s+(?:property|name)=["'](?:og:|twitter:)[^"']*["'][^>]*\/?>/gs, '')

  const seoMeta = `<meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${SEO_BASE_URL}/og-image.png" />
    ${canonicalPath ? `<link rel="canonical" href="${SEO_BASE_URL}${canonicalPath}" />` : ''}
    ${canonicalPath ? `<meta property="og:url" content="${SEO_BASE_URL}${canonicalPath}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />`

  const headInject = extraHead ? `${extraHead}\n    ${seoMeta}` : seoMeta
  html = html.replace('</head>', `    ${headInject}\n  </head>`)

  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root" data-ssr="true">${content}</div><script>!function(){var r=document.getElementById("root");if(r&&r.getAttribute("data-ssr")){var o=new MutationObserver(function(){r.removeAttribute("data-ssr");o.disconnect()});o.observe(r,{childList:true})}}()</script>`
  )

  return html
}

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
    if (key.includes('main') || key === 'index.html') js.add('/' + entry.file)
    if (entry.imports) {
      for (const imp of entry.imports) {
        const imported = manifest[imp]
        if (imported?.css) imported.css.forEach(f => css.add('/' + f))
      }
    }
  }

  return { css: [...css], js: [...js] }
}
