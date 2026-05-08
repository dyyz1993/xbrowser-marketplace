import React from 'react'

const iconMap: Record<string, string> = {
  ecommerce: '\uD83D\uDED2',
  social: '\uD83D\uDCAC',
  search: '\uD83D\uDD0D',
  scraping: '\uD83D\uDD77\uFE0F',
  automation: '\uD83E\uDD16',
  productivity: '\u26A1',
  testing: '\uD83E\uDDEA',
  monitoring: '\uD83D\uDCCA',
  devtools: '\uD83D\uDEE0\uFE0F',
}

interface CategoryData {
  name: string
  slug: string
  description?: string
  pluginCount: number
}

interface CategoriesSSRProps {
  categories: CategoryData[]
  totalPlugins: number
}

export const CategoriesSSR: React.FC<CategoriesSSRProps> = ({ categories, totalPlugins }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50"
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

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Browse Categories</h1>
            <p className="text-gray-500">
              Explore {totalPlugins} plugins organized by category
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categories.map(cat => (
                <a
                  key={cat.slug}
                  href={`/search?category=${encodeURIComponent(cat.slug)}`}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center group"
                >
                  <span className="text-2xl">{iconMap[cat.slug] ?? '\uD83D\uDDC2\uFE0F'}</span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                    {cat.name}
                  </span>
                  <span className="text-xs text-gray-400">{cat.pluginCount} plugins</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">No categories available yet.</p>
              <a href="/" className="text-blue-500 hover:underline mt-2 inline-block">
                Back to marketplace
              </a>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-200 bg-white mt-auto">
        <p className="flex items-center justify-center gap-2">
          <span className="font-medium text-gray-700">xbrowser marketplace</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Built with Hono + React + TypeScript</p>
      </footer>
    </div>
  )
}
