import { create } from 'zustand';
import type {
  Attacker,
  CameraView,
  CustomScenario,
  DefenseOptions,
  DefenseResult,
  DefenseSystem,
  LabelMode,
  Vec2,
} from '../types';
import { computeDefense, computeManualOverlays, computeScenarioZones } from '../logic/defense';
import {
  loadScenarios,
  saveScenarios,
  upsertScenario,
  deleteScenario,
  importScenarios,
} from '../logic/scenarios';

// ============================================================
// Zustand Store — 排球戰術教練台全域狀態
// ============================================================

interface TacticsState {
  // --- 攻擊手 ---
  attackers: Attacker[];
  activeAttackerId: string;

  // --- 防守選項 ---
  system: DefenseSystem;
  middleBlockMode: 'single' | 'double';
  fanAngleOverride: number | null;
  netHeight: number;

  // --- 顯示選項 ---
  labelMode: LabelMode;
  cameraView: CameraView;
  /** 視角切換計數器：重按同一顆視角鈕也要重新觸發相機過渡動畫（3D 場景用） */
  cameraViewNonce: number;

  // --- 手動佔位覆蓋（我方球員隨時可拖曳）---
  editOverridePositions: Record<number, Vec2>; // 教練手動拖曳後的球員覆蓋座標

  // --- 情境 ---
  scenarios: CustomScenario[];

  // --- 計算結果（衍生狀態，由 recompute 更新）---
  defenseResult: DefenseResult | null;

  // ============================================================
  // Actions
  // ============================================================

  /** 移動攻擊手並立即重算 */
  moveAttacker: (id: string, pos: Vec2) => void;

  /** 新增攻擊手（最多 3 名） */
  addAttacker: () => void;

  /** 移除攻擊手（至少保留 1 名） */
  removeAttacker: (id: string) => void;

  /** 設定作用中攻擊手 */
  setActiveAttacker: (id: string) => void;

  /** 切換防守體系 */
  setSystem: (system: DefenseSystem) => void;

  /** 切換攔中模式 */
  setMiddleBlockMode: (mode: 'single' | 'double') => void;

  /** 設定扇形角度覆蓋值（null = 自動） */
  setFanAngleOverride: (angle: number | null) => void;

  /** 設定網高 */
  setNetHeight: (height: number) => void;

  /** 切換標籤顯示模式 */
  setLabelMode: (mode: LabelMode) => void;

  /** 切換相機視角 */
  setCameraView: (view: CameraView) => void;

  /** 手動拖曳覆蓋某球員座標（zones 即時重算） */
  setEditOverridePosition: (playerId: number, pos: Vec2) => void;

  /** 清除所有編輯覆蓋 */
  clearEditOverrides: () => void;

  /** 儲存目前狀態為自訂情境 */
  saveCurrentAsScenario: (name: string) => void;

  /** 刪除情境 */
  removeScenario: (id: string) => void;

  /** 載入情境：攻擊點、體系回到儲存時狀態並重算 */
  loadScenario: (id: string) => void;

  /** 從 JSON 字串匯入情境，回傳結果供 UI 提示 */
  importScenariosFromJSON: (json: string) => { ok: boolean; count: number; error?: string };

  /** 重置回預設狀態（不刪除已存情境） */
  resetAll: () => void;

  /** 強制重算防守結果 */
  recompute: () => void;
}

// 預設攻擊手（對方半場，x ∈ [-9, 0]）：教練指定只留 1 名（2026-07-04）
const MAX_ATTACKERS = 3;
function defaultAttackers(): Attacker[] {
  return [
    { id: 'atk-1', pos: { x: -2.0, z: 7.0 }, isActive: true }, // 對方 4 號位區域
  ];
}

function getActiveAttacker(attackers: Attacker[], id: string): Attacker {
  return attackers.find(a => a.id === id) ?? attackers[0];
}

function buildOptions(state: Pick<TacticsState, 'system' | 'middleBlockMode' | 'fanAngleOverride' | 'netHeight'>): DefenseOptions {
  return {
    system: state.system,
    middleBlockMode: state.middleBlockMode,
    fanAngleOverride: state.fanAngleOverride,
    netHeight: state.netHeight,
  };
}

export const useTacticsStore = create<TacticsState>((set, get) => ({
  // --- 初始狀態 ---
  attackers: defaultAttackers(),
  activeAttackerId: 'atk-1',

  system: 'perimeter',
  middleBlockMode: 'double',
  fanAngleOverride: null,
  netHeight: 2.43,

  labelMode: 'number',
  cameraView: 'coach',
  cameraViewNonce: 0,

  editOverridePositions: {},

  scenarios: loadScenarios(),
  defenseResult: null,

  // --- Actions ---

  moveAttacker(id, pos) {
    // 攻擊點變了 → 清除所有手動覆蓋，回到系統計算的佔位（教練再手動微調）
    set(state => ({
      attackers: state.attackers.map(a => (a.id === id ? { ...a, pos } : a)),
      editOverridePositions: {},
    }));
    get().recompute();
  },

  addAttacker() {
    const state = get();
    if (state.attackers.length >= MAX_ATTACKERS) return;
    const newAttacker: Attacker = {
      id: `atk-${Date.now()}`,
      pos: { x: -3.0, z: 4.5 },
      isActive: false,
    };
    set({ attackers: [...state.attackers, newAttacker] });
    get().recompute();
  },

  removeAttacker(id) {
    const state = get();
    if (state.attackers.length <= 1) return;
    const remaining = state.attackers.filter(a => a.id !== id);
    // 移除的是持球者 → 持球權交給第一位剩餘攻擊手
    let activeId = state.activeAttackerId;
    if (activeId === id) activeId = remaining[0].id;
    set({
      attackers: remaining.map(a => ({ ...a, isActive: a.id === activeId })),
      activeAttackerId: activeId,
    });
    get().recompute();
  },

  setActiveAttacker(id) {
    // 同步 isActive 旗標：3D 場景以 attacker.isActive 呈現持球狀態
    set(state => ({
      activeAttackerId: id,
      attackers: state.attackers.map(a => ({ ...a, isActive: a.id === id })),
    }));
    get().recompute();
  },

  setSystem(system) {
    set({ system });
    get().recompute();
  },

  setMiddleBlockMode(mode) {
    set({ middleBlockMode: mode });
    get().recompute();
  },

  setFanAngleOverride(angle) {
    set({ fanAngleOverride: angle });
    get().recompute();
  },

  setNetHeight(height) {
    set({ netHeight: height });
    get().recompute();
  },

  setLabelMode(mode) {
    set({ labelMode: mode });
  },

  setCameraView(view) {
    // nonce 遞增：即使 view 相同（使用者手動旋轉後重按同一顆鈕）也能觸發過渡
    set(state => ({ cameraView: view, cameraViewNonce: state.cameraViewNonce + 1 }));
  },

  setEditOverridePosition(playerId, pos) {
    set(state => ({
      editOverridePositions: { ...state.editOverridePositions, [playerId]: pos },
    }));
    // zones / blockShadow 即時跟著覆蓋後的佔位重算
    get().recompute();
  },

  clearEditOverrides() {
    set({ editOverridePositions: {} });
    get().recompute();
  },

  saveCurrentAsScenario(name) {
    const state = get();
    const activeAttacker = getActiveAttacker(state.attackers, state.activeAttackerId);
    if (!state.defenseResult) return;

    // 套用編輯模式的手動覆蓋座標（教練拖曳後的佔位才是要儲存的內容）
    const players = state.defenseResult.players.map(p => {
      const override = state.editOverridePositions[p.id];
      return override ? { ...p, pos: override } : p;
    });
    // zones 依覆蓋後的佔位重算，確保與球員位置一致
    const zones = computeScenarioZones(activeAttacker.pos, players);

    const scenario: CustomScenario = {
      id: `scenario-${Date.now()}`,
      name,
      attackPos: activeAttacker.pos,
      system: state.system,
      players,
      zones,
      createdAt: Date.now(),
    };

    const updated = upsertScenario(state.scenarios, scenario);
    saveScenarios(updated);
    set({ scenarios: updated });
    get().recompute();
  },

  removeScenario(id) {
    const state = get();
    const updated = deleteScenario(state.scenarios, id);
    saveScenarios(updated);
    set({ scenarios: updated });
    get().recompute();
  },

  loadScenario(id) {
    const state = get();
    const scenario = state.scenarios.find(s => s.id === id);
    if (!scenario) return;
    // 攻擊點回到儲存時位置（recompute 時距離為 0 → IDW 完全採用該情境佔位）
    set({
      system: scenario.system,
      attackers: state.attackers.map(a =>
        a.id === state.activeAttackerId ? { ...a, pos: { ...scenario.attackPos } } : a,
      ),
      editOverridePositions: {},
    });
    get().recompute();
  },

  importScenariosFromJSON(json) {
    const result = importScenarios(json);
    if (result.ok) {
      set({ scenarios: loadScenarios() });
      get().recompute();
    }
    return result;
  },

  resetAll() {
    set({
      attackers: defaultAttackers(),
      activeAttackerId: 'atk-1',
      system: 'perimeter',
      middleBlockMode: 'double',
      fanAngleOverride: null,
      netHeight: 2.43,
      labelMode: 'number',
      editOverridePositions: {},
    });
    // 視角回到預設教練視角（nonce 遞增觸發過渡動畫）
    get().setCameraView('coach');
    get().recompute();
  },

  recompute() {
    const state = get();
    const activeAttacker = getActiveAttacker(state.attackers, state.activeAttackerId);
    const opts = buildOptions(state);
    const base = computeDefense(activeAttacker.pos, opts, state.scenarios);

    const overrides = state.editOverridePositions;
    if (Object.keys(overrides).length === 0) {
      set({ defenseResult: base });
      return;
    }

    // 套用手動覆蓋座標，zones / blockShadow 依覆蓋後的佔位即時重算
    const players = base.players.map(p => {
      const o = overrides[p.id];
      return o ? { ...p, pos: o } : p;
    });
    const { zones, blockShadow } = computeManualOverlays(activeAttacker.pos, players);
    set({ defenseResult: { ...base, players, zones, blockShadow } });
  },
}));

// 初始化時先算一次
useTacticsStore.getState().recompute();
