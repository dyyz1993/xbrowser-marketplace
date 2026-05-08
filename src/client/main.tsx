/**
 * Application entry point
 *
 * If the server has pre-rendered content (SSR), hydrate it to attach event
 * handlers without destroying the existing DOM.  Otherwise fall back to a
 * normal client-side render (pure SPA).
 */

import { hydrateRoot, createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

const rootEl = document.getElementById('root')!

if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, <App />)
} else {
  createRoot(rootEl).render(<App />)
}
