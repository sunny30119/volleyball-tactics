import type { CustomScenario } from '../types';

const STORAGE_KEY = 'volleyball-tactics-scenarios';

// ============================================================
// 自訂情境 CRUD + localStorage 持久化
// ============================================================

/** 從 localStorage 載入全部情境 */
export function loadScenarios(): CustomScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomScenario[];
  } catch {
    return [];
  }
}

/** 儲存情境清單到 localStorage */
export function saveScenarios(scenarios: CustomScenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    console.error('[scenarios] 無法儲存情境到 localStorage');
  }
}

/** 新增一筆情境（若 id 已存在則覆蓋） */
export function upsertScenario(
  scenarios: CustomScenario[],
  incoming: CustomScenario,
): CustomScenario[] {
  const idx = scenarios.findIndex(s => s.id === incoming.id);
  if (idx === -1) return [...scenarios, incoming];
  const next = [...scenarios];
  next[idx] = incoming;
  return next;
}

/** 刪除情境 */
export function deleteScenario(
  scenarios: CustomScenario[],
  id: string,
): CustomScenario[] {
  return scenarios.filter(s => s.id !== id);
}

/** 匯出情境為 JSON 字串 */
export function exportScenarios(): string {
  return JSON.stringify(loadScenarios(), null, 2);
}

/** 從 JSON 字串匯入情境，回傳 { ok, count, error } */
export function importScenarios(json: string): {
  ok: boolean;
  count: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return { ok: false, count: 0, error: '格式錯誤：頂層必須是陣列' };
    }
    // 驗證每筆情境有必要欄位
    for (const item of parsed) {
      if (
        typeof item.id !== 'string' ||
        typeof item.name !== 'string' ||
        typeof item.system !== 'string' ||
        !item.attackPos ||
        !Array.isArray(item.players) ||
        !Array.isArray(item.zones)
      ) {
        return { ok: false, count: 0, error: '情境資料格式不完整' };
      }
    }
    saveScenarios(parsed as CustomScenario[]);
    return { ok: true, count: parsed.length };
  } catch (e) {
    return { ok: false, count: 0, error: `JSON 解析失敗：${String(e)}` };
  }
}

// 保留相容舊介面的函式名稱（store 可能已使用）
export { loadScenarios as getSavedScenarios };
export function exportScenariosJSON(scenarios: CustomScenario[]): string {
  return JSON.stringify(scenarios, null, 2);
}
export function importScenariosJSON(json: string): CustomScenario[] {
  const result = importScenarios(json);
  if (!result.ok) throw new Error(result.error);
  return loadScenarios();
}
