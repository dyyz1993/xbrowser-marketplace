import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const hasSSR = rootElement.getAttribute('data-ssr') === 'true'

if (hasSSR) {
  rootElement.removeAttribute('data-ssr')
  rootElement.classList.add('ssr-transitioning')

  const observer = new MutationObserver(() => {
    rootElement.classList.remove('ssr-transitioning')
    observer.disconnect()
  })
  observer.observe(rootElement, { childList: true, subtree: true })
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
