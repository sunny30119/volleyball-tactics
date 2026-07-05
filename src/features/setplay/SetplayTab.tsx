import { useEffect, useState } from 'react';
import { SetplayScene3D } from './SetplayScene3D';
import { SetplayControlPanel } from './SetplayControlPanel';

// ============================================================
// SetplayTab — 功能三容器（響應式，沿用其他分頁風格）
//   寬螢幕（>900px）：3D 場景 + 右側固定側欄（側視圖在面板頂部）
//   窄螢幕（≤900px）：3D 場景全幅 + 可收合底部面板
// ============================================================

const BREAKPOINT = '(max-width: 900px)';

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(BREAKPOINT).matches);
  useEffect(() => {
    const mql = window.matchMedia(BREAKPOINT);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

export function SetplayTab() {
  const isNarrow = useIsNarrow();
  const [panelOpen, setPanelOpen] = useState(false);

  if (!isNarrow) {
    return (
      <div style={styles.containerWide}>
        <div style={styles.canvasArea}>
          <SetplayScene3D />
        </div>
        <div style={styles.sidebar}>
          <SetplayControlPanel />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.containerNarrow}>
      <div style={styles.canvasArea}>
        <SetplayScene3D />
      </div>

      <button
        style={styles.togglePanelBtn}
        onClick={() => setPanelOpen(o => !o)}
        aria-expanded={panelOpen}
      >
        {panelOpen ? '▼ 收合控制面板' : '⚙ 控制面板（配球 / 側視圖）'}
      </button>

      {panelOpen && (
        <div style={styles.bottomPanel}>
          <SetplayControlPanel />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  containerWide: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    background: '#0a1628',
  },
  containerNarrow: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    flexDirection: 'column',
    background: '#0a1628',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
  sidebar: {
    width: '340px',
    flexShrink: 0,
    overflowY: 'auto',
    borderLeft: '1px solid #1a237e',
    background: '#0d1b2a',
  },
  togglePanelBtn: {
    flexShrink: 0,
    minHeight: '52px',
    fontSize: '1.1rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    background: '#1565C0',
    color: '#ffffff',
    border: 'none',
    borderTop: '2px solid #90caf9',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  bottomPanel: {
    flexShrink: 0,
    maxHeight: '55vh',
    overflowY: 'auto',
    borderTop: '1px solid #1a237e',
    background: '#0d1b2a',
  },
};
