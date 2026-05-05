import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePluginStore } from '@client/stores/plugin-store'
import { CategoryGrid } from '@client/components/CategoryGrid'
import { LoadingSpinner } from '@client/components/LoadingSpinner'

export const CategoriesPage: React.FC = () => {
  const { categories, loading, fetchCategories } = usePluginStore()

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Browse Categories</h1>
        <p className="text-gray-500">Explore plugins organized by category</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No categories available yet.</p>
          <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">
            Back to marketplace
          </Link>
        </div>
      ) : (
        <CategoryGrid categories={categories} />
      )}
    </div>
  )
}
