import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AdminModeProvider } from './contexts/AdminModeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminModeProvider>
      <App />
    </AdminModeProvider>
  </StrictMode>,
)
