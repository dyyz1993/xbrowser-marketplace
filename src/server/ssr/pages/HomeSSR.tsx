import React from 'react'

interface PluginItem {
  name: string
  description: string
  slug: string
  downloads: number
  avgRating: number
  category: string
}

interface CategoryItem {
  name: string
  slug: string
  count: number
}

interface HomeSSRProps {
  plugins: PluginItem[]
  categories: CategoryItem[]
  totalPlugins: number
}

export const HomeSSR: React.FC<HomeSSRProps> = ({ plugins, categories, totalPlugins }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar - matches client/src/client/components/Navbar.tsx */}
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

      {/* Hero - matches client/src/client/pages/Home.tsx gradient section */}
      <main className="flex-1">
        <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-3xl sm:text-5xl font-bold mb-4">xbrowser Plugin Marketplace</h1>
            <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
              Discover, install, and share browser automation plugins for xbrowser CLI
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="flex items-center gap-2">
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
                className="text-blue-500"
              >
                <path d="M16.5 21a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 14.5" />
              </svg>
              <span className="text-sm font-semibold text-gray-900">{totalPlugins.toLocaleString()}</span>
              <span className="text-xs text-gray-500">Plugins</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {categories.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 text-sm rounded-full border bg-blue-600 text-white border-blue-600">
                  All
                </span>
                {categories.slice(0, 8).map(cat => (
                  <a
                    key={cat.slug}
                    href={`/categories?cat=${cat.slug}`}
                    className="px-3 py-1.5 text-sm rounded-full border bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  >
                    {cat.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          {plugins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plugins.map(plugin => (
                <a
                  key={plugin.slug}
                  href={`/plugin/${plugin.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md p-5 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                        {plugin.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{plugin.description}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
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
                        </svg>
                        {plugin.downloads ?? 0}
                      </span>
                      {(plugin.avgRating ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-amber-400"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {plugin.avgRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No plugins available yet.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer - matches client/src/client/components/Footer.tsx */}
      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-200 bg-white mt-auto">
        <p className="flex items-center justify-center gap-2">
          <span className="font-medium text-gray-700">xbrowser marketplace</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Built with Hono + React + TypeScript</p>
      </footer>
    </div>
  )
}
