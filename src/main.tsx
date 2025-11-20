import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Ant Design reset styles
import 'antd/dist/reset.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
