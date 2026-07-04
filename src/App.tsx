import { useState } from 'react';
import { DefenseTab } from './features/defense/DefenseTab';

// ============================================================
// App — 主分頁架構
// 三個分頁：防守佔位模擬 / 接發球站位 / 舉球參數
// 大字體、觸控友善、全繁體中文
// ============================================================

type TabId = 'defense' | 'receive' | 'setting';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'defense', label: '防守佔位模擬' },
  { id: 'receive', label: '接發球站位' },
  { id: 'setting', label: '舉球參數' },
];

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div style={placeholderStyles.container}>
      <p style={placeholderStyles.text}>{label}｜功能開發中</p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('defense');

  return (
    <div style={styles.root}>
      {/* 頂部導覽列 */}
      <header style={styles.header}>
        <h1 style={styles.appTitle}>排球戰術教練台</h1>
        <nav style={styles.nav}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={activeTab === tab.id ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 分頁內容 */}
      <main style={styles.main}>
        {activeTab === 'defense' && <DefenseTab />}
        {activeTab === 'receive' && <PlaceholderTab label="接發球站位" />}
        {activeTab === 'setting' && <PlaceholderTab label="舉球參數" />}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0a1628',
    color: '#e8eaf6',
    fontFamily: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '0 20px',
    background: '#0d1b2a',
    borderBottom: '2px solid #1565C0',
    flexShrink: 0,
    flexWrap: 'wrap',
    minHeight: '60px',
  },
  appTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#90caf9',
    margin: 0,
    whiteSpace: 'nowrap',
  },
  nav: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 20px',
    fontSize: '1.05rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: 'transparent',
    color: '#c5cae9',
    cursor: 'pointer',
    transition: 'background 0.15s',
    minWidth: '120px',
  },
  tabActive: {
    padding: '10px 20px',
    fontSize: '1.05rem',
    fontWeight: 700,
    borderRadius: '8px',
    border: '2px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    cursor: 'pointer',
    minWidth: '120px',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};

const placeholderStyles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: '1.5rem',
    color: '#5c6bc0',
    fontWeight: 600,
  },
};
