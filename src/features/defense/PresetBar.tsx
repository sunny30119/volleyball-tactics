import { useTacticsStore } from '../../store/useTacticsStore';
import { SLOT_COUNT } from '../../logic/scenarios';

// ============================================================
// PresetBar — 10 組可記憶的預設站位快速鈕
//   排列：兩列 × 5，觸控友善（≥44px），全繁體中文
//   空槽：顯示「＋ 站位N」（淡色），點擊＝把當前佔位存入該槽
//   已存槽：顯示教練取的名稱，單擊＝載入；旁附小圖示鈕（重新命名 / 清除）
// ============================================================

export function PresetBar() {
  const slots = useTacticsStore(s => s.slots);
  const saveScenarioToSlot = useTacticsStore(s => s.saveScenarioToSlot);
  const loadSlot = useTacticsStore(s => s.loadSlot);
  const clearSlot = useTacticsStore(s => s.clearSlot);
  const renameSlot = useTacticsStore(s => s.renameSlot);

  function handleSave(index: number) {
    const name = window.prompt(`存入站位 ${index + 1}，請輸入名稱（可留空用預設）：`, '');
    // 使用者按取消 → null；按確定（含空字串）→ 存入
    if (name === null) return;
    saveScenarioToSlot(index, name);
  }

  function handleRename(index: number, currentName: string) {
    const name = window.prompt('重新命名此站位：', currentName);
    if (name === null || !name.trim()) return;
    renameSlot(index, name);
  }

  function handleClear(index: number, name: string) {
    if (window.confirm(`確定清除站位 ${index + 1}「${name}」？`)) {
      clearSlot(index);
    }
  }

  return (
    <div style={styles.wrap}>
      <label style={styles.label}>預設站位（點選切換討論）</label>
      <div style={styles.grid}>
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const slot = slots[i];
          if (!slot) {
            // --- 空槽 ---
            return (
              <button
                key={i}
                style={styles.emptySlot}
                onClick={() => handleSave(i)}
                title={`把當前佔位存入站位 ${i + 1}`}
              >
                <span style={styles.slotNum}>{i + 1}</span>
                <span style={styles.emptyText}>＋ 站位{i + 1}</span>
              </button>
            );
          }
          // --- 已存槽 ---
          return (
            <div key={i} style={styles.filledSlot}>
              <button
                style={styles.filledMain}
                onClick={() => loadSlot(i)}
                title={`載入「${slot.name}」`}
              >
                <span style={styles.slotNumFilled}>{i + 1}</span>
                <span style={styles.filledName}>{slot.name}</span>
              </button>
              <div style={styles.iconRow}>
                <button
                  style={styles.iconBtn}
                  onClick={() => handleRename(i, slot.name)}
                  title="重新命名"
                  aria-label={`重新命名站位 ${i + 1}`}
                >
                  ✎
                </button>
                <button
                  style={styles.iconBtnDanger}
                  onClick={() => handleClear(i, slot.name)}
                  title="清除此槽"
                  aria-label={`清除站位 ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p style={styles.hint}>
        空槽點擊＝存入當前攻擊點＋佔位＋體系；已存槽點擊＝載入。
      </p>
    </div>
  );
}

// --- 樣式（觸控友善：主鈕高度 ≥44px、深色投影主題）---

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '0.95rem',
    color: '#90caf9',
    marginBottom: '8px',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  emptySlot: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: '48px',
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1px dashed #3949ab',
    background: 'rgba(26,35,126,0.25)',
    color: '#7986cb',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    fontWeight: 600,
    touchAction: 'manipulation',
    textAlign: 'left',
  },
  slotNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(121,134,203,0.2)',
    color: '#9fa8da',
    fontSize: '0.85rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  emptyText: {
    opacity: 0.9,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  filledSlot: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '4px',
    minHeight: '48px',
    borderRadius: '10px',
    border: '1px solid #1565C0',
    background: 'linear-gradient(135deg,#1565C0,#0d47a1)',
    overflow: 'hidden',
  },
  filledMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
    minHeight: '44px',
    padding: '8px 6px 8px 10px',
    border: 'none',
    background: 'transparent',
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    fontWeight: 700,
    touchAction: 'manipulation',
    textAlign: 'left',
  },
  slotNumFilled: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.22)',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: 800,
    flexShrink: 0,
  },
  filledName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  iconRow: {
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid rgba(255,255,255,0.25)',
  },
  iconBtn: {
    flex: 1,
    minWidth: '28px',
    padding: '0 6px',
    border: 'none',
    background: 'rgba(0,0,0,0.15)',
    color: '#e3f2fd',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    touchAction: 'manipulation',
  },
  iconBtnDanger: {
    flex: 1,
    minWidth: '28px',
    padding: '0 6px',
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(127,29,29,0.55)',
    color: '#ffcdd2',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    touchAction: 'manipulation',
  },
  hint: {
    fontSize: '0.82rem',
    color: '#9fa8da',
    margin: '8px 0 0 0',
    lineHeight: 1.5,
  },
};
