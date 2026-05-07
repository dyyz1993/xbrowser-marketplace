import { Link } from 'react-router-dom'
import { Download, Star, Tag, Copy } from 'lucide-react'
import React, { useState } from 'react'
import type { PluginListItem } from '@client/services/plugin-api'

interface PluginCardProps {
  plugin: PluginListItem
}

export const PluginCard = React.memo(function PluginCard({ plugin }: PluginCardProps) {
  const [copied, setCopied] = useState(false)

  const installCmd = `xbrowser plugin install ${plugin.slug}`

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link
      to={`/plugin/${plugin.slug}`}
      data-testid="plugin-card"
      className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 truncate">
            {plugin.name}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            by {plugin.authorName} &middot; v{plugin.version}
          </p>
        </div>
        {plugin.screenshotUrl && (
          <img
            src={plugin.screenshotUrl}
            alt={plugin.name}
            className="w-12 h-12 rounded-lg object-cover border border-gray-100 flex-shrink-0"
          />
        )}
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{plugin.description}</p>

      {plugin.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {plugin.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            {plugin.downloadCount}
          </span>
          {(plugin.avgRating ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {plugin.avgRating!.toFixed(1)}
            </span>
          )}
          {plugin.reviewCount != null && plugin.reviewCount > 0 && (
            <span className="text-gray-400">({plugin.reviewCount})</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
          title="Copy install command"
        >
          {copied ? (
            <span className="text-green-500">Copied!</span>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-[10px] text-gray-400 max-w-[120px] truncate">
                {installCmd}
              </span>
            </>
          )}
        </button>
      </div>
    </Link>
  )
})
