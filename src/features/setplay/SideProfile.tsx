import { useSetplayStore } from '../../store/useSetplayStore';
import { DEFAULT_ORIGIN, NET_HEIGHT } from '../../logic/setplay';

// ============================================================
// SideProfile — 2D 側視圖（SVG）
//   橫軸 = 沿地面水平距離（公尺，舉球點=0）
//   縱軸 = 高度（公尺）
//   畫：拋物線 points2D、網位置垂直線（標 2.30）、頂點、擊球點、格線。
//   字大清楚、繁中，投影可讀。
// ============================================================

const W = 460;
const H = 260;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 34;

export function SideProfile() {
  const trajectory = useSetplayStore(s => s.trajectory);

  const pts = trajectory.points2D;
  const dMax = Math.max(trajectory.horizontalDistance, 1);
  const hMax = Math.max(trajectory.peakHeight + 0.4, 3.2);

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const sx = (d: number) => PAD_L + (d / dMax) * plotW;
  const sy = (h: number) => PAD_T + plotH - (h / hMax) * plotH;

  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.d).toFixed(1)},${sy(p.h).toFixed(1)}`)
    .join(' ');

  // 網面在水平距離 = |origin.x|（原點 x → 擊球 x=0/near 網），
  // 球是往網 (x=0) 方向飛，所以網在距離 origin.x 處。
  const netDist = DEFAULT_ORIGIN.x;
  const netX = sx(netDist);

  // 頂點（最高點）
  let peakIdx = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].h > pts[peakIdx].h) peakIdx = i;
  const peak = pts[peakIdx];

  // 擊球點（終點）
  const contact = pts[pts.length - 1];

  // 高度格線（每 1m）
  const hLines: number[] = [];
  for (let h = 0; h <= hMax; h += 1) hLines.push(h);
  // 水平格線（每 1m）
  const dLines: number[] = [];
  for (let d = 0; d <= dMax; d += 1) dLines.push(d);

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>側視弧線（高度 × 距離）</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={styles.svg} role="img" aria-label="球飛行側視弧線">
        {/* 背景 */}
        <rect x={0} y={0} width={W} height={H} fill="#0d1b2a" rx={8} />

        {/* 格線 */}
        {hLines.map(h => (
          <g key={`h${h}`}>
            <line x1={PAD_L} y1={sy(h)} x2={W - PAD_R} y2={sy(h)} stroke="#1e2b45" strokeWidth={1} />
            <text x={PAD_L - 6} y={sy(h) + 4} fontSize={11} fill="#7986cb" textAnchor="end">
              {h}
            </text>
          </g>
        ))}
        {dLines.map(d => (
          <g key={`d${d}`}>
            <line x1={sx(d)} y1={PAD_T} x2={sx(d)} y2={PAD_T + plotH} stroke="#16223a" strokeWidth={1} />
            <text x={sx(d)} y={H - PAD_B + 16} fontSize={11} fill="#7986cb" textAnchor="middle">
              {d}
            </text>
          </g>
        ))}

        {/* 地面 */}
        <line x1={PAD_L} y1={sy(0)} x2={W - PAD_R} y2={sy(0)} stroke="#455a80" strokeWidth={2} />

        {/* 網（垂直線至 2.30） */}
        <line x1={netX} y1={sy(0)} x2={netX} y2={sy(NET_HEIGHT)} stroke="#eceff1" strokeWidth={3} />
        <text x={netX} y={sy(NET_HEIGHT) - 6} fontSize={12} fill="#eceff1" textAnchor="middle" fontWeight={700}>
          網 {NET_HEIGHT.toFixed(2)}
        </text>

        {/* 拋物線 */}
        <path d={path} fill="none" stroke="#FDD835" strokeWidth={3} />

        {/* 舉球點（起點） */}
        <circle cx={sx(0)} cy={sy(pts[0].h)} r={5} fill="#42A5F5" />
        <text x={sx(0) + 6} y={sy(pts[0].h) - 6} fontSize={11} fill="#90caf9" fontWeight={700}>
          舉球
        </text>

        {/* 頂點 */}
        <circle cx={sx(peak.d)} cy={sy(peak.h)} r={4} fill="#ff8a65" />
        <text x={sx(peak.d)} y={sy(peak.h) - 8} fontSize={11} fill="#ffab91" textAnchor="middle" fontWeight={700}>
          最高 {peak.h.toFixed(2)}m
        </text>

        {/* 擊球點 */}
        <circle cx={sx(contact.d)} cy={sy(contact.h)} r={5} fill="#66BB6A" />
        <text
          x={sx(contact.d) - 6}
          y={sy(contact.h) - 6}
          fontSize={11}
          fill="#a5d6a7"
          textAnchor="end"
          fontWeight={700}
        >
          擊球 {contact.h.toFixed(2)}m
        </text>

        {/* 軸標籤 */}
        <text x={PAD_L - 30} y={PAD_T + 4} fontSize={11} fill="#9fa8da" fontWeight={700}>
          高(m)
        </text>
        <text x={W - PAD_R} y={H - 4} fontSize={11} fill="#9fa8da" textAnchor="end" fontWeight={700}>
          水平距離(m)
        </text>
      </svg>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#0d1b2a',
    borderRadius: '10px',
    padding: '10px',
    border: '1px solid #1a237e',
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#90caf9',
    marginBottom: '6px',
  },
  svg: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
};
