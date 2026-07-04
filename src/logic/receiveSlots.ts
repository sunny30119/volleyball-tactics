import type { Vec2 } from '../types';
import type { Rotation, PositionNo } from './receive';

// ============================================================
// receiveSlots.ts — 接發球站位 10 槽儲存 + localStorage 持久化
//   資料格式：固定 10 槽陣列 Array<ReceiveSlot | null>（長度 10）
//   key 與功能一（volleyball-tactics-scenarios）不同，避免衝突。
// ============================================================

const STORAGE_KEY = 'volleyball-receive-slots';

/** 預設槽位數量 */
export const SLOT_COUNT = 10;

export interface ReceiveSlot {
  id: string;
  name: string;
  rotation: Rotation;
  /** 儲存當下六名球員的最終座標（formation 套用 override 後） */
  positions: Record<number, Vec2>;
  createdAt: number;
}

export type ReceiveSlots = (ReceiveSlot | null)[];

/** 產生一個全空的 10 槽陣列 */
export function emptySlots(): ReceiveSlots {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

function isVec2(v: unknown): v is Vec2 {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.x === 'number' && typeof o.z === 'number';
}

/** 驗證 positions 是否為合法的六人座標表 */
function isValidPositions(p: unknown): p is Record<number, Vec2> {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  // 至少含 1..6 六個號位的合法座標
  for (const k of [1, 2, 3, 4, 5, 6]) {
    if (!isVec2(o[String(k)])) return false;
  }
  return true;
}

/** 驗證一筆資料是否為合法的 ReceiveSlot */
function isValidSlot(item: unknown): item is ReceiveSlot {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.rotation === 'number' &&
    s.rotation >= 1 &&
    s.rotation <= 6 &&
    isValidPositions(s.positions) &&
    typeof s.createdAt === 'number'
  );
}

/**
 * 把任意解析後的資料正規化為固定 10 槽陣列（截斷 / 補足到 10 槽）。
 * 相容舊格式（不定長清單，無 null）：依序塞進前面的槽。
 */
export function normalizeToSlots(parsed: unknown): ReceiveSlots {
  if (!Array.isArray(parsed)) return emptySlots();

  const hasNull = parsed.some(item => item === null);

  if (hasNull || parsed.length === SLOT_COUNT) {
    const slots = emptySlots();
    for (let i = 0; i < SLOT_COUNT; i++) {
      slots[i] = isValidSlot(parsed[i]) ? parsed[i] : null;
    }
    return slots;
  }

  const slots = emptySlots();
  let idx = 0;
  for (const item of parsed) {
    if (idx >= SLOT_COUNT) break;
    if (isValidSlot(item)) {
      slots[idx] = item;
      idx++;
    }
  }
  return slots;
}

/** 從 localStorage 載入 10 槽站位 */
export function loadSlots(): ReceiveSlots {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySlots();
    return normalizeToSlots(JSON.parse(raw));
  } catch {
    return emptySlots();
  }
}

/** 儲存 10 槽站位到 localStorage（固定長度 10 的陣列，含 null） */
export function persistSlots(slots: ReceiveSlots): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeToSlots(slots)));
  } catch {
    console.error('[receiveSlots] 無法儲存站位到 localStorage');
  }
}

/** 將站位寫入指定槽（回傳新陣列，不變異原陣列） */
export function setSlot(
  slots: ReceiveSlots,
  index: number,
  slot: ReceiveSlot | null,
): ReceiveSlots {
  const next = slots.slice();
  if (index >= 0 && index < SLOT_COUNT) next[index] = slot;
  return next;
}

/** 非空槽數量 */
export function filledCount(slots: ReceiveSlots): number {
  return slots.filter(s => s !== null).length;
}

/**
 * 建一筆 ReceiveSlot。positions 應為當下六人最終座標。
 * name 留空時用預設「站位 N」。
 */
export function makeSlot(
  index: number,
  rotation: Rotation,
  positions: Record<PositionNo, Vec2>,
  name?: string,
): ReceiveSlot {
  const trimmed = (name ?? '').trim();
  return {
    id: `rs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed || `站位 ${index + 1}`,
    rotation,
    positions: { ...positions },
    createdAt: Date.now(),
  };
}

/** 匯出 10 槽站位為 JSON 字串 */
export function exportSlots(slots?: ReceiveSlots): string {
  const src = slots ?? loadSlots();
  return JSON.stringify(normalizeToSlots(src), null, 2);
}

/**
 * 從 JSON 字串匯入站位（相容舊格式與 10 槽格式），
 * 正規化為 10 槽後存回 localStorage，回傳 { ok, count, error, slots }。
 */
export function importSlots(json: string): {
  ok: boolean;
  count: number;
  error?: string;
  slots?: ReceiveSlots;
} {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return { ok: false, count: 0, error: '格式錯誤：頂層必須是陣列' };
    }
    for (const item of parsed) {
      if (item === null) continue;
      if (!isValidSlot(item)) {
        return { ok: false, count: 0, error: '站位資料格式不完整' };
      }
    }
    const slots = normalizeToSlots(parsed);
    persistSlots(slots);
    return { ok: true, count: filledCount(slots), slots };
  } catch (e) {
    return { ok: false, count: 0, error: `JSON 解析失敗：${String(e)}` };
  }
}
