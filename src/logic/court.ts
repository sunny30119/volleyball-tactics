import type { Vec2 } from '../types';

// ============================================================
// 場地常數
// 座標系統：場地 18m × 9m，網子在 x=0。
// 我方半場 x ∈ [0, 9]，對方半場 x ∈ [-9, 0]。
// z ∈ [0, 9]，z=0 是（從我方看）左邊線。
// 3D 中使用公尺為單位，Y 軸向上。
// ============================================================

export const COURT_LENGTH = 18;   // 公尺（全場）
export const COURT_WIDTH = 9;     // 公尺
export const HALF_LENGTH = 9;     // 我方半場長度
export const NET_X = 0;           // 網子位置（x 軸）

export const NET_HEIGHTS = {
  WOMEN: 2.24,
  YOUTH: 2.30,
  MEN: 2.43,
} as const;

// ============================================================
// 我方六號位預設站位座標（輪轉零位，未計防守移動）
// 號位：1=右後, 2=右前, 3=中前, 4=左前, 5=左後, 6=中後
// x 軸：靠近網子為較小值（接近 0），底線為 9
// z 軸：0 = 左邊線（從我方看），9 = 右邊線
// ============================================================
export const DEFAULT_POSITIONS: Record<number, Vec2> = {
  1: { x: 7.0, z: 7.0 }, // 右後
  2: { x: 1.5, z: 7.0 }, // 右前
  3: { x: 1.5, z: 4.5 }, // 中前
  4: { x: 1.5, z: 2.0 }, // 左前
  5: { x: 7.0, z: 2.0 }, // 左後
  6: { x: 7.0, z: 4.5 }, // 中後
};

// 號位中文標籤
export const POSITION_LABELS: Record<number, string> = {
  1: '1號位（右後）',
  2: '2號位（右前）',
  3: '3號位（中前）',
  4: '4號位（左前）',
  5: '5號位（左後）',
  6: '6號位（中後）',
};

// 角色中文標籤
export const ROLE_LABELS: Record<string, string> = {
  S:   '舉',
  OH1: '主攻1',
  OH2: '主攻2',
  MB1: '攔中1',
  MB2: '攔中2',
  OP:  '輔舉',
  L:   '自由',
};

// 責任區塊配色（六色高飽和半透明）
export const ZONE_COLORS = [
  '#1E88E5', // 藍
  '#00ACC1', // 青
  '#43A047', // 綠
  '#FDD835', // 黃
  '#8E24AA', // 紫
  '#FB8C00', // 橙
] as const;

// 配色規格
export const COLORS = {
  MY_PLAYER: '#1565C0',       // 我方球員深藍
  OPP_PLAYER: '#C62828',      // 對方球員紅
  ACTIVE_ATTACKER: '#FF1744', // 持球攻擊者亮紅
  BLOCK_SHADOW: 'rgba(55,55,55,0.45)', // 攔網影子深灰半透明
} as const;
