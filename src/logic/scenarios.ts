import type { CustomScenario } from '../types';

const STORAGE_KEY = 'volleyball-tactics-scenarios';

// ============================================================
// 自訂情境 CRUD + localStorage 持久化
//   資料格式：固定 10 槽陣列 Array<CustomScenario | null>（長度 10）
//   相容遷移：舊格式為不定長 CustomScenario[]，載入時塞進前面的槽，
//             超過 10 筆截斷。
// ============================================================

/** 預設槽位數量 */
export const SLOT_COUNT = 10;

export type ScenarioSlots = (CustomScenario | null)[];

/** 產生一個全空的 10 槽陣列 */
export function emptySlots(): ScenarioSlots {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

/** 驗證一筆資料是否為合法的 CustomScenario */
function isValidScenario(item: unknown): item is CustomScenario {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.system === 'string' &&
    !!s.attackPos &&
    Array.isArray(s.players) &&
    Array.isArray(s.zones)
  );
}

/**
 * 把任意解析後的資料正規化為固定 10 槽陣列。
 *  - 新格式（長度可能剛好或不足 10 的陣列，含 null）：逐槽驗證，非法或空 → null，補足到 10 槽並截斷。
 *  - 舊格式（不定長 CustomScenario[] 無 null）：依序塞進前面的槽，超過 10 筆截斷。
 * 兩種情況都以「陣列中是否含 null」與長度來自動判斷，統一輸出長度 10。
 */
export function normalizeToSlots(parsed: unknown): ScenarioSlots {
  if (!Array.isArray(parsed)) return emptySlots();

  const hasNull = parsed.some(item => item === null);

  if (hasNull || parsed.length === SLOT_COUNT) {
    // 視為新格式：逐槽驗證，補足 / 截斷到 10 槽
    const slots = emptySlots();
    for (let i = 0; i < SLOT_COUNT; i++) {
      const item = parsed[i];
      slots[i] = isValidScenario(item) ? item : null;
    }
    return slots;
  }

  // 視為舊格式（不定長清單）：依序塞進前面的槽
  const slots = emptySlots();
  let idx = 0;
  for (const item of parsed) {
    if (idx >= SLOT_COUNT) break;
    if (isValidScenario(item)) {
      slots[idx] = item;
      idx++;
    }
  }
  return slots;
}

/** 從 localStorage 載入 10 槽情境（含舊格式相容遷移） */
export function loadScenarios(): ScenarioSlots {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySlots();
    return normalizeToSlots(JSON.parse(raw));
  } catch {
    return emptySlots();
  }
}

/** 儲存 10 槽情境到 localStorage（固定長度 10 的陣列，含 null） */
export function saveScenarios(slots: ScenarioSlots): void {
  try {
    // 保證寫出的一定是長度 10 的陣列
    const normalized = normalizeToSlots(slots);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    console.error('[scenarios] 無法儲存情境到 localStorage');
  }
}

/** 取出非空槽的情境陣列（供 computeDefense 內插使用） */
export function activeScenarios(slots: ScenarioSlots): CustomScenario[] {
  return slots.filter((s): s is CustomScenario => s !== null);
}

/** 找到第一個空槽的索引，全滿回傳 -1 */
export function firstEmptySlot(slots: ScenarioSlots): number {
  return slots.findIndex(s => s === null);
}

/** 將情境寫入指定槽（回傳新陣列，不變異原陣列） */
export function setSlot(
  slots: ScenarioSlots,
  index: number,
  scenario: CustomScenario | null,
): ScenarioSlots {
  const next = slots.slice();
  if (index >= 0 && index < SLOT_COUNT) next[index] = scenario;
  return next;
}

/** 匯出 10 槽情境為 JSON 字串 */
export function exportScenarios(slots?: ScenarioSlots): string {
  const src = slots ?? loadScenarios();
  return JSON.stringify(normalizeToSlots(src), null, 2);
}

/**
 * 從 JSON 字串匯入情境（相容舊格式與 10 槽格式），
 * 正規化為 10 槽後存回 localStorage，回傳 { ok, count, error, slots }。
 */
export function importScenarios(json: string): {
  ok: boolean;
  count: number;
  error?: string;
  slots?: ScenarioSlots;
} {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return { ok: false, count: 0, error: '格式錯誤：頂層必須是陣列' };
    }
    // 驗證每筆非 null 的情境有必要欄位
    for (const item of parsed) {
      if (item === null) continue;
      if (!isValidScenario(item)) {
        return { ok: false, count: 0, error: '情境資料格式不完整' };
      }
    }
    const slots = normalizeToSlots(parsed);
    saveScenarios(slots);
    return { ok: true, count: activeScenarios(slots).length, slots };
  } catch (e) {
    return { ok: false, count: 0, error: `JSON 解析失敗：${String(e)}` };
  }
}
