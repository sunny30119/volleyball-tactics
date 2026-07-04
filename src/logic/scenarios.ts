import type { CustomScenario } from '../types';

const STORAGE_KEY = 'volleyball-tactics-scenarios';

// ============================================================
// 自訂情境的儲存 / 讀取 / 內插邏輯
// ============================================================

/** 從 localStorage 載入全部情境 */
export function loadScenarios(): CustomScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomScenario[];
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
export function exportScenariosJSON(scenarios: CustomScenario[]): string {
  return JSON.stringify(scenarios, null, 2);
}

/** 從 JSON 字串匯入情境（覆蓋全部） */
export function importScenariosJSON(json: string): CustomScenario[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error('格式錯誤');
    return parsed as CustomScenario[];
  } catch {
    throw new Error('JSON 格式不正確，無法匯入情境');
  }
}
