import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const hasSSG = rootElement.getAttribute('data-ssg') === 'true'

if (hasSSG) {
  ReactDOM.hydrateRoot(
    rootElement,
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    {
      onRecoverableError(error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
          const msg = String((error as { message: unknown }).message)
          if (msg.includes('data-ssg') || msg.includes(' hydration')) return
        }
        console.warn('Hydration recovered:', error)
      },
    }
  )
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
