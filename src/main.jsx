import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initLockScreenServiceWorker } from './services/lockScreenMonitor.js'

// Pre-initialize service worker for iPhone 13 Lock Screen notifications
if (typeof window !== 'undefined') {
  initLockScreenServiceWorker();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

