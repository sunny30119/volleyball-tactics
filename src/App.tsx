import { useRef, useState } from 'react';
import { DefenseTab } from './features/defense/DefenseTab';
import { ReceiveTab } from './features/receive/ReceiveTab';
import { exportAllJSON, importAllJSON, backupFileName } from './logic/backup';
import { useTacticsStore } from './store/useTacticsStore';
import { useReceiveStore } from './store/useReceiveStore';

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

/** 全域備份：一鍵匯出/匯入「防守 10 槽 + 接發 10 槽」。 */
function GlobalBackup() {
  const reloadDefense = useTacticsStore(s => s.reloadSlots);
  const reloadReceive = useReceiveStore(s => s.reloadSlots);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  }

  function handleExport() {
    const json = exportAllJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
    flash('已匯出全部站位備份');
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允許重選同檔
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importAllJSON(String(reader.result ?? ''));
      if (res.ok) {
        // 兩個 store 重新載入 → 切到對應分頁即見還原
        reloadDefense();
        reloadReceive();
        flash(`已匯入 防守${res.defenseCount}組／接發${res.receiveCount}組`);
      } else {
        flash(`匯入失敗：${res.error ?? '未知錯誤'}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={styles.backupWrap}>
      <button style={styles.backupBtn} onClick={handleExport} title="把防守與接發全部站位存成一個備份檔">
        💾 匯出全部
      </button>
      <button style={styles.backupBtn} onClick={handleImportClick} title="從備份檔還原防守與接發全部站位">
        📂 匯入全部
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {notice && <span style={styles.backupNotice}>{notice}</span>}
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
        <GlobalBackup />
      </header>

      {/* 分頁內容 */}
      <main style={styles.main}>
        {activeTab === 'defense' && <DefenseTab />}
        {activeTab === 'receive' && <ReceiveTab />}
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
  backupWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
    flexWrap: 'wrap',
  },
  backupBtn: {
    padding: '9px 14px',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #43A047',
    background: '#1b5e20',
    color: '#c8e6c9',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    touchAction: 'manipulation',
    minHeight: '44px',
  },
  backupNotice: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#a5d6a7',
    whiteSpace: 'nowrap',
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
