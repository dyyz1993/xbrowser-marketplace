import React from 'react'
import { SSRLayout } from '../SSRLayout'

interface PluginSummary {
  name: string
  description: string
  slug: string
  downloads: number
  avgRating: number
  category: string
}

interface HomeSSRProps {
  plugins: PluginSummary[]
  categories: { name: string; slug: string; count: number }[]
}

export const HomeSSR: React.FC<HomeSSRProps> = ({ plugins, categories }) => {
  return (
    <SSRLayout title="XBrowser Marketplace - Browser Extensions & Plugins">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">XBrowser Marketplace</h1>
          <p className="text-xl text-gray-600">
            Discover and install browser extensions and plugins
          </p>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(cat => (
              <a
                key={cat.slug}
                href={`/categories`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50"
              >
                {cat.name} ({cat.count})
              </a>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plugins.map(plugin => (
            <a
              key={plugin.slug}
              href={`/plugin/${plugin.slug}`}
              className="block bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{plugin.name}</h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{plugin.description}</p>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>★ {plugin.avgRating?.toFixed(1) ?? '0.0'}</span>
                <span>{plugin.downloads ?? 0} downloads</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </SSRLayout>
  )
}
