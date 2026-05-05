import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import type { Category } from '@client/services/plugin-api'

const iconMap: Record<string, string> = {
  ecommerce: '🛒',
  social: '💬',
  search: '🔍',
  scraping: '🕷️',
  automation: '🤖',
  productivity: '⚡',
  testing: '🧪',
  monitoring: '📊',
  devtools: '🛠️',
}

interface CategoryGridProps {
  categories: Category[]
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  if (categories.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {categories.map(cat => (
        <Link
          key={cat.id}
          to={`/search?category=${encodeURIComponent(cat.slug)}`}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center group"
        >
          <span className="text-2xl">{iconMap[cat.slug] ?? <FolderOpen className="w-7 h-7 text-gray-400" />}</span>
          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{cat.name}</span>
          <span className="text-xs text-gray-400">{cat.pluginCount} plugins</span>
        </Link>
      ))}
    </div>
  )
}
