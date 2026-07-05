import type { Vec2 } from '../types';

// ============================================================
// setplay.ts — 舉球員送球參數（配球溝通）核心純函式
//
// 目的：教練跟不同攻擊手溝通「這球怎麼配」——選攻擊手角色、選球種、
//   調節奏與參數，用 3D 看球飛越網的位置與落點、用 2D 側視看高度弧度。
//
// 座標系統（同其他分頁）：
//   網子 x=0、我方底線 x=9（x 大＝較後排、離網遠）
//   z=0 左邊線、z=9 右邊線；Y 向上（高度）；單位公尺。
//   （呈現層另做水平鏡像 worldZ=9−z，本檔一律用邏輯座標。）
//
// 舉球員設球點（origin）：邏輯約 (x=0.8, z=6.0)，出手高度 ~2.2m
//   （前排偏右的舉球定位，2 號位側）。
// ============================================================

// ------------------------------------------------------------
// 型別
// ------------------------------------------------------------

/** 節奏：負節奏 / 第一 / 第二 / 第三節奏（越前面越快、峰值越低） */
export type Tempo = 'neg' | 't1' | 't2' | 't3';

/** 攻擊手角色：主攻 / 攔中 / 輔舉（副攻） / 後排攻擊 */
export type AttackerRole = 'OH' | 'MB' | 'OP' | 'BACK';

export interface SetPlay {
  id: string;
  name: string;
  code: string; // 代號：A快 / B快 / C快 / 背飛 / 高球 / 拉開 / pipe / 後二 / 二次…
  role: AttackerRole;
  contact: Vec2; // 攻擊手擊球的地面落點（邏輯座標）
  peakAboveNet: number; // 球最高點離網頂多高（m）
  offNet: number; // 擊球點離網距離（m）（影響 contact.x）
  tempo: Tempo;
  speed: number; // 球飛行速度 / 節奏參數（用於動畫滯空，m/s 概念）
}

/** 舉球員設球原點（3D） */
export interface Origin3D {
  x: number;
  y: number;
  z: number;
}

/** 預設舉球員設球原點：前排偏右、出手高度 2.2m */
export const DEFAULT_ORIGIN: Origin3D = { x: 0.8, y: 2.2, z: 6.0 };

/** 標準網高（青年）2.30m */
export const NET_HEIGHT = 2.3;

export interface TrajectoryPoint3D {
  x: number;
  y: number;
  z: number;
}

/** 側視圖點：d=沿地面水平距離、h=高度 */
export interface TrajectoryPoint2D {
  d: number;
  h: number;
}

export interface Trajectory {
  points3D: TrajectoryPoint3D[];
  points2D: TrajectoryPoint2D[];
  flightTime: number; // 秒
  overNetClearance: number; // 球在 x=0 網面處的高度 − 網高（>0 表示過網）
  contactHeight: number; // 攻擊手擊球高度（m）
  peakHeight: number; // 球最高點絕對高度（m）
  horizontalDistance: number; // 原點到擊球點的地面水平距離（m）
}

// ------------------------------------------------------------
// 節奏 / 角色 標籤
// ------------------------------------------------------------

const TEMPO_LABELS: Record<Tempo, string> = {
  neg: '負節奏',
  t1: '第一節奏',
  t2: '第二節奏',
  t3: '第三節奏',
};

const ROLE_LABELS_SET: Record<AttackerRole, string> = {
  OH: '主攻',
  MB: '攔中',
  OP: '輔舉',
  BACK: '後排攻擊',
};

export function tempoLabel(t: Tempo): string {
  return TEMPO_LABELS[t];
}

export function roleLabel(r: AttackerRole): string {
  return ROLE_LABELS_SET[r];
}

export const TEMPO_ORDER: Tempo[] = ['neg', 't1', 't2', 't3'];
export const ROLE_ORDER: AttackerRole[] = ['OH', 'MB', 'OP', 'BACK'];

/**
 * 各節奏的典型 peak / speed 預設（供切換節奏時套用）。
 * 越前面的節奏：峰值越低（越平）、球速越快（滯空越短）。
 * neg < t1 < t2 < t3 於「峰值」與「滯空」單調遞增。
 */
export function tempoDefaults(t: Tempo): { peakAboveNet: number; speed: number } {
  switch (t) {
    case 'neg':
      return { peakAboveNet: 0.15, speed: 13 };
    case 't1':
      return { peakAboveNet: 0.35, speed: 11 };
    case 't2':
      return { peakAboveNet: 0.9, speed: 8.5 };
    case 't3':
      return { peakAboveNet: 2.0, speed: 6 };
  }
}

/** 依角色 / 節奏給典型擊球高度（m）（國中值）。 */
export function typicalContactHeight(role: AttackerRole, tempo: Tempo): number {
  // 攔中快球通常擊球點高、後排攻擊起跳點在網後略低。
  const base: Record<AttackerRole, number> = {
    OH: 2.7,
    MB: 2.75,
    OP: 2.7,
    BACK: 2.55,
  };
  // 慢節奏（高球）攻擊手有充分助跑起跳，擊球略高。
  const tempoAdj: Record<Tempo, number> = {
    neg: -0.05,
    t1: 0,
    t2: 0.05,
    t3: 0.1,
  };
  return Math.round((base[role] + tempoAdj[tempo]) * 100) / 100;
}

// ------------------------------------------------------------
// 軌跡計算
// ------------------------------------------------------------

const SAMPLES = 40;

/**
 * 在「原點 → 擊球點」的鉛直平面內建幾何拋物線。
 * 頂點高度 = netHeight + peakAboveNet（並確保頂點不低於兩端點）。
 *
 * 作法：以水平距離 d ∈ [0, D] 為參數，套 y(d) = a·d² + b·d + c，
 * 讓 y(0)=originY、y(D)=contactHeight、且最高點 = peakHeight。
 * 三點（起點、終點、頂點）定二次曲線。
 */
export function computeTrajectory(
  origin: Origin3D,
  contactGround: Vec2,
  contactHeight: number,
  peakAboveNet: number,
  netHeight: number = NET_HEIGHT,
  speed: number = 8,
): Trajectory {
  const dx = contactGround.x - origin.x;
  const dz = contactGround.z - origin.z;
  const D = Math.hypot(dx, dz) || 1e-6; // 水平總距離（避免除零）

  const y0 = origin.y; // 起點高度
  const y1 = contactHeight; // 終點高度
  const peakHeight = netHeight + peakAboveNet; // 目標最高點絕對高度

  // 頂點必須高於兩端點，否則拋物線退化。給一點裕度。
  const safePeak = Math.max(peakHeight, Math.max(y0, y1) + 0.1);

  // 求通過 (0,y0)、(D,y1) 且最高點 = safePeak 的向下開口拋物線。
  // 令 y(d) = safePeak - a·(d - dp)²，a>0，頂點在 d=dp。
  // 由兩端點：
  //   safePeak - a(0-dp)²  = y0  → a·dp²        = safePeak - y0
  //   safePeak - a(D-dp)²  = y1  → a·(D-dp)²    = safePeak - y1
  // 令 P0=safePeak-y0、P1=safePeak-y1（皆>0）。
  //   dp² / (D-dp)² = P0/P1 → dp/(D-dp) = sqrt(P0/P1) = k
  //   dp = k·D/(1+k)
  const P0 = safePeak - y0;
  const P1 = safePeak - y1;
  const k = Math.sqrt(P0 / P1);
  const dp = (k * D) / (1 + k);
  const a = P0 / (dp * dp || 1e-6);

  const yOf = (d: number) => safePeak - a * (d - dp) * (d - dp);

  const points3D: TrajectoryPoint3D[] = [];
  const points2D: TrajectoryPoint2D[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const d = t * D;
    const x = origin.x + dx * t;
    const z = origin.z + dz * t;
    const y = yOf(d);
    points3D.push({ x, y, z });
    points2D.push({ d, h: y });
  }

  // 過網餘裕：這球在網邊有沒有高過網頂、讓攻擊手能在網上把球打過去。
  //   若弧線實際跨越網面(x=0，t∈[0,1])，取該處高度 − 網高；
  //   否則（舉球在我方半場內飛，不跨 x=0）取弧線頂點高度 − 網高
  //   （＝這條弧的最高margin，代表球升得夠不夠高、攻擊手能否在網上擊球）。
  let overNetClearance = safePeak - netHeight;
  if (Math.abs(dx) > 1e-6) {
    const tNet = -origin.x / dx; // x(t)=0 的參數
    if (tNet >= 0 && tNet <= 1) {
      const dNet = tNet * D;
      overNetClearance = yOf(dNet) - netHeight;
    }
  }

  // 滯空時間：以水平速度估。speed 視為球沿弧線的水平速度分量（m/s）。
  const flightTime = D / Math.max(speed, 0.5);

  return {
    points3D,
    points2D,
    flightTime,
    overNetClearance,
    contactHeight,
    peakHeight: safePeak,
    horizontalDistance: D,
  };
}

// ------------------------------------------------------------
// 預設球種庫
// ------------------------------------------------------------

let seq = 0;
function mk(
  code: string,
  name: string,
  role: AttackerRole,
  contact: Vec2,
  peakAboveNet: number,
  offNet: number,
  tempo: Tempo,
  speed: number,
): SetPlay {
  return {
    id: `sp_default_${code}_${seq++}`,
    name,
    code,
    role,
    contact,
    peakAboveNet,
    offNet,
    tempo,
    speed,
  };
}

/**
 * 預設球種庫（邏輯座標）。教練會再微調。
 * contact.z：2 號位側 z≈7、3 號位 z≈4.5、4 號位側 z≈2。
 */
export const DEFAULT_PLAYS: SetPlay[] = [
  mk('高球4', '主攻高球（4號位）', 'OH', { x: 0.6, z: 2.0 }, 2.0, 0.4, 't3', 6),
  mk('高球2', '主攻高球（2號位）', 'OH', { x: 0.6, z: 7.5 }, 2.0, 0.4, 't3', 6),
  mk('拉開', '平拉開（射出）', 'OH', { x: 0.6, z: 1.5 }, 0.5, 0.4, 't2', 9.5),
  mk('A快', 'A快（近體快）', 'MB', { x: 0.5, z: 5.2 }, 0.3, 0.3, 't1', 11),
  mk('B快', 'B快（短平快）', 'MB', { x: 0.5, z: 3.5 }, 0.4, 0.3, 't2', 10),
  mk('C快', 'C快（背快 / 近體背）', 'MB', { x: 0.5, z: 7.2 }, 0.35, 0.3, 't1', 11),
  mk('背飛', 'D快（背飛）', 'OP', { x: 0.6, z: 8.2 }, 0.6, 0.4, 't2', 9),
  mk('pipe', '後排 pipe（中央）', 'BACK', { x: 4.0, z: 4.5 }, 1.2, 3.4, 't2', 8),
  mk('後二', '後排強攻（後二）', 'BACK', { x: 4.0, z: 7.0 }, 1.3, 3.4, 't2', 8),
  mk('二次', '二次球', 'OP', { x: 0.6, z: 6.5 }, 0.8, 0.4, 't2', 7.5),
];

/** 依代號取得預設球種（深拷貝，避免外部變異 DEFAULT_PLAYS） */
export function findPreset(code: string): SetPlay | undefined {
  const p = DEFAULT_PLAYS.find(x => x.code === code);
  return p ? clonePlay(p) : undefined;
}

/** 深拷貝一筆 SetPlay（含 contact） */
export function clonePlay(p: SetPlay): SetPlay {
  return { ...p, contact: { ...p.contact } };
}

/** 預設起始球種（主攻高球 4 號位） */
export function defaultPlay(): SetPlay {
  return clonePlay(DEFAULT_PLAYS[0]);
}

/**
 * 由當前 SetPlay 計算軌跡。origin 可覆蓋（預設 DEFAULT_ORIGIN）。
 * contact.x 由 offNet 決定（擊球點離網距離）；保留 play.contact.x 作後排深度基準：
 *   後排攻擊（BACK）用 contact.x 本身（3m 線後）；前排攻擊用 offNet 當離網距離。
 */
export function trajectoryFor(
  play: SetPlay,
  origin: Origin3D = DEFAULT_ORIGIN,
  netHeight: number = NET_HEIGHT,
): Trajectory {
  const contactX = play.role === 'BACK' ? play.contact.x : play.offNet;
  const contactGround: Vec2 = { x: contactX, z: play.contact.z };
  const ch = typicalContactHeight(play.role, play.tempo);
  return computeTrajectory(origin, contactGround, ch, play.peakAboveNet, netHeight, play.speed);
}
