import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CLIPage } from '../CLI'

const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
})

describe('CLIPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial Render', () => {
    it('should render page title', () => {
      render(<CLIPage />)
      expect(screen.getByText('Get Started with xbrowser CLI')).toBeInTheDocument()
    })

    it('should render page description', () => {
      render(<CLIPage />)
      expect(screen.getByText(/Install the xbrowser CLI and start using plugins/)).toBeInTheDocument()
    })
  })

  describe('Step Sections', () => {
    it('should render step 1 - Install xbrowser CLI', () => {
      render(<CLIPage />)
      expect(screen.getByText('Install xbrowser CLI')).toBeInTheDocument()
      expect(screen.getByText('Install globally via npm:')).toBeInTheDocument()
    })

    it('should render install command code block', () => {
      render(<CLIPage />)
      expect(screen.getByText('npm install -g xbrowser')).toBeInTheDocument()
    })

    it('should render yarn alternative', () => {
      render(<CLIPage />)
      expect(screen.getByText(/yarn global add xbrowser/)).toBeInTheDocument()
    })

    it('should render step 2 - Browse & Install Plugins', () => {
      render(<CLIPage />)
      expect(screen.getByText('Browse & Install Plugins')).toBeInTheDocument()
    })

    it('should render step 3 - Publish Your Plugin', () => {
      render(<CLIPage />)
      expect(screen.getByText('Publish Your Plugin')).toBeInTheDocument()
    })

    it('should render step 4 - Quick Start', () => {
      render(<CLIPage />)
      expect(screen.getByText('Quick Start')).toBeInTheDocument()
    })

    it('should render key CLI commands', () => {
      render(<CLIPage />)
      expect(screen.getByText(/xbrowser plugin search/)).toBeInTheDocument()
      expect(screen.getByText(/xbrowser plugin install/)).toBeInTheDocument()
      expect(screen.getByText(/xbrowser plugin list/)).toBeInTheDocument()
      expect(screen.getByText(/xbrowser init my-project/)).toBeInTheDocument()
      expect(screen.getByText(/xbrowser start/)).toBeInTheDocument()
    })
  })

  describe('AI-Assisted Development Section', () => {
    it('should render AI section title', () => {
      render(<CLIPage />)
      expect(screen.getByText('AI-Assisted Plugin Development')).toBeInTheDocument()
    })

    it('should render skill download command', () => {
      render(<CLIPage />)
      expect(screen.getByText(/curl -o plugin-dev.md/)).toBeInTheDocument()
    })

    it('should render skill placement instructions', () => {
      render(<CLIPage />)
      expect(screen.getByText(/mv plugin-dev.md .opencode\/skills\//)).toBeInTheDocument()
    })

    it('should render AI agent prompt example', () => {
      render(<CLIPage />)
      expect(
        screen.getByText(/Create an xbrowser plugin for scraping/)
      ).toBeInTheDocument()
    })
  })

  describe('Plugin Development Workflow', () => {
    it('should render workflow steps', () => {
      render(<CLIPage />)
      expect(screen.getByText('Create')).toBeInTheDocument()
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Publish')).toBeInTheDocument()
      expect(screen.getByText('AI Assist')).toBeInTheDocument()
    })

    it('should render workflow description', () => {
      render(<CLIPage />)
      expect(
        screen.getByText(/Create → Test locally → Login → Publish/)
      ).toBeInTheDocument()
    })
  })

  describe('Call to Action', () => {
    it('should render ready to build section', () => {
      render(<CLIPage />)
      expect(screen.getByText('Ready to build?')).toBeInTheDocument()
    })

    it('should render browse plugins link', () => {
      render(<CLIPage />)
      expect(screen.getByText('Browse Plugins')).toBeInTheDocument()
    })

    it('should render GitHub link', () => {
      render(<CLIPage />)
      expect(screen.getByText('View on GitHub')).toBeInTheDocument()
    })
  })

  describe('Copy Functionality', () => {
    it('should have copy buttons for code blocks', () => {
      render(<CLIPage />)
      const copyButtons = screen.getAllByRole('button')
      const copyBtnCount = copyButtons.filter(
        btn => btn.querySelector('svg.lucide-copy')
      ).length
      expect(copyBtnCount).toBeGreaterThan(0)
    })

    it('should call clipboard.writeText when copy button clicked', () => {
      render(<CLIPage />)
      const copyButtons = screen.getAllByRole('button')
      const copyBtn = copyButtons.find(btn => btn.querySelector('svg.lucide-copy'))
      if (copyBtn) {
        fireEvent.click(copyBtn)
        expect(mockWriteText).toHaveBeenCalled()
      }
    })
  })

  describe('Developer Settings Link', () => {
    it('should render developer settings link in publish section', () => {
      render(<CLIPage />)
      expect(screen.getByText('developer settings')).toBeInTheDocument()
    })
  })
})
