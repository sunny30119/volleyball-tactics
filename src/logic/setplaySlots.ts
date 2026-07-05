import type { SetPlay, AttackerRole, Tempo } from './setplay';

// ============================================================
// setplaySlots.ts — 舉球送球參數（戰術）10 槽儲存 + localStorage 持久化
//   資料格式：固定 10 槽陣列 Array<SetplaySlot | null>（長度 10）
//   key：volleyball-setplay-slots（與其他分頁不同，避免衝突）。
//   每槽存一個命名戰術：完整 SetPlay 參數 + 焦點攻擊手角色。
// ============================================================

const STORAGE_KEY = 'volleyball-setplay-slots';

/** 預設槽位數量 */
export const SLOT_COUNT = 10;

export interface SetplaySlot {
  id: string;
  name: string;
  role: AttackerRole; // 焦點攻擊手角色
  play: SetPlay; // 完整配球參數
  createdAt: number;
}

export type SetplaySlots = (SetplaySlot | null)[];

/** 產生一個全空的 10 槽陣列 */
export function emptySlots(): SetplaySlots {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

const VALID_ROLES: AttackerRole[] = ['OH', 'MB', 'OP', 'BACK'];
const VALID_TEMPOS: Tempo[] = ['neg', 't1', 't2', 't3'];

function isVec2(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.x === 'number' && typeof o.z === 'number';
}

function isValidPlay(p: unknown): p is SetPlay {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.code === 'string' &&
    typeof o.role === 'string' &&
    VALID_ROLES.includes(o.role as AttackerRole) &&
    isVec2(o.contact) &&
    typeof o.peakAboveNet === 'number' &&
    typeof o.offNet === 'number' &&
    typeof o.tempo === 'string' &&
    VALID_TEMPOS.includes(o.tempo as Tempo) &&
    typeof o.speed === 'number'
  );
}

/** 驗證一筆資料是否為合法的 SetplaySlot */
function isValidSlot(item: unknown): item is SetplaySlot {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.role === 'string' &&
    VALID_ROLES.includes(s.role as AttackerRole) &&
    isValidPlay(s.play) &&
    typeof s.createdAt === 'number'
  );
}

/**
 * 把任意解析後的資料正規化為固定 10 槽陣列（截斷 / 補足到 10 槽）。
 * 相容舊格式（不定長清單，無 null）：依序塞進前面的槽。
 */
export function normalizeToSlots(parsed: unknown): SetplaySlots {
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

/** 從 localStorage 載入 10 槽戰術 */
export function loadSlots(): SetplaySlots {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySlots();
    return normalizeToSlots(JSON.parse(raw));
  } catch {
    return emptySlots();
  }
}

/** 儲存 10 槽戰術到 localStorage（固定長度 10 的陣列，含 null） */
export function persistSlots(slots: SetplaySlots): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeToSlots(slots)));
  } catch {
    console.error('[setplaySlots] 無法儲存戰術到 localStorage');
  }
}

/** 將戰術寫入指定槽（回傳新陣列，不變異原陣列） */
export function setSlot(
  slots: SetplaySlots,
  index: number,
  slot: SetplaySlot | null,
): SetplaySlots {
  const next = slots.slice();
  if (index >= 0 && index < SLOT_COUNT) next[index] = slot;
  return next;
}

/** 非空槽數量 */
export function filledCount(slots: SetplaySlots): number {
  return slots.filter(s => s !== null).length;
}

/**
 * 建一筆 SetplaySlot。name 留空時用預設「戰術 N」。
 */
export function makeSlot(
  index: number,
  role: AttackerRole,
  play: SetPlay,
  name?: string,
): SetplaySlot {
  const trimmed = (name ?? '').trim();
  return {
    id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed || `戰術 ${index + 1}`,
    role,
    play: { ...play, contact: { ...play.contact } },
    createdAt: Date.now(),
  };
}

/** 匯出 10 槽戰術為 JSON 字串 */
export function exportSlots(slots?: SetplaySlots): string {
  const src = slots ?? loadSlots();
  return JSON.stringify(normalizeToSlots(src), null, 2);
}

/**
 * 從 JSON 字串匯入戰術（相容舊格式與 10 槽格式），
 * 正規化為 10 槽後存回 localStorage，回傳 { ok, count, error, slots }。
 */
export function importSlots(json: string): {
  ok: boolean;
  count: number;
  error?: string;
  slots?: SetplaySlots;
} {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return { ok: false, count: 0, error: '格式錯誤：頂層必須是陣列' };
    }
    for (const item of parsed) {
      if (item === null) continue;
      if (!isValidSlot(item)) {
        return { ok: false, count: 0, error: '戰術資料格式不完整' };
      }
    }
    const slots = normalizeToSlots(parsed);
    persistSlots(slots);
    return { ok: true, count: filledCount(slots), slots };
  } catch (e) {
    return { ok: false, count: 0, error: `JSON 解析失敗：${String(e)}` };
  }
}
