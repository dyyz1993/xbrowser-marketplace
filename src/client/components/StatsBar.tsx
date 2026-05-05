import { Download, Package, Star } from 'lucide-react'
import type { MarketplaceStats } from '@client/services/plugin-api'

interface StatsBarProps {
  stats: MarketplaceStats | null
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  if (!stats) return null

  const items = [
    { icon: Package, label: 'Plugins', value: stats.totalPlugins },
    { icon: Download, label: 'Downloads', value: stats.totalDownloads },
    { icon: Star, label: 'Reviews', value: stats.totalReviews },
  ]

  return (
    <div className="flex items-center justify-center gap-8 py-4">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <item.icon className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</span>
          <span className="text-xs text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
