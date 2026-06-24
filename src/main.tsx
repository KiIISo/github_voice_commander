import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './logger/ErrorBoundary'
import { log } from './logger'
import './index.css'

window.addEventListener('error', (e) => {
  log.error('Uncaught error', { message: e.message, filename: e.filename, line: e.lineno })
})

window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  log.error('Unhandled promise rejection', { reason: String(e.reason) })
})

log.info('App starting')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
