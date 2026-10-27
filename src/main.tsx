import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonte servida pelo próprio app: a CSP de produção bloqueia Google Fonts.
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource-variable/archivo/wdth.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
