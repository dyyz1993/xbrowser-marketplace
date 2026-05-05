import { NavLink } from 'react-router-dom'
import { Plug, LayoutGrid, Terminal, Github } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { AuthButton } from './AuthButton'

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-shrink-0">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Plug className="w-6 h-6 text-blue-500" />
            <span className="hidden sm:inline">xbrowser</span>
            <span className="text-xs font-normal text-gray-400 hidden md:inline">marketplace</span>
          </NavLink>
          <div className="hidden lg:flex items-center gap-1">
            <NavLinkItem to="/categories" icon={LayoutGrid} label="Categories" />
            <NavLinkItem to="/cli" icon={Terminal} label="CLI" />
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4">
          <SearchBar />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <AuthButton />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </nav>
  )
}

const NavLinkItem: React.FC<{ to: string; icon: React.FC<{ className?: string }>; label: string }> = ({
  to,
  icon: Icon,
  label,
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
      }`
    }
  >
    <Icon className="w-4 h-4" />
    {label}
  </NavLink>
)
