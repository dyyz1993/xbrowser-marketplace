import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

interface SearchBarProps {
  initialQuery?: string
  size?: 'default' | 'large'
  onSearch?: (query: string) => void
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  size = 'default',
  onSearch,
}) => {
  const [query, setQuery] = useState(initialQuery)
  const navigate = useNavigate()

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = query.trim()
      if (!trimmed) return
      if (onSearch) {
        onSearch(trimmed)
      } else {
        navigate(`/search?q=${encodeURIComponent(trimmed)}`)
      }
    },
    [query, navigate, onSearch]
  )

  const isLarge = size === 'large'

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`}
        />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search plugins, tags, sites..."
          data-testid="plugin-search-input"
          className={`w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
            isLarge ? 'py-3.5 text-lg' : 'py-2.5 text-sm'
          }`}
        />
      </div>
    </form>
  )
}
