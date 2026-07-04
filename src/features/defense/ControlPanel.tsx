import { useTacticsStore } from '../../store/useTacticsStore';

// ============================================================
// ControlPanel — 右側（或底部）控制面板 placeholder
// 完整實作待工程師依 CONTRACTS.md 開發：
//   - 防守體系切換（邊線/輪轉）
//   - 攔中模式切換（單人/雙人）
//   - 網高選擇（2.24 / 2.30 / 2.43）
//   - 扇形角度覆蓋
//   - 標籤模式切換（號位/角色）
//   - 快速視角按鈕
//   - 情境儲存與匯入匯出
// ============================================================

const NET_HEIGHTS = [
  { label: '女子 2.24m', value: 2.24 },
  { label: '青年 2.30m', value: 2.30 },
  { label: '男子 2.43m', value: 2.43 },
];

export function ControlPanel() {
  const {
    system, setSystem,
    middleBlockMode, setMiddleBlockMode,
    netHeight, setNetHeight,
    labelMode, setLabelMode,
    cameraView, setCameraView,
    defenseResult,
  } = useTacticsStore();

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>防守設定</h2>

      {/* 防守體系 */}
      <section style={styles.section}>
        <label style={styles.label}>防守體系</label>
        <div style={styles.btnGroup}>
          <button
            style={system === 'perimeter' ? styles.btnActive : styles.btn}
            onClick={() => setSystem('perimeter')}
          >
            邊線防守
          </button>
          <button
            style={system === 'rotation' ? styles.btnActive : styles.btn}
            onClick={() => setSystem('rotation')}
          >
            輪轉防守
          </button>
        </div>
      </section>

      {/* 攔中模式 */}
      <section style={styles.section}>
        <label style={styles.label}>中間快攻攔網</label>
        <div style={styles.btnGroup}>
          <button
            style={middleBlockMode === 'single' ? styles.btnActive : styles.btn}
            onClick={() => setMiddleBlockMode('single')}
          >
            單人攔網
          </button>
          <button
            style={middleBlockMode === 'double' ? styles.btnActive : styles.btn}
            onClick={() => setMiddleBlockMode('double')}
          >
            雙人攔網
          </button>
        </div>
      </section>

      {/* 網高 */}
      <section style={styles.section}>
        <label style={styles.label}>網高</label>
        <div style={styles.btnGroup}>
          {NET_HEIGHTS.map(h => (
            <button
              key={h.value}
              style={netHeight === h.value ? styles.btnActive : styles.btn}
              onClick={() => setNetHeight(h.value)}
            >
              {h.label}
            </button>
          ))}
        </div>
      </section>

      {/* 標籤模式 */}
      <section style={styles.section}>
        <label style={styles.label}>球員標籤</label>
        <div style={styles.btnGroup}>
          <button
            style={labelMode === 'number' ? styles.btnActive : styles.btn}
            onClick={() => setLabelMode('number')}
          >
            號位
          </button>
          <button
            style={labelMode === 'role' ? styles.btnActive : styles.btn}
            onClick={() => setLabelMode('role')}
          >
            角色
          </button>
        </div>
      </section>

      {/* 視角 */}
      <section style={styles.section}>
        <label style={styles.label}>視角</label>
        <div style={styles.btnGroup}>
          {(
            [
              ['top',      '上帝視角'],
              ['baseline', '底線視角'],
              ['side',     '側面視角'],
              ['coach',    '教練視角'],
            ] as const
          ).map(([view, label]) => (
            <button
              key={view}
              style={cameraView === view ? styles.btnActive : styles.btn}
              onClick={() => setCameraView(view)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 防守結果摘要 */}
      {defenseResult && (
        <section style={styles.section}>
          <label style={styles.label}>攻擊扇形角度</label>
          <p style={styles.info}>{defenseResult.attackFan.angleDeg.toFixed(1)}°</p>
          <label style={styles.label}>攔網球員</label>
          <p style={styles.info}>
            {defenseResult.players
              .filter(p => p.isBlocking)
              .map(p => `${p.id}號位`)
              .join('、') || '無'}
          </p>
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '16px',
    background: '#0d1b2a',
    color: '#e8eaf6',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
    minWidth: '200px',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#90caf9',
  },
  section: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#90caf9',
    marginBottom: '6px',
    fontWeight: 600,
  },
  btnGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  btn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #3949ab',
    background: '#1a237e',
    color: '#c5cae9',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  btnActive: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 700,
  },
  info: {
    fontSize: '1rem',
    color: '#fff',
    margin: '2px 0 0 0',
  },
};
