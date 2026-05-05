import { ReactNode } from 'react'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'

interface LayoutProps {
  children: ReactNode
  className?: string
}

export const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${className}`} data-testid="app-container">
      <Navbar />
      <main className="flex-1" data-testid="app-main">
        {children}
      </main>
      <Footer />
    </div>
  )
}
