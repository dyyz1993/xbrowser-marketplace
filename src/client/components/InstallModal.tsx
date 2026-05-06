import { useState } from 'react'
import { Modal, message } from 'antd'
import { Copy, Check } from 'lucide-react'

interface InstallModalProps {
  open: boolean
  onClose: () => void
  npmPackage: string | null
  slug: string
}

export const InstallModal: React.FC<InstallModalProps> = ({ open, onClose, npmPackage, slug }) => {
  const [copied, setCopied] = useState<string | null>(null)

  const xbrowserCmd = npmPackage
    ? `xbrowser plugin install ${npmPackage}`
    : `xbrowser plugin install ${slug}`
  const npmCmd = npmPackage ? `npm install ${npmPackage}` : null

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    message.success('Copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Install Plugin" width={520}>
      <div className="space-y-4 py-2">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            xbrowser CLI
          </label>
          <div className="mt-1 flex items-center gap-2 bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm">
            <span className="flex-1 truncate">{xbrowserCmd}</span>
            <button
              onClick={() => handleCopy(xbrowserCmd, 'xbrowser')}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              {copied === 'xbrowser' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {npmCmd && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              npm
            </label>
            <div className="mt-1 flex items-center gap-2 bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm">
              <span className="flex-1 truncate">{npmCmd}</span>
              <button
                onClick={() => handleCopy(npmCmd, 'npm')}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                {copied === 'npm' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Make sure you have xbrowser CLI installed.{' '}
          <a href="/cli" className="text-blue-500 hover:underline">
            Get started
          </a>
        </p>
      </div>
    </Modal>
  )
}
