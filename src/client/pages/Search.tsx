import { useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, Package } from 'lucide-react'
import { Select, Pagination } from 'antd'
import { usePluginStore } from '@client/stores/plugin-store'
import { PluginCard } from '@client/components/PluginCard'
import { SearchBar } from '@client/components/SearchBar'
import { LoadingSpinner } from '@client/components/LoadingSpinner'
import { EmptyState } from '@client/components/EmptyState'

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const { plugins, categories, loading, pagination, searchPlugins, fetchPlugins, fetchCategories } = usePluginStore()

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const doSearch = useCallback(() => {
    if (query) {
      searchPlugins({ q: query, category: category || undefined, page, limit: 20 })
    } else if (category) {
      fetchPlugins({ category, sort: sort as 'newest' | 'popular' | 'most_downloaded' | 'name', page, limit: 20 })
    } else {
      fetchPlugins({ sort: sort as 'newest' | 'popular' | 'most_downloaded' | 'name', page, limit: 20 })
    }
  }, [query, category, sort, page, searchPlugins, fetchPlugins])

  useEffect(() => {
    doSearch()
  }, [doSearch])

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <SearchBar initialQuery={query} onSearch={q => updateParam('q', q)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select
            value={category || undefined}
            onChange={v => updateParam('category', v ?? '')}
            allowClear
            placeholder="All Categories"
            style={{ width: 180 }}
            options={categories.map(c => ({ label: `${c.name} (${c.pluginCount})`, value: c.slug }))}
          />
        </div>
        <Select
          value={sort}
          onChange={v => updateParam('sort', v)}
          style={{ width: 160 }}
          options={[
            { label: 'Newest', value: 'newest' },
            { label: 'Most Downloaded', value: 'most_downloaded' },
            { label: 'Popular', value: 'popular' },
            { label: 'Name A-Z', value: 'name' },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : plugins.length === 0 ? (
        <EmptyState
          icon={Package}
          title={query ? `No plugins found for "${query}"` : 'No plugins found'}
          description="Try a different search term or browse categories"
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {pagination.total} result{pagination.total !== 1 ? 's' : ''}
            {query ? ` for "${query}"` : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {plugins.map(p => (
              <PluginCard key={p.id} plugin={p} />
            ))}
          </div>
          {pagination.total > pagination.pageSize && (
            <div className="flex justify-center">
              <Pagination
                current={page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={p => updateParam('page', String(p))}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
