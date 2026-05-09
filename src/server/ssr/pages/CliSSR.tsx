import React from 'react'

export const CliSSR: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-shrink-0">
            <a href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500"
              >
                <path d="M12 22v-5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5" />
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
              </svg>
              <span className="hidden sm:inline">xbrowser</span>
              <span className="text-xs font-normal text-gray-400 hidden md:inline">
                marketplace
              </span>
            </a>
            <div className="hidden lg:flex items-center gap-1">
              <a
                href="/categories"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Categories
              </a>
              <a
                href="/cli"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50"
              >
                CLI
              </a>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4">
            <form className="w-full max-w-2xl">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search plugins, tags, sites..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600"
              >
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" x2="20" y1="19" y2="19" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get Started with xbrowser CLI
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Install the xbrowser CLI and start using plugins from the marketplace in minutes
            </p>
          </div>

          <div className="space-y-10">
            <section>
              <StepHeader number={1} title="Install xbrowser CLI" />
              <div className="ml-12 space-y-3">
                <p className="text-gray-600">Install globally via npm:</p>
                <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
                  npm install -g xbrowser
                </pre>
                <p className="text-sm text-gray-400">
                  Or using yarn: <code className="text-gray-600">yarn global add xbrowser</code>
                </p>
              </div>
            </section>

            <section>
              <StepHeader number={2} title="Browse &amp; Install Plugins" />
              <div className="ml-12 space-y-3">
                <p className="text-gray-600">Search and install plugins directly from the CLI:</p>
                <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
                  {`# Search for plugins
xbrowser plugin search "ecommerce"

# Install a plugin
xbrowser plugin install @xbrowser/plugin-amazon

# List installed plugins
xbrowser plugin list

# Run a plugin command
xbrowser run amazon scrape`}
                </pre>
              </div>
            </section>

            <section>
              <StepHeader number={3} title="Publish Your Plugin" />
              <div className="ml-12 space-y-3">
                <p className="text-gray-600">Login and publish your plugins to the marketplace:</p>
                <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
                  {`# Login to marketplace
xbrowser plugin login --token <your-api-key>

# Validate your plugin before publishing
xbrowser plugin publish --dry-run

# Publish to marketplace
xbrowser plugin publish

# Check your account
xbrowser plugin whoami`}
                </pre>
              </div>
            </section>

            <section>
              <StepHeader number={4} title="Quick Start" />
              <div className="ml-12 space-y-3">
                <p className="text-gray-600">Common commands to get you started:</p>
                <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
                  {`# Initialize a new project
xbrowser init my-project

# Start the browser automation engine
xbrowser start

# Connect to a running browser
xbrowser connect

# Record user actions
xbrowser record`}
                </pre>
              </div>
            </section>

            <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-lg">&#10024;</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    AI-Assisted Plugin Development
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Load the xbrowser skill into your AI coding agent to build plugins faster.
                  </p>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Download the skill:</p>
                    <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
                      curl -o plugin-dev.md https://xbrowser.dev/skills/plugin-dev.md
                    </pre>
                    <p className="text-sm font-medium text-gray-700">
                      Place in your skills directory:
                    </p>
                    <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
                      {`# For Claude Code / OpenCode
mv plugin-dev.md .opencode/skills/

# For Cursor / other agents
mv plugin-dev.md .cursor/skills/`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            <section className="text-center py-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Ready to build?</h3>
              <div className="flex items-center justify-center gap-4">
                <a
                  href="/"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Browse Plugins
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  View on GitHub
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-200 bg-white mt-auto">
        <p className="flex items-center justify-center gap-2">
          <span className="font-medium text-gray-700">xbrowser marketplace</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Built with Hono + React + TypeScript</p>
      </footer>
    </div>
  )
}

const StepHeader: React.FC<{ number: number; title: string }> = ({ number, title }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
      {number}
    </div>
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
  </div>
)
