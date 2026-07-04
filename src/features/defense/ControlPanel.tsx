import { useRef, useState } from 'react';
import { useTacticsStore } from '../../store/useTacticsStore';
import { ROLE_LABELS } from '../../logic/court';

// ============================================================
// ControlPanel — 控制面板（全繁體中文、大字體、觸控友善 ≥44px）
//   1. 防守體系切換（邊線/輪轉）
//   2. 3號位快攻攔網（單人/雙人）
//   3. 快速視角四鈕
//   4. 網高選擇
//   5. 球員標籤模式（號位/角色）
//   6. 攻擊扇形角度（自動 / 手動滑桿 40–120°）
//   7. 佔位微調（隨時可拖曳我方球員）+ 儲存為情境
//   8. 情境清單（載入 / 刪除）
//   9. 匯出 / 匯入 JSON
//  10. 重置
// ============================================================

const NET_HEIGHTS = [
  { label: '2.24m（女）', value: 2.24 },
  { label: '2.30m（國中）', value: 2.30 },
  { label: '2.43m（男）', value: 2.43 },
];

const CAMERA_VIEWS = [
  ['top', '上帝視角'],
  ['baseline', '我方底線'],
  ['side', '側面'],
  ['coach', '教練視角'],
] as const;

const SYSTEM_LABELS: Record<string, string> = {
  perimeter: '邊線防守',
  rotation: '輪轉防守',
};

export function ControlPanel() {
  const {
    system, setSystem,
    middleBlockMode, setMiddleBlockMode,
    netHeight, setNetHeight,
    labelMode, setLabelMode,
    cameraView, setCameraView,
    fanAngleOverride, setFanAngleOverride,
    scenarios, saveCurrentAsScenario, removeScenario, loadScenario,
    importScenariosFromJSON,
    resetAll,
    defenseResult,
  } = useTacticsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function showNotice(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  }

  // --- 情境儲存 ---
  function handleSaveScenario() {
    const name = window.prompt('請輸入情境名稱：');
    if (!name || !name.trim()) return;
    saveCurrentAsScenario(name.trim());
    showNotice(`已儲存情境「${name.trim()}」`);
  }

  // --- 匯出 JSON ---
  function handleExport() {
    const json = JSON.stringify(scenarios, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `排球戰術情境-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice(`已匯出 ${scenarios.length} 筆情境`);
  }

  // --- 匯入 JSON ---
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importScenariosFromJSON(String(reader.result));
      if (result.ok) {
        showNotice(`匯入成功：共 ${result.count} 筆情境`);
      } else {
        showNotice(`匯入失敗：${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 允許重複選同一檔案
  }

  // --- 重置 ---
  function handleReset() {
    resetAll();
    showNotice('已重置為預設狀態（已存情境保留）');
  }

  const fanIsAuto = fanAngleOverride === null;
  const currentFanAngle = defenseResult?.attackFan.angleDeg ?? 90;

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>防守設定</h2>

      {notice && <div style={styles.notice}>{notice}</div>}

      {/* 1. 防守體系 */}
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

      {/* 2. 3號位快攻攔網 */}
      <section style={styles.section}>
        <label style={styles.label}>3號位快攻攔網</label>
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

      {/* 3. 快速視角 */}
      <section style={styles.section}>
        <label style={styles.label}>快速視角</label>
        <div style={styles.btnGroup}>
          {CAMERA_VIEWS.map(([view, label]) => (
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

      {/* 4. 網高 */}
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

      {/* 5. 球員標籤 */}
      <section style={styles.section}>
        <label style={styles.label}>球員標示</label>
        <div style={styles.btnGroup}>
          <button
            style={labelMode === 'number' ? styles.btnActive : styles.btn}
            onClick={() => setLabelMode('number')}
          >
            位置編號 1–6
          </button>
          <button
            style={labelMode === 'role' ? styles.btnActive : styles.btn}
            onClick={() => setLabelMode('role')}
          >
            角色名稱
          </button>
        </div>
      </section>

      {/* 6. 攻擊扇形角度 */}
      <section style={styles.section}>
        <label style={styles.label}>攻擊扇形角度</label>
        <div style={styles.btnGroup}>
          <button
            style={fanIsAuto ? styles.btnActive : styles.btn}
            onClick={() => setFanAngleOverride(null)}
          >
            自動
          </button>
          <button
            style={!fanIsAuto ? styles.btnActive : styles.btn}
            onClick={() => setFanAngleOverride(Math.round(currentFanAngle))}
          >
            手動
          </button>
        </div>
        {!fanIsAuto && (
          <div style={styles.sliderRow}>
            <input
              type="range"
              min={40}
              max={120}
              step={1}
              value={fanAngleOverride ?? 90}
              onChange={e => setFanAngleOverride(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{fanAngleOverride}°</span>
          </div>
        )}
        {fanIsAuto && (
          <p style={styles.info}>目前自動角度：{currentFanAngle.toFixed(1)}°</p>
        )}
      </section>

      {/* 7. 佔位微調 + 儲存為情境 */}
      <section style={styles.section}>
        <label style={styles.label}>佔位微調</label>
        <p style={styles.hint}>可直接拖曳我方球員微調佔位</p>
        <button style={styles.btnSave} onClick={handleSaveScenario}>
          儲存為情境
        </button>
      </section>

      {/* 8. 情境清單 */}
      <section style={styles.section}>
        <label style={styles.label}>已儲存情境（{scenarios.length}）</label>
        {scenarios.length === 0 && <p style={styles.hint}>尚無儲存的情境</p>}
        {scenarios.map(s => (
          <div key={s.id} style={styles.scenarioRow}>
            <div style={styles.scenarioInfo}>
              <span style={styles.scenarioName}>{s.name}</span>
              <span style={styles.scenarioSystem}>{SYSTEM_LABELS[s.system] ?? s.system}</span>
            </div>
            <div style={styles.scenarioBtns}>
              <button style={styles.btnSmall} onClick={() => loadScenario(s.id)}>
                載入
              </button>
              <button
                style={styles.btnSmallDanger}
                onClick={() => {
                  if (window.confirm(`確定刪除情境「${s.name}」？`)) {
                    removeScenario(s.id);
                    showNotice(`已刪除情境「${s.name}」`);
                  }
                }}
              >
                刪除
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* 9. 匯出 / 匯入 */}
      <section style={styles.section}>
        <label style={styles.label}>情境資料</label>
        <div style={styles.btnGroup}>
          <button style={styles.btn} onClick={handleExport}>
            匯出 JSON
          </button>
          <button style={styles.btn} onClick={() => fileInputRef.current?.click()}>
            匯入 JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      </section>

      {/* 10. 重置 */}
      <section style={styles.section}>
        <button style={styles.btnReset} onClick={handleReset}>
          重置回預設狀態
        </button>
      </section>

      {/* 防守結果摘要 */}
      {defenseResult && (
        <section style={styles.section}>
          <label style={styles.label}>攔網球員</label>
          <p style={styles.info}>
            {defenseResult.players
              .filter(p => p.isBlocking)
              .map(p => (labelMode === 'role' ? ROLE_LABELS[p.role] ?? p.role : `${p.id}號位`))
              .join('、') || '無'}
          </p>
        </section>
      )}
    </div>
  );
}

// --- 樣式（觸控友善：按鈕高度 ≥44px、大字體、深色投影主題）---

const baseBtn: React.CSSProperties = {
  minHeight: '44px',
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px solid #3949ab',
  background: '#1a237e',
  color: '#c5cae9',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  touchAction: 'manipulation',
};

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
    height: '100%',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 700,
    marginBottom: '8px',
    marginTop: 0,
    color: '#90caf9',
  },
  notice: {
    padding: '10px 12px',
    marginBottom: '10px',
    borderRadius: '8px',
    background: '#1b5e20',
    border: '1px solid #43A047',
    color: '#c8e6c9',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  section: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '0.95rem',
    color: '#90caf9',
    marginBottom: '8px',
    fontWeight: 700,
  },
  btnGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '8px',
  },
  btn: baseBtn,
  btnActive: {
    ...baseBtn,
    border: '1px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    fontWeight: 700,
  },
  btnDisabled: {
    ...baseBtn,
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  btnSave: {
    ...baseBtn,
    width: '100%',
    background: '#2e7d32',
    border: '1px solid #66bb6a',
    color: '#ffffff',
    fontWeight: 700,
    marginTop: '8px',
  },
  btnReset: {
    ...baseBtn,
    width: '100%',
    background: '#4e342e',
    border: '1px solid #ff8a65',
    color: '#ffccbc',
    fontWeight: 700,
  },
  btnSmall: {
    ...baseBtn,
    minHeight: '44px',
    padding: '8px 14px',
    fontSize: '0.95rem',
  },
  btnSmallDanger: {
    ...baseBtn,
    minHeight: '44px',
    padding: '8px 14px',
    fontSize: '0.95rem',
    background: '#7f1d1d',
    border: '1px solid #ef5350',
    color: '#ffcdd2',
  },
  btnSmallDisabled: {
    ...baseBtn,
    minHeight: '44px',
    padding: '8px 14px',
    fontSize: '0.95rem',
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '44px',
  },
  slider: {
    flex: 1,
    height: '44px',
    accentColor: '#1565C0',
    cursor: 'pointer',
  },
  sliderValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#FDD835',
    minWidth: '48px',
    textAlign: 'right',
  },
  info: {
    fontSize: '1rem',
    color: '#fff',
    margin: '2px 0 0 0',
  },
  hint: {
    fontSize: '0.9rem',
    color: '#9fa8da',
    margin: '6px 0',
    lineHeight: 1.5,
  },
  attackerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    width: '100%',
    minHeight: '44px',
  },
  attackerName: {
    fontSize: '1rem',
    color: '#ef9a9a',
    fontWeight: 600,
  },
  attackerActive: {
    fontSize: '1rem',
    color: '#ff8a80',
    fontWeight: 800,
  },
  scenarioRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #1a237e',
    minHeight: '44px',
  },
  scenarioInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  scenarioName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  scenarioSystem: {
    fontSize: '0.82rem',
    color: '#90caf9',
  },
  scenarioBtns: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
};
