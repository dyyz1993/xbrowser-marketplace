import React from 'react'

export interface PluginSSRData {
  name: string
  description: string
  avgRating: number
  reviewCount: number
  downloads: number
  author: string
  category: string
  version: string
}

export const PluginDetailSSR: React.FC<{ plugin: PluginSSRData }> = ({ plugin }) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: plugin.name,
    description: plugin.description,
    applicationCategory: 'BrowserExtension',
    operatingSystem: 'CrossPlatform',
    author: { '@type': 'Person', name: plugin.author },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: plugin.avgRating ?? 0,
      reviewCount: plugin.reviewCount ?? 0,
    },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-900">
            XBrowser Marketplace
          </a>
        </div>
      </nav>

      {/* Content */}
      <main className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="plugin-detail-name">
              {plugin.name}
            </h1>
            <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
              <span>By {plugin.author}</span>
              <span>•</span>
              <span>{plugin.category}</span>
              <span>•</span>
              <span>v{plugin.version}</span>
            </div>
            <p
              className="text-gray-700 text-lg leading-relaxed mb-6"
              data-testid="plugin-detail-description"
            >
              {plugin.description}
            </p>
            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-1" data-testid="plugin-rating">
                <span className="text-amber-500">★</span>
                <span className="font-medium">{(plugin.avgRating ?? 0).toFixed(1)}</span>
                <span className="text-gray-400">({plugin.reviewCount ?? 0} reviews)</span>
              </div>
              <div className="text-gray-500">{plugin.downloads ?? 0} downloads</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4" data-testid="install-command">
              <p className="text-sm text-gray-500 mb-2">Install Command</p>
              <code className="text-sm font-mono text-gray-900">
                xbrowser install {plugin.name.toLowerCase().replace(/\s+/g, '-')}
              </code>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        © 2024 XBrowser Marketplace
      </footer>

      {/* JSON-LD for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
