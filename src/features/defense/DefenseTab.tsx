import { Scene3D } from './Scene3D';
import { ControlPanel } from './ControlPanel';

// ============================================================
// DefenseTab — 功能一容器
// 佈局：桌面寬螢幕 → 左側 3D Canvas + 右側控制面板
//       窄螢幕（平板直式）→ Canvas 上方 + 可收合底部面板
// ============================================================

export function DefenseTab() {
  return (
    <div style={styles.container}>
      {/* 3D 場景區域 */}
      <div style={styles.canvasArea}>
        <Scene3D />
      </div>

      {/* 控制面板區域 */}
      <div style={styles.panelArea}>
        <ControlPanel />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    // 手機/平板直式改為 column（由 CSS media query 控制，這裡先用 row）
    flexDirection: 'row',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
  },
  panelArea: {
    width: '240px',
    flexShrink: 0,
    overflowY: 'auto',
    borderLeft: '1px solid #1a237e',
  },
};
