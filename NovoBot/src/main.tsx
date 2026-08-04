import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { AuthOverlay } from './components/AuthOverlay'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthOverlay>
      <App />
    </AuthOverlay>
  </StrictMode>,
)
