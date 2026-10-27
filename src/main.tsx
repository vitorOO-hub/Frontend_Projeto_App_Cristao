import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonte servida pelo próprio app: a CSP de produção bloqueia Google Fonts.
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
