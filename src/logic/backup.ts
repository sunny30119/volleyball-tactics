import {
  loadScenarios,
  normalizeToSlots as normalizeDefense,
  saveScenarios,
  activeScenarios,
  type ScenarioSlots,
} from './scenarios';
import {
  loadSlots,
  normalizeToSlots as normalizeReceive,
  persistSlots,
  filledCount,
  type ReceiveSlots,
} from './receiveSlots';
import {
  loadSlots as loadSetplaySlots,
  normalizeToSlots as normalizeSetplay,
  persistSlots as persistSetplaySlots,
  filledCount as setplayFilledCount,
  type SetplaySlots,
} from './setplaySlots';

// ============================================================
// backup.ts — 全域備份：把「防守 10 槽 + 接發 10 槽」打包成單一 JSON。
//   讓教練把調整好的所有站位存成一個檔，換時間或裝置再一次匯入還原。
//
//   localStorage keys（各自 tab 的 per-tab 匯出/匯入不受影響）：
//     防守：volleyball-tactics-scenarios
//     接發：volleyball-receive-slots
//     配球：volleyball-setplay-slots
// ============================================================

/** 全域備份檔的版本（未來格式變動時遞增） */
export const BACKUP_VERSION = 2;

export interface BackupPayload {
  version: number;
  exportedAt: string;         // ISO 時間字串
  defenseSlots: ScenarioSlots; // 長度 10（含 null）
  receiveSlots: ReceiveSlots;  // 長度 10（含 null）
  setplaySlots: SetplaySlots;  // 長度 10（含 null）
}

export interface ImportResult {
  ok: boolean;
  defenseCount: number;  // 成功還原的防守站位數（非空槽）
  receiveCount: number;  // 成功還原的接發站位數（非空槽）
  setplayCount: number;  // 成功還原的配球戰術數（非空槽）
  error?: string;
}

/**
 * 匯出全部：讀取兩個 localStorage（正規化為 10 槽）打包成單一 JSON 字串。
 */
export function exportAllJSON(): string {
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    defenseSlots: normalizeDefense(loadScenarios()),
    receiveSlots: normalizeReceive(loadSlots()),
    setplaySlots: normalizeSetplay(loadSetplaySlots()),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * 匯入全部：驗證 JSON → 正規化 → 寫回兩個 localStorage，回傳結果。
 * 呼叫端匯入後應重新載入兩個 store 的 slots（見 useTacticsStore.reloadSlots /
 * useReceiveStore.reloadSlots）。
 *
 * 相容性：也接受頂層直接是 { defenseSlots, receiveSlots } 而缺 version 的檔。
 */
export function importAllJSON(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return {
      ok: false,
      defenseCount: 0,
      receiveCount: 0,
      setplayCount: 0,
      error: `JSON 解析失敗：${String(e)}`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      defenseCount: 0,
      receiveCount: 0,
      setplayCount: 0,
      error: '格式錯誤：頂層必須是備份物件（含 defenseSlots / receiveSlots / setplaySlots）',
    };
  }

  const obj = parsed as Record<string, unknown>;
  if (!('defenseSlots' in obj) && !('receiveSlots' in obj) && !('setplaySlots' in obj)) {
    return {
      ok: false,
      defenseCount: 0,
      receiveCount: 0,
      setplayCount: 0,
      error: '格式錯誤：缺少 defenseSlots / receiveSlots / setplaySlots',
    };
  }

  // 各自正規化（非法槽 → null，補足/截斷到 10 槽）。
  // 缺其中一項時該項視為全空（相容缺 setplaySlots 的舊版備份）。
  const defenseSlots = normalizeDefense(obj.defenseSlots);
  const receiveSlots = normalizeReceive(obj.receiveSlots);
  const setplaySlots = normalizeSetplay(obj.setplaySlots);

  saveScenarios(defenseSlots);
  persistSlots(receiveSlots);
  persistSetplaySlots(setplaySlots);

  return {
    ok: true,
    defenseCount: activeScenarios(defenseSlots).length,
    receiveCount: filledCount(receiveSlots),
    setplayCount: setplayFilledCount(setplaySlots),
  };
}

/** 產生下載檔名，如「排球戰術備份_20260705.json」 */
export function backupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `排球戰術備份_${y}${m}${d}.json`;
}
