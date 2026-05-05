import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '../client/index.css'
import { setupApiRequestDeps } from '@shared/core/api-request'
import { useLoadingStore } from './stores/loadingStore'
import { message } from 'antd'

setupApiRequestDeps({
  loadingStore: useLoadingStore.getState(),
  messageApi: message,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
