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

  const installCmd = `xbrowser plugin install ${plugin.name.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar - matches client Navbar.tsx */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-shrink-0">
            <a href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500"
              >
                <path d="M12 22v-5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5" />
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
              </svg>
              <span className="hidden sm:inline">xbrowser</span>
              <span className="text-xs font-normal text-gray-400 hidden md:inline">marketplace</span>
            </a>
            <div className="hidden lg:flex items-center gap-1">
              <a
                href="/categories"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Categories
              </a>
              <a
                href="/cli"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                CLI
              </a>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4">
            <form className="w-full max-w-2xl">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search plugins, tags, sites..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Content - matches client PluginDetail.tsx */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6"
          >
            &larr; Back to Marketplace
          </a>

          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-2">
                  <h1
                    className="text-2xl sm:text-3xl font-bold text-gray-900"
                    data-testid="plugin-detail-name"
                  >
                    {plugin.name}
                  </h1>
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                    v{plugin.version}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  by <span className="font-medium text-gray-700">{plugin.author}</span>
                </p>
                <p className="text-gray-600 mb-4" data-testid="plugin-detail-description">
                  {plugin.description}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>{' '}
                    {plugin.downloads} downloads
                  </span>
                  <span className="flex items-center gap-1" data-testid="plugin-rating">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-amber-400"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>{' '}
                    {(plugin.avgRating ?? 0).toFixed(1)} ({plugin.reviewCount ?? 0} reviews)
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:w-72 flex-shrink-0">
                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" x2="20" y1="19" y2="19" />
                  </svg>{' '}
                  Install
                </div>
                <div
                  className="flex items-center gap-2 bg-gray-900 text-green-400 px-4 py-2.5 rounded-lg font-mono text-sm"
                  data-testid="install-command"
                >
                  <span className="flex-1 truncate text-xs">{installCmd}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - matches client Footer.tsx */}
      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-200 bg-white mt-auto">
        <p className="flex items-center justify-center gap-2">
          <span className="font-medium text-gray-700">xbrowser marketplace</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Built with Hono + React + TypeScript</p>
      </footer>

      {/* JSON-LD for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
