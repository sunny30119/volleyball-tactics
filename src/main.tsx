import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useTacticsStore } from './store/useTacticsStore'
import { useReceiveStore } from './store/useReceiveStore'

// 開發模式下暴露 store，方便 console / 自動化測試直接操作狀態
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.__tacticsStore = useTacticsStore;
  w.__receiveStore = useReceiveStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
