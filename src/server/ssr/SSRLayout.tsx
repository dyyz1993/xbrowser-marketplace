import React from 'react'

export const SSRLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">XBrowser Marketplace</span>
          </div>
        </div>
      </nav>
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4">{children}</div>
      </main>
      <footer className="py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        © 2024 XBrowser Marketplace
      </footer>
    </div>
  )
}
