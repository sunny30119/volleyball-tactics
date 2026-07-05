import { useRef } from 'react';
import { useSetplayStore } from '../../store/useSetplayStore';
import { SLOT_COUNT } from '../../logic/setplaySlots';
import { roleLabel, tempoLabel } from '../../logic/setplay';

// ============================================================
// SetplayPresetBar — 配球戰術 10 槽（命名 / 載入 / 改名 / 刪除）
//   仿接發 ReceivePresetBar，用配球 store（獨立 localStorage key）。
//   提示：調好配球後可命名存成戰術。
// ============================================================

export function SetplayPresetBar() {
  const slots = useSetplayStore(s => s.slots);
  const saveSlot = useSetplayStore(s => s.saveSlot);
  const loadSlot = useSetplayStore(s => s.loadSlot);
  const clearSlot = useSetplayStore(s => s.clearSlot);
  const renameSlot = useSetplayStore(s => s.renameSlot);
  const exportSlotsJSON = useSetplayStore(s => s.exportSlotsJSON);
  const importSlotsJSON = useSetplayStore(s => s.importSlotsJSON);

  const fileRef = useRef<HTMLInputElement>(null);

  function handleSave(index: number) {
    const name = window.prompt(`存入戰術 ${index + 1}，請輸入名稱（可留空用預設）：`, '');
    if (name === null) return;
    saveSlot(index, name);
  }

  function handleRename(index: number, currentName: string) {
    const name = window.prompt('重新命名此戰術：', currentName);
    if (name === null || !name.trim()) return;
    renameSlot(index, name);
  }

  function handleClear(index: number, name: string) {
    if (window.confirm(`確定清除戰術 ${index + 1}「${name}」？`)) {
      clearSlot(index);
    }
  }

  function handleExport() {
    const json = exportSlotsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'volleyball-setplay-slots.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importSlotsJSON(String(reader.result ?? ''));
      if (res.ok) {
        window.alert(`匯入成功，共載入 ${res.count} 組戰術。`);
      } else {
        window.alert(`匯入失敗：${res.error ?? '未知錯誤'}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={styles.wrap}>
      <label style={styles.label}>配球戰術（10 組）</label>
      <p style={styles.tip}>調好配球後可命名存成戰術，比賽時快速叫出來跟攻擊手溝通。</p>
      <div style={styles.grid}>
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const slot = slots[i];
          if (!slot) {
            return (
              <button
                key={i}
                style={styles.emptySlot}
                onClick={() => handleSave(i)}
                title={`把當前配球存入戰術 ${i + 1}`}
              >
                <span style={styles.slotNum}>{i + 1}</span>
                <span style={styles.emptyText}>＋ 戰術{i + 1}</span>
              </button>
            );
          }
          return (
            <div key={i} style={styles.filledSlot}>
              <button
                style={styles.filledMain}
                onClick={() => loadSlot(i)}
                title={`載入「${slot.name}」`}
              >
                <span style={styles.slotNumFilled}>{i + 1}</span>
                <span style={styles.filledTexts}>
                  <span style={styles.filledName}>{slot.name}</span>
                  <span style={styles.filledSub}>
                    {slot.play.code}·{roleLabel(slot.role)}·{tempoLabel(slot.play.tempo)}
                  </span>
                </span>
              </button>
              <div style={styles.iconRow}>
                <button
                  style={styles.iconBtn}
                  onClick={() => handleRename(i, slot.name)}
                  title="重新命名"
                  aria-label={`重新命名戰術 ${i + 1}`}
                >
                  ✎
                </button>
                <button
                  style={styles.iconBtnDanger}
                  onClick={() => handleClear(i, slot.name)}
                  title="清除此槽"
                  aria-label={`清除戰術 ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={styles.ioRow}>
        <button style={styles.ioBtn} onClick={handleExport}>匯出 JSON</button>
        <button style={styles.ioBtn} onClick={handleImportClick}>匯入 JSON</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { marginBottom: '4px' },
  label: {
    display: 'block',
    fontSize: '0.95rem',
    color: '#90caf9',
    marginBottom: '4px',
    fontWeight: 700,
  },
  tip: {
    fontSize: '0.82rem',
    color: '#9fa8da',
    margin: '0 0 8px 0',
    lineHeight: 1.4,
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
  filledTexts: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    lineHeight: 1.2,
  },
  filledName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  filledSub: {
    fontSize: '0.72rem',
    fontWeight: 600,
    opacity: 0.85,
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
  ioRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  ioBtn: {
    flex: 1,
    padding: '9px',
    fontSize: '0.9rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: '#152238',
    color: '#c5cae9',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
};
