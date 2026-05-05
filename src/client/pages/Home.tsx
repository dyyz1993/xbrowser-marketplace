import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { usePluginStore } from '@client/stores/plugin-store'
import { SearchBar } from '@client/components/SearchBar'
import { PluginCard } from '@client/components/PluginCard'
import { CategoryGrid } from '@client/components/CategoryGrid'
import { StatsBar } from '@client/components/StatsBar'
import { LoadingSpinner } from '@client/components/LoadingSpinner'

export const HomePage: React.FC = () => {
  const { stats, categories, loading, fetchStats, fetchCategories, fetchPlugins } = usePluginStore()

  useEffect(() => {
    fetchStats()
    fetchCategories()
    fetchPlugins({ featured: true, limit: 6 })
  }, [fetchStats, fetchCategories, fetchPlugins])

  const featuredPlugins = usePluginStore(s => s.plugins)

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">xbrowser Plugin Marketplace</h1>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Discover, install, and share browser automation plugins for xbrowser CLI
          </p>
          <div className="flex justify-center">
            <SearchBar size="large" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <StatsBar stats={stats} />
      </div>

      {featuredPlugins.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Featured Plugins
            </h2>
            <Link
              to="/search?sort=popular"
              className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredPlugins.map(p => (
                <PluginCard key={p.id} plugin={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <CategoryGrid categories={categories} />
        </section>
      )}

      {stats?.recentPlugins && stats.recentPlugins.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recently Added</h2>
            <Link to="/search" className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1">
              Browse all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recentPlugins.map(p => (
              <PluginCard key={p.id} plugin={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
