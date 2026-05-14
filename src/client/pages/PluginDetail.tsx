import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Star,
  Tag,
  Globe,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Calendar,
} from 'lucide-react'
import { message } from 'antd'
import { usePluginStore } from '@client/stores/plugin-store'
import { InstallModal } from '@client/components/InstallModal'
import { LoadingSpinner } from '@client/components/LoadingSpinner'
import { pluginApi } from '@client/services/plugin-api'
import type { Review } from '@client/services/plugin-api'

export const PluginDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const { currentPlugin: plugin, loading, fetchPlugin, trackInstall } = usePluginStore()
  const [reviews, setReviews] = useState<Review[]>(() => [])
  const [installOpen, setInstallOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (slug) fetchPlugin(slug)
  }, [slug, fetchPlugin])

  useEffect(() => {
    if (slug) {
      pluginApi.getReviews(slug, 1, 10).then(res => {
        if (res.success) setReviews(res.data.items)
      })
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!plugin) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-gray-500">Plugin not found.</p>
        <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">
          Back to marketplace
        </Link>
      </div>
    )
  }

  const installCmd = plugin.npmPackage
    ? `xbrowser plugin install ${plugin.npmPackage}`
    : `xbrowser plugin install ${plugin.slug}`

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd)
    setCopied(true)
    message.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInstall = () => {
    setInstallOpen(true)
    if (slug) trackInstall(slug)
  }

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" data-testid="plugin-detail-container">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <h1
                className="text-2xl sm:text-3xl font-bold text-gray-900"
                data-testid="plugin-detail-name"
              >
                {plugin.name}
              </h1>
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                v{plugin.version}
              </span>
              {plugin.license && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {plugin.license}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              by <span className="font-medium text-gray-700">{plugin.authorName}</span>
            </p>
            <p className="text-gray-600 mb-4" data-testid="plugin-detail-description">
              {plugin.description}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" /> {plugin.downloadCount} downloads
              </span>
              <span className="flex items-center gap-1" data-testid="plugin-rating">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />{' '}
                {(plugin.avgRating ?? 0).toFixed(1)} ({plugin.reviewCount ?? 0} reviews)
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Updated {formatDate(plugin.updatedAt)}
              </span>
            </div>

            {plugin.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {plugin.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/search?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <Tag className="w-3 h-3" /> {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:w-72 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Terminal className="w-4 h-4" /> Install
            </button>
            <div
              className="flex items-center gap-2 bg-gray-900 text-green-400 px-4 py-2.5 rounded-lg font-mono text-sm"
              data-testid="install-command"
            >
              <span className="flex-1 truncate text-xs">{installCmd}</span>
              <button
                onClick={handleCopy}
                className="text-gray-400 hover:text-white transition-colors"
                data-testid="copy-install-command-button"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              {plugin.repositoryUrl && (
                <a
                  href={plugin.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Repo
                </a>
              )}
              {plugin.homepageUrl && (
                <a
                  href={plugin.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  <Globe className="w-3.5 h-3.5" /> Homepage
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {plugin.readme && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">README</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {plugin.readme}
              </div>
            </div>
          )}

          {plugin.commands.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Commands</h2>
              <div className="space-y-2">
                {plugin.commands.map(cmd => (
                  <div
                    key={cmd}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <Terminal className="w-4 h-4 text-gray-400" />
                    <code className="text-sm font-mono text-gray-700">{cmd}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div
              className="bg-white rounded-xl border border-gray-200 p-6"
              data-testid="plugin-reviews-section"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reviews</h2>
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">{r.userName}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.title && <p className="text-sm font-medium text-gray-800">{r.title}</p>}
                    {r.content && <p className="text-sm text-gray-600 mt-1">{r.content}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {plugin.siteUrls.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Supported Sites</h3>
              <div className="space-y-1.5">
                {plugin.siteUrls.map(url => (
                  <div key={url} className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plugin.categories.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
              <div className="flex flex-wrap gap-1.5">
                {plugin.categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/search?category=${cat.slug}`}
                    className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {plugin.versions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Version History</h3>
              <div className="space-y-1">
                {plugin.versions.map(v => (
                  <details key={v.id} className="group">
                    <summary className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 -mx-3 transition-colors select-none">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-700">v{v.version}</span>
                        {v.changelog && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            {v.changelog}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDate(v.publishedAt)}</span>
                        <svg
                          className="w-4 h-4 text-gray-300 transition-transform group-open:rotate-90"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </summary>
                    {v.changelog && (
                      <div className="px-3 pb-2 pt-1 ml-6 border-l-2 border-gray-100">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{v.changelog}</p>
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <InstallModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        npmPackage={plugin.npmPackage}
        slug={plugin.slug}
      />
    </div>
  )
}
