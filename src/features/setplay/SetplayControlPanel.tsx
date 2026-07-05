import { useSetplayStore } from '../../store/useSetplayStore';
import {
  DEFAULT_PLAYS,
  roleLabel,
  tempoLabel,
  ROLE_ORDER,
  TEMPO_ORDER,
} from '../../logic/setplay';
import type { AttackerRole, Tempo } from '../../logic/setplay';
import type { CameraView } from '../../types';
import { SetplayPresetBar } from './SetplayPresetBar';
import { SideProfile } from './SideProfile';

// ============================================================
// SetplayControlPanel — 功能三控制面板（全繁中大字，≥44px 觸控友善）
//   攻擊手角色 / 球種預設 / 節奏 / 參數滑桿 / 讀數 / 播放 / 戰術儲存 /
//   標籤 / 快速視角。
// ============================================================

const CAMERA_VIEWS: { view: CameraView; label: string }[] = [
  { view: 'top', label: '上帝' },
  { view: 'baseline', label: '底線' },
  { view: 'side', label: '側面' },
  { view: 'coach', label: '教練' },
];

/** 各球種按鈕的小字說明（誰打、第幾節奏） */
const PLAY_HINT: Record<string, string> = {
  高球4: '主攻·4號位·第三節奏',
  高球2: '主攻·2號位·第三節奏',
  拉開: '主攻·平拉開·第二節奏',
  A快: '攔中·貼網快·第一節奏',
  B快: '攔中·短平快·第二節奏',
  C快: '攔中·背快·第一節奏',
  背飛: '輔舉·背後拉開·第二節奏',
  pipe: '後排·中央·第二節奏',
  後二: '後排·後二·第二節奏',
  二次: '輔舉·近舉小弧·第二節奏',
};

export function SetplayControlPanel() {
  const current = useSetplayStore(s => s.current);
  const role = useSetplayStore(s => s.role);
  const trajectory = useSetplayStore(s => s.trajectory);
  const playing = useSetplayStore(s => s.playing);
  const labelMode = useSetplayStore(s => s.labelMode);
  const cameraView = useSetplayStore(s => s.cameraView);

  const selectPreset = useSetplayStore(s => s.selectPreset);
  const setTempo = useSetplayStore(s => s.setTempo);
  const setParam = useSetplayStore(s => s.setParam);
  const setRole = useSetplayStore(s => s.setRole);
  const togglePlay = useSetplayStore(s => s.togglePlay);
  const setLabelMode = useSetplayStore(s => s.setLabelMode);
  const setCameraView = useSetplayStore(s => s.setCameraView);
  const reset = useSetplayStore(s => s.reset);

  const isBack = role === 'BACK';
  const clearOk = trajectory.overNetClearance > 0;

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>舉球送球參數</h2>
      <div style={styles.tagline}>跟攻擊手溝通這球怎麼配</div>

      {/* 側視圖 */}
      <section style={styles.section}>
        <SideProfile />
      </section>

      {/* 攻擊手角色 */}
      <section style={styles.section}>
        <div style={styles.label}>攻擊手角色</div>
        <div style={styles.grid4}>
          {ROLE_ORDER.map((r: AttackerRole) => (
            <button
              key={r}
              style={r === role ? styles.btnActive : styles.btn}
              onClick={() => setRole(r)}
            >
              {roleLabel(r)}
            </button>
          ))}
        </div>
      </section>

      {/* 球種預設 */}
      <section style={styles.section}>
        <div style={styles.label}>球種預設（點了套用配球）</div>
        <div style={styles.playGrid}>
          {DEFAULT_PLAYS.map(p => (
            <button
              key={p.code}
              style={p.code === current.code ? styles.playBtnActive : styles.playBtn}
              onClick={() => selectPreset(p.code)}
              title={PLAY_HINT[p.code]}
            >
              <span style={styles.playCode}>{p.code}</span>
              <span style={styles.playHint}>{PLAY_HINT[p.code]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 節奏 */}
      <section style={styles.section}>
        <div style={styles.label}>節奏（套用典型峰值 / 速度）</div>
        <div style={styles.grid4}>
          {TEMPO_ORDER.map((t: Tempo) => (
            <button
              key={t}
              style={t === current.tempo ? styles.btnActive : styles.btn}
              onClick={() => setTempo(t)}
            >
              {tempoLabel(t)}
            </button>
          ))}
        </div>
      </section>

      {/* 參數滑桿 */}
      <section style={styles.section}>
        <div style={styles.label}>微調參數</div>

        <SliderRow
          label="過網高度"
          value={current.peakAboveNet}
          min={0}
          max={2.5}
          step={0.05}
          unit="m"
          onChange={v => setParam('peakAboveNet', v)}
        />
        {!isBack && (
          <SliderRow
            label="離網距離"
            value={current.offNet}
            min={0}
            max={1.5}
            step={0.05}
            unit="m"
            onChange={v => setParam('offNet', v)}
          />
        )}
        <SliderRow
          label="沿網落點(z)"
          value={current.contact.z}
          min={0.5}
          max={8.5}
          step={0.1}
          unit=""
          onChange={v => setParam('contactZ', v)}
          hint="0=左邊線(4號位側)　9=右邊線(2號位側)"
        />
        <SliderRow
          label="節奏速度"
          value={current.speed}
          min={4}
          max={14}
          step={0.5}
          unit="m/s"
          onChange={v => setParam('speed', v)}
        />
      </section>

      {/* 讀數 */}
      <section style={styles.section}>
        <div style={styles.label}>讀數</div>
        <div style={styles.readGrid}>
          <ReadCell k="球速" v={`${current.speed.toFixed(1)} m/s`} />
          <ReadCell k="滯空" v={`${trajectory.flightTime.toFixed(2)} 秒`} />
          <ReadCell k="最高點" v={`${trajectory.peakHeight.toFixed(2)} m`} />
          <ReadCell k="擊球高" v={`${trajectory.contactHeight.toFixed(2)} m`} />
          <ReadCell
            k="過網餘裕"
            v={`${trajectory.overNetClearance.toFixed(2)} m`}
            danger={!clearOk}
          />
          <ReadCell k="節奏" v={tempoLabel(current.tempo)} />
        </div>
        {!clearOk && <div style={styles.warn}>⚠ 這球過不了網（餘裕≤0），請調高過網高度</div>}
      </section>

      {/* 播放控制 */}
      <section style={styles.section}>
        <div style={styles.rowGap}>
          <button
            style={playing ? styles.playPauseActive : styles.playPause}
            onClick={togglePlay}
          >
            {playing ? '⏸ 暫停' : '▶ 播放飛球'}
          </button>
          <button style={styles.resetBtn} onClick={reset}>重置</button>
        </div>
      </section>

      {/* 標籤 + 視角 */}
      <section style={styles.section}>
        <div style={styles.label}>標籤顯示</div>
        <div style={styles.toggleRow}>
          <button
            style={labelMode === 'role' ? styles.btnActive : styles.btn}
            onClick={() => setLabelMode('role')}
          >
            顯示角色
          </button>
          <button
            style={labelMode === 'number' ? styles.btnActive : styles.btn}
            onClick={() => setLabelMode('number')}
          >
            隱藏
          </button>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.label}>快速視角</div>
        <div style={styles.grid4}>
          {CAMERA_VIEWS.map(v => (
            <button
              key={v.view}
              style={v.view === cameraView ? styles.btnActive : styles.btn}
              onClick={() => setCameraView(v.view)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </section>

      {/* 戰術儲存 */}
      <section style={styles.section}>
        <SetplayPresetBar />
      </section>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div style={styles.sliderRow}>
      <div style={styles.sliderHead}>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderVal}>
          {value.toFixed(step < 0.1 ? 2 : 1)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={styles.slider}
      />
      {hint && <div style={styles.sliderHint}>{hint}</div>}
    </div>
  );
}

function ReadCell({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <div style={styles.readCell}>
      <div style={styles.readK}>{k}</div>
      <div style={{ ...styles.readV, color: danger ? '#ef9a9a' : '#e8eaf6' }}>{v}</div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  padding: '11px 4px',
  fontSize: '0.98rem',
  fontWeight: 700,
  fontFamily: 'inherit',
  borderRadius: '8px',
  cursor: 'pointer',
  touchAction: 'manipulation',
  minHeight: '44px',
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
    color: '#e8eaf6',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#90caf9',
    margin: 0,
  },
  tagline: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#ffb74d',
    marginTop: '-8px',
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
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  toggleRow: {
    display: 'flex',
    gap: '8px',
  },
  btn: {
    ...btnBase,
    border: '1px solid #3949ab',
    background: 'transparent',
    color: '#c5cae9',
  },
  btnActive: {
    ...btnBase,
    border: '2px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
  },
  playGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  playBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '9px 10px',
    borderRadius: '8px',
    border: '1px solid #3949ab',
    background: 'transparent',
    color: '#c5cae9',
    cursor: 'pointer',
    fontFamily: 'inherit',
    touchAction: 'manipulation',
    minHeight: '48px',
    textAlign: 'left',
  },
  playBtnActive: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '9px 10px',
    borderRadius: '8px',
    border: '2px solid #90caf9',
    background: '#1565C0',
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    touchAction: 'manipulation',
    minHeight: '48px',
    textAlign: 'left',
  },
  playCode: {
    fontSize: '1rem',
    fontWeight: 800,
  },
  playHint: {
    fontSize: '0.72rem',
    fontWeight: 600,
    opacity: 0.85,
  },
  sliderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sliderHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sliderLabel: {
    fontSize: '0.9rem',
    color: '#c5cae9',
    fontWeight: 600,
  },
  sliderVal: {
    fontSize: '0.95rem',
    color: '#90caf9',
    fontWeight: 800,
  },
  slider: {
    width: '100%',
    height: '28px',
    accentColor: '#1565C0',
    touchAction: 'manipulation',
    cursor: 'pointer',
  },
  sliderHint: {
    fontSize: '0.75rem',
    color: '#7986cb',
  },
  readGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '6px',
  },
  readCell: {
    background: '#152238',
    borderRadius: '8px',
    padding: '8px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  readK: {
    fontSize: '0.72rem',
    color: '#9fa8da',
    fontWeight: 600,
  },
  readV: {
    fontSize: '0.95rem',
    fontWeight: 800,
  },
  warn: {
    fontSize: '0.85rem',
    color: '#ef9a9a',
    fontWeight: 700,
  },
  rowGap: {
    display: 'flex',
    gap: '8px',
  },
  playPause: {
    flex: 2,
    padding: '13px',
    fontSize: '1.05rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #2e7d32',
    background: '#1b5e20',
    color: '#c8e6c9',
    cursor: 'pointer',
    touchAction: 'manipulation',
    minHeight: '48px',
  },
  playPauseActive: {
    flex: 2,
    padding: '13px',
    fontSize: '1.05rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '2px solid #ffb74d',
    background: '#e65100',
    color: '#fff3e0',
    cursor: 'pointer',
    touchAction: 'manipulation',
    minHeight: '48px',
  },
  resetBtn: {
    flex: 1,
    padding: '13px',
    fontSize: '1rem',
    fontWeight: 800,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid #b71c1c',
    background: '#2a1416',
    color: '#ef9a9a',
    cursor: 'pointer',
    touchAction: 'manipulation',
    minHeight: '48px',
  },
};
