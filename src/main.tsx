import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useTacticsStore } from './store/useTacticsStore'

// 開發模式下暴露 store，方便 console / 自動化測試直接操作狀態
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__tacticsStore = useTacticsStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
