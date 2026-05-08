import { renderToString } from 'react-dom/server'
import type { ReactElement } from 'react'

interface SSRMeta {
  title: string
  description: string
  url: string
  ogImage?: string
  jsonLd?: Record<string, unknown>
}

interface SSROptions {
  meta: SSRMeta
  component: ReactElement
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function renderPage(htmlTemplate: string, options: SSROptions): Promise<string> {
  const { meta, component } = options

  const appHtml = renderToString(component)

  const metaTags: string[] = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  ]

  if (meta.ogImage) {
    metaTags.push(`<meta property="og:image" content="${escapeHtml(meta.ogImage)}" />`)
    metaTags.push(`<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />`)
  }

  if (meta.jsonLd) {
    metaTags.push(`<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`)
  }

  let html = htmlTemplate
  html = html.replace(/<title>.*?<\/title>/g, '')
  html = html.replace(
    /<meta\s+(?:property|name)=["'](?:og:|twitter:|description)["'][^>]*\/?>/g,
    ''
  )
  html = html.replace('</head>', `${metaTags.join('\n')}\n</head>`)
  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

  return html
}
