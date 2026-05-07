import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Package, Filter, ChevronDown } from 'lucide-react'
import { usePluginStore } from '@client/stores/plugin-store'
import { SearchBar } from '@client/components/SearchBar'
import { PluginCard } from '@client/components/PluginCard'
import { CategoryGrid } from '@client/components/CategoryGrid'
import { StatsBar } from '@client/components/StatsBar'
import { LoadingSpinner } from '@client/components/LoadingSpinner'
import { EmptyState } from '@client/components/EmptyState'

const PAGE_SIZE = 9

const sortOptions = [
  { label: 'Newest', value: 'newest', testid: undefined as string | undefined },
  { label: 'Most Downloaded', value: 'most_downloaded', testid: 'sort-option-downloads' },
  { label: 'Popular', value: 'popular', testid: 'sort-option-rating' },
  { label: 'Name A-Z', value: 'name', testid: undefined as string | undefined },
]

export const HomePage: React.FC = () => {
  const {
    stats,
    categories,
    loading,
    fetchStats,
    fetchCategories,
    fetchPlugins,
    fetchPluginsAppend,
    searchPlugins,
    searchPluginsAppend,
  } = usePluginStore()

  const plugins = usePluginStore(s => s.plugins)
  const pagination = usePluginStore(s => s.pagination)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('newest')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchStats()
    fetchCategories()
  }, [fetchStats, fetchCategories])

  const doFetch = useCallback(() => {
    if (searchQuery) {
      searchPlugins({
        q: searchQuery,
        category: selectedCategory ?? undefined,
        page: 1,
        limit: PAGE_SIZE,
      })
    } else {
      fetchPlugins({
        category: selectedCategory ?? undefined,
        sort: sortBy as 'newest' | 'popular' | 'most_downloaded' | 'name',
        page: 1,
        limit: PAGE_SIZE,
      })
    }
  }, [searchQuery, selectedCategory, sortBy, fetchPlugins, searchPlugins])

  useEffect(() => {
    doFetch()
  }, [doFetch])

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    setSelectedCategory(null)
  }

  const handleCategoryFilter = (slug: string | null) => {
    setSearchQuery('')
    setSelectedCategory(slug)
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    setSortDropdownOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLoadMore = () => {
    const nextPage = pagination.page + 1
    if (searchQuery) {
      searchPluginsAppend({
        q: searchQuery,
        category: selectedCategory ?? undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
    } else {
      fetchPluginsAppend({
        category: selectedCategory ?? undefined,
        sort: sortBy as 'newest' | 'popular' | 'most_downloaded' | 'name',
        page: nextPage,
        limit: PAGE_SIZE,
      })
    }
  }

  const categoryChips = useMemo(() => {
    const allChip = { slug: 'all', name: 'All', pluginCount: 0 }
    return [allChip, ...categories]
  }, [categories])

  const hasMore = plugins.length < pagination.total

  const filteredPlugins = useMemo(() => {
    if (searchQuery) {
      return plugins.filter(
        p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return plugins
  }, [plugins, searchQuery])

  return (
    <div className="min-h-screen" data-testid="marketplace-container">
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">xbrowser Plugin Marketplace</h1>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Discover, install, and share browser automation plugins for xbrowser CLI
          </p>
          <div className="flex justify-center">
            <SearchBar size="large" onSearch={handleSearch} />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <StatsBar stats={stats} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {categoryChips.map(cat => (
              <button
                key={cat.slug}
                data-testid={`category-filter-${cat.slug}`}
                onClick={() => handleCategoryFilter(cat.slug === 'all' ? null : cat.slug)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  (cat.slug === 'all' && !selectedCategory) || cat.slug === selectedCategory
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto" ref={sortDropdownRef}>
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="relative">
              <button
                data-testid="sort-select"
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                {sortOptions.find(o => o.value === sortBy)?.label}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      data-testid={opt.testid}
                      onClick={() => handleSortChange(opt.value)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                        sortBy === opt.value ? 'text-blue-600 font-medium' : 'text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        {loading && plugins.length === 0 ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredPlugins.length === 0 ? (
          searchQuery ? (
            <div data-testid="search-empty-state">
              <EmptyState
                icon={Package}
                title={`No plugins found for "${searchQuery}"`}
                description="Try a different search term or browse categories"
              />
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No plugins yet"
              description="Check back soon for new plugins"
            />
          )
        ) : (
          <>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              data-testid="plugin-list"
            >
              {filteredPlugins.map(p => (
                <PluginCard key={p.id} plugin={p} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  data-testid="load-more-button"
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!searchQuery && !selectedCategory && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <CategoryGrid categories={categories} />
        </section>
      )}
    </div>
  )
}
