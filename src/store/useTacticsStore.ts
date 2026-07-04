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
import { computeDefense } from '../logic/defense';
import { loadScenarios, saveScenarios, upsertScenario, deleteScenario } from '../logic/scenarios';

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

  // --- 編輯模式 ---
  editMode: boolean;
  editOverridePositions: Record<number, Vec2>; // 編輯模式下球員覆蓋座標

  // --- 情境 ---
  scenarios: CustomScenario[];

  // --- 計算結果（衍生狀態，由 recompute 更新）---
  defenseResult: DefenseResult | null;

  // ============================================================
  // Actions
  // ============================================================

  /** 移動攻擊手並立即重算 */
  moveAttacker: (id: string, pos: Vec2) => void;

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

  /** 進入 / 離開編輯模式 */
  setEditMode: (enabled: boolean) => void;

  /** 編輯模式下覆蓋某球員座標 */
  setEditOverridePosition: (playerId: number, pos: Vec2) => void;

  /** 清除所有編輯覆蓋 */
  clearEditOverrides: () => void;

  /** 儲存目前狀態為自訂情境 */
  saveCurrentAsScenario: (name: string) => void;

  /** 刪除情境 */
  removeScenario: (id: string) => void;

  /** 強制重算防守結果 */
  recompute: () => void;
}

// 預設攻擊手（對方半場，x ∈ [-9, 0]）
const DEFAULT_ATTACKERS: Attacker[] = [
  { id: 'atk-1', pos: { x: -2.0, z: 2.0 }, isActive: true },  // 對方4號位
  { id: 'atk-2', pos: { x: -2.0, z: 7.0 }, isActive: false }, // 對方2號位
  { id: 'atk-3', pos: { x: -2.0, z: 4.5 }, isActive: false }, // 對方3號位
];

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
  attackers: DEFAULT_ATTACKERS,
  activeAttackerId: 'atk-1',

  system: 'perimeter',
  middleBlockMode: 'double',
  fanAngleOverride: null,
  netHeight: 2.43,

  labelMode: 'number',
  cameraView: 'coach',

  editMode: false,
  editOverridePositions: {},

  scenarios: loadScenarios(),
  defenseResult: null,

  // --- Actions ---

  moveAttacker(id, pos) {
    set(state => ({
      attackers: state.attackers.map(a => (a.id === id ? { ...a, pos } : a)),
    }));
    get().recompute();
  },

  setActiveAttacker(id) {
    set({ activeAttackerId: id });
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
    set({ cameraView: view });
  },

  setEditMode(enabled) {
    set({ editMode: enabled });
    if (!enabled) get().clearEditOverrides();
  },

  setEditOverridePosition(playerId, pos) {
    set(state => ({
      editOverridePositions: { ...state.editOverridePositions, [playerId]: pos },
    }));
  },

  clearEditOverrides() {
    set({ editOverridePositions: {} });
  },

  saveCurrentAsScenario(name) {
    const state = get();
    const activeAttacker = getActiveAttacker(state.attackers, state.activeAttackerId);
    if (!state.defenseResult) return;

    const scenario: CustomScenario = {
      id: `scenario-${Date.now()}`,
      name,
      attackPos: activeAttacker.pos,
      system: state.system,
      players: state.defenseResult.players,
      zones: state.defenseResult.zones,
      createdAt: Date.now(),
    };

    const updated = upsertScenario(state.scenarios, scenario);
    saveScenarios(updated);
    set({ scenarios: updated });
  },

  removeScenario(id) {
    const state = get();
    const updated = deleteScenario(state.scenarios, id);
    saveScenarios(updated);
    set({ scenarios: updated });
  },

  recompute() {
    const state = get();
    const activeAttacker = getActiveAttacker(state.attackers, state.activeAttackerId);
    const opts = buildOptions(state);
    const result = computeDefense(activeAttacker.pos, opts, state.scenarios);
    set({ defenseResult: result });
  },
}));

// 初始化時先算一次
useTacticsStore.getState().recompute();
