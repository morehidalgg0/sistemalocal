import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Si el backend responde 401 (sesión vencida o sin permisos), avisamos a la app
// para que vuelva a la pantalla de login.
const originalFetch = window.fetch.bind(window)
window.fetch = async (...args) => {
  const res = await originalFetch(...args)
  if (res.status === 401) {
    const input = args[0]
    const url = typeof input === 'string' ? input : input?.url || ''
    if (!url.includes('/api/auth/')) {
      window.dispatchEvent(new Event('np:unauthorized'))
    }
  }
  return res
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
