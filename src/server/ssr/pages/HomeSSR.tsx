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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-900">
            XBrowser Marketplace
          </a>
          <div className="flex items-center gap-4">
            <a href="/categories" className="text-gray-600 hover:text-gray-900">
              Categories
            </a>
            <a href="/search" className="text-gray-600 hover:text-gray-900">
              Search
            </a>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">XBrowser Marketplace</h1>
            <p className="text-xl text-gray-600">
              Discover and install browser extensions and plugins
            </p>
            <p className="text-gray-500 mt-2">{totalPlugins} plugins available</p>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <a
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium"
              >
                All
              </a>
              {categories.map(cat => (
                <a
                  key={cat.slug}
                  href="/categories"
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50"
                >
                  {cat.name} ({cat.count})
                </a>
              ))}
            </div>
          )}

          {plugins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plugins.map(plugin => (
                <a
                  key={plugin.slug}
                  href={`/plugins/${plugin.slug}`}
                  className="block bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{plugin.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{plugin.description}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>★ {(plugin.avgRating ?? 0).toFixed(1)}</span>
                    <span>{plugin.downloads ?? 0} downloads</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {plugin.category}
                    </span>
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

      <footer className="py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        © 2024 XBrowser Marketplace
      </footer>
    </div>
  )
}
