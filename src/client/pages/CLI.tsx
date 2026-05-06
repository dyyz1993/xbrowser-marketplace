import {
  Terminal,
  Copy,
  Check,
  Download,
  BookOpen,
  Zap,
  Sparkles,
  Upload,
  LogIn,
} from 'lucide-react'
import { useState } from 'react'

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}

export const CLIPage: React.FC = () => {
  const [skillCopied, setSkillCopied] = useState(false)

  const skillCommand = 'curl -o plugin-dev.md https://xbrowser.dev/skills/plugin-dev.md'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
          <Terminal className="w-8 h-8 text-blue-600" />
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
          <StepHeader number={1} title="Install xbrowser CLI" icon={Download} />
          <div className="ml-12 space-y-3">
            <p className="text-gray-600">Install globally via npm:</p>
            <CodeBlock>npm install -g xbrowser</CodeBlock>
            <p className="text-sm text-gray-400">
              Or using yarn: <code className="text-gray-600">yarn global add xbrowser</code>
            </p>
          </div>
        </section>

        <section>
          <StepHeader number={2} title="Browse & Install Plugins" icon={Zap} />
          <div className="ml-12 space-y-3">
            <p className="text-gray-600">Search and install plugins directly from the CLI:</p>
            <CodeBlock>{`# Search for plugins
xbrowser plugin search "ecommerce"

# Install a plugin
xbrowser plugin install @xbrowser/plugin-amazon

# List installed plugins
xbrowser plugin list

# Run a plugin command
xbrowser run amazon scrape`}</CodeBlock>
          </div>
        </section>

        <section>
          <StepHeader number={3} title="Publish Your Plugin" icon={Upload} />
          <div className="ml-12 space-y-3">
            <p className="text-gray-600">Login and publish your plugins to the marketplace:</p>
            <CodeBlock>{`# Login to marketplace
xbrowser plugin login --token <your-api-key>

# Validate your plugin before publishing
xbrowser plugin publish --dry-run

# Publish to marketplace
xbrowser plugin publish

# Check your account
xbrowser plugin whoami`}</CodeBlock>
            <p className="text-sm text-gray-400">
              Get an API key from your{' '}
              <a href="/account" className="text-blue-600 hover:underline">
                developer settings
              </a>
            </p>
          </div>
        </section>

        <section>
          <StepHeader number={4} title="Quick Start" icon={BookOpen} />
          <div className="ml-12 space-y-3">
            <p className="text-gray-600">Common commands to get you started:</p>
            <CodeBlock>{`# Initialize a new project
xbrowser init my-project

# Start the browser automation engine
xbrowser start

# Connect to a running browser
xbrowser connect

# Record user actions
xbrowser record`}</CodeBlock>
          </div>
        </section>

        <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI-Assisted Plugin Development
              </h3>
              <p className="text-gray-600 mb-4">
                Load the xbrowser skill into your AI coding agent to build plugins faster. The skill
                provides templates, best practices, command patterns, and automated scaffolding.
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">1. Download the skill:</p>
                  <div className="relative group">
                    <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
                      {skillCommand}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(skillCommand)
                        setSkillCopied(true)
                        setTimeout(() => setSkillCopied(false), 2000)
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {skillCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    2. Place in your skills directory:
                  </p>
                  <CodeBlock>{`# For Claude Code / OpenCode
mv plugin-dev.md .opencode/skills/

# For Cursor / other agents
mv plugin-dev.md .cursor/skills/`}</CodeBlock>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">3. Ask your AI agent:</p>
                  <pre className="bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm">
                    "Create an xbrowser plugin for scraping product data from example.com"
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Plugin Development Workflow</h3>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600 py-4">
            <WorkflowStep icon={BookOpen} label="Create" />
            <WorkflowArrow />
            <WorkflowStep icon={Zap} label="Test" />
            <WorkflowArrow />
            <WorkflowStep icon={LogIn} label="Login" />
            <WorkflowArrow />
            <WorkflowStep icon={Upload} label="Publish" />
            <WorkflowArrow />
            <WorkflowStep icon={Sparkles} label="AI Assist" />
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            Create → Test locally → Login → Publish to marketplace. Use AI to speed up every step.
          </p>
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
  )
}

const WorkflowStep: React.FC<{
  icon: React.FC<{ className?: string }>
  label: string
}> = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2 border border-blue-200">
    <Icon className="w-4 h-4 text-blue-500" />
    <span className="font-medium">{label}</span>
  </div>
)

const WorkflowArrow = () => <span className="text-blue-400 font-bold">&rarr;</span>

const StepHeader: React.FC<{
  number: number
  title: string
  icon: React.FC<{ className?: string }>
}> = ({ number, title, icon: Icon }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
      {number}
    </div>
    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
      <Icon className="w-5 h-5 text-blue-500" />
      {title}
    </h2>
  </div>
)
