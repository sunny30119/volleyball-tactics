import { useReceiveStore } from '../../store/useReceiveStore';
import {
  getLineup,
  getReceiveFormation,
  getSetterPosition,
  isFrontRow,
  type Rotation,
  type PositionNo,
} from '../../logic/receive';
import { ROLE_LABELS } from '../../logic/court';
import type { CameraView } from '../../types';
import { ReceivePresetBar } from './ReceivePresetBar';

// ============================================================
// ReceiveControlPanel — 功能二控制面板（全繁中大字）
//  六輪轉切換 / 上一輪下一輪 / 標籤切換 / 合法範圍開關 /
//  四快速視角 / 重置 / 角色對照小表
// ============================================================

const ROTATIONS: Rotation[] = [1, 2, 3, 4, 5, 6];
const ROTATION_LABELS: Record<Rotation, string> = {
  1: '版面一', 2: '版面二', 3: '版面三', 4: '版面四', 5: '版面五', 6: '版面六',
};

const CAMERA_VIEWS: { view: CameraView; label: string }[] = [
  { view: 'top', label: '上帝' },
  { view: 'baseline', label: '底線' },
  { view: 'side', label: '側面' },
  { view: 'coach', label: '教練' },
];

const POS_NAME: Record<PositionNo, string> = {
  1: '1右後', 2: '2右前', 3: '3中前', 4: '4左前', 5: '5左後', 6: '6中後',
};

export function ReceiveControlPanel() {
  const rotation = useReceiveStore(s => s.rotation);
  const labelMode = useReceiveStore(s => s.labelMode);
  const showLegalZones = useReceiveStore(s => s.showLegalZones);
  const cameraView = useReceiveStore(s => s.cameraView);

  const setRotation = useReceiveStore(s => s.setRotation);
  const nextRotation = useReceiveStore(s => s.nextRotation);
  const prevRotation = useReceiveStore(s => s.prevRotation);
  const setLabelMode = useReceiveStore(s => s.setLabelMode);
  const toggleLegalZones = useReceiveStore(s => s.toggleLegalZones);
  const setCameraView = useReceiveStore(s => s.setCameraView);
  const reset = useReceiveStore(s => s.reset);
  const clearOverrides = useReceiveStore(s => s.clearOverrides);
  const overrideCount = useReceiveStore(s => Object.keys(s.overridePositions).length);

  const setterPos = getSetterPosition(rotation);
  const setterFront = isFrontRow(setterPos);
  const lineup = getLineup(rotation);
  const formation = getReceiveFormation(rotation);
  const passerPositions = new Set(formation.filter(s => s.isPasser).map(s => s.positionNo));

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>接發球站位</h2>

      {/* --- 六輪轉切換 --- */}
      <section style={styles.section}>
        <div style={styles.label}>輪轉版面</div>
        <div style={styles.rotationGrid}>
          {ROTATIONS.map(r => (
            <button
              key={r}
              style={r === rotation ? styles.rotBtnActive : styles.rotBtn}
              onClick={() => setRotation(r)}
            >
              {ROTATION_LABELS[r]}
            </button>
          ))}
        </div>
        <div style={styles.hint}>
          目前：{ROTATION_LABELS[rotation]}（輪轉 {rotation}）｜
          舉球在 {setterPos} 號位（{setterFront ? '前排站位' : '後排插上'}）
        </div>
        <div style={styles.prevNextRow}>
          <button style={styles.stepBtn} onClick={prevRotation}>◀ 上一輪</button>
          <button style={styles.stepBtn} onClick={nextRotation}>下一輪 ▶</button>
        </div>
      </section>

      {/* --- 角色對照表 --- */}
      <section style={styles.section}>
        <div style={styles.label}>號位角色對照</div>
        <table style={styles.table}>
          <tbody>
            {([1, 2, 3, 4, 5, 6] as PositionNo[]).map(p => {
              const e = lineup.find(x => x.positionNo === p)!;
              const isL = e.role === 'L';
              const isS = e.role === 'S';
              return (
                <tr key={p}>
                  <td style={styles.tdPos}>{POS_NAME[p]}</td>
                  <td style={{ ...styles.tdRole, color: isL ? '#FDD835' : isS ? '#4DD0E1' : '#e8eaf6' }}>
                    {ROLE_LABELS[e.role] ?? e.role}
                    {isL && `（原${ROLE_LABELS[e.baseRole]}）`}
                    {passerPositions.has(p) && ' ·接發'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* --- 標籤模式 --- */}
      <section style={styles.section}>
        <div style={styles.label}>標籤顯示</div>
        <div style={styles.toggleRow}>
          <button
            style={labelMode === 'number' ? styles.toggleActive : styles.toggle}
            onClick={() => setLabelMode('number')}
          >
            號位
          </button>
          <button
            style={labelMode === 'role' ? styles.toggleActive : styles.toggle}
            onClick={() => setLabelMode('role')}
          >
            角色
          </button>
        </div>
      </section>

      {/* --- 合法範圍框 --- */}
      <section style={styles.section}>
        <div style={styles.label}>合法站位範圍</div>
        <button
          style={showLegalZones ? styles.toggleActiveWide : styles.toggleWide}
          onClick={toggleLegalZones}
        >
          {showLegalZones ? '✓ 顯示中（點擊隱藏）' : '顯示合法範圍框'}
        </button>
      </section>

      {/* --- 快速視角 --- */}
      <section style={styles.section}>
        <div style={styles.label}>快速視角</div>
        <div style={styles.viewGrid}>
          {CAMERA_VIEWS.map(v => (
            <button
              key={v.view}
              style={v.view === cameraView ? styles.viewBtnActive : styles.viewBtn}
              onClick={() => setCameraView(v.view)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </section>

      {/* --- 10 組預設站位 + 拖曳儲存 --- */}
      <section style={styles.section}>
        <ReceivePresetBar />
      </section>

      {/* --- 重置 --- */}
      <section style={styles.section}>
        <button
          style={overrideCount > 0 ? styles.clearOverrideBtn : styles.clearOverrideBtnDim}
          onClick={clearOverrides}
          disabled={overrideCount === 0}
          title="清除手動拖曳，回到系統計算佈局"
        >
          回到計算佈局{overrideCount > 0 ? `（已拖曳 ${overrideCount} 人）` : ''}
        </button>
        <button style={styles.resetBtn} onClick={reset}>重置（輪轉＋佈局＋視角）</button>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
    color: '#e8eaf6',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#90caf9',
    margin: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#90caf9',
  },
  hint: {
    fontSize: '0.9rem',
    color: '#c5cae9',
    lineHeight: 1.4,
  },
  rotationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  rotBtn: {
    padding: '12px 4px',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: 'transparent',
    color: '#c5cae9',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  rotBtnActive: {
    padding: '12px 4px',
    fontSize: '1rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '2px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  prevNextRow: {
    display: 'flex',
    gap: '8px',
  },
  stepBtn: {
    flex: 1,
    padding: '10px',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: '#152238',
    color: '#e8eaf6',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  tdPos: {
    padding: '5px 8px',
    color: '#9fa8da',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #1a237e',
  },
  tdRole: {
    padding: '5px 8px',
    fontWeight: 700,
    borderBottom: '1px solid #1a237e',
  },
  toggleRow: {
    display: 'flex',
    gap: '8px',
  },
  toggle: {
    flex: 1,
    padding: '10px',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: 'transparent',
    color: '#c5cae9',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  toggleActive: {
    flex: 1,
    padding: '10px',
    fontSize: '1rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '2px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  toggleWide: {
    padding: '12px',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: 'transparent',
    color: '#c5cae9',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  toggleActiveWide: {
    padding: '12px',
    fontSize: '1rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '2px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  viewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  viewBtn: {
    padding: '10px 2px',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: 'transparent',
    color: '#c5cae9',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  viewBtnActive: {
    padding: '10px 2px',
    fontSize: '0.95rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '2px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  resetBtn: {
    padding: '12px',
    fontSize: '1rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #b71c1c',
    background: '#2a1416',
    color: '#ef9a9a',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  clearOverrideBtn: {
    padding: '11px',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: '#152238',
    color: '#90caf9',
    cursor: 'pointer',
    touchAction: 'manipulation',
    marginBottom: '8px',
  },
  clearOverrideBtnDim: {
    padding: '11px',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #26324d',
    background: '#111a2b',
    color: '#546080',
    cursor: 'not-allowed',
    touchAction: 'manipulation',
    marginBottom: '8px',
  },
};
