import { useEffect, useState } from 'react';
import { Scene3D } from './Scene3D';
import { ControlPanel } from './ControlPanel';

// ============================================================
// DefenseTab — 功能一容器（響應式）
// 寬螢幕（>900px）：3D 場景主區域 + 右側固定側欄（300px 可捲動）
// 窄螢幕（≤900px）：3D 場景全幅 + 可收合底部面板（大按鈕展開）
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

export function DefenseTab() {
  const isNarrow = useIsNarrow();
  const [panelOpen, setPanelOpen] = useState(false);

  if (!isNarrow) {
    // --- 寬螢幕：右側固定側欄 ---
    return (
      <div style={styles.containerWide}>
        <div style={styles.canvasArea}>
          <Scene3D />
        </div>
        <div style={styles.sidebar}>
          <ControlPanel />
        </div>
      </div>
    );
  }

  // --- 窄螢幕：底部可收合面板 ---
  return (
    <div style={styles.containerNarrow}>
      <div style={styles.canvasArea}>
        <Scene3D />
      </div>

      <button
        style={styles.togglePanelBtn}
        onClick={() => setPanelOpen(o => !o)}
        aria-expanded={panelOpen}
      >
        {panelOpen ? '▼ 收合控制面板' : '⚙ 控制面板'}
      </button>

      {panelOpen && (
        <div style={styles.bottomPanel}>
          <ControlPanel />
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
    minWidth: 0, // 防止 canvas 內在尺寸卡住 flex 縮小（視窗縮小時場景跟著縮）
    overflow: 'hidden',
  },
  sidebar: {
    width: '300px',
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
    maxHeight: '45vh',
    overflowY: 'auto',
    borderTop: '1px solid #1a237e',
    background: '#0d1b2a',
  },
};
