import { create } from 'zustand';
import type { CameraView, LabelMode, Vec2 } from '../types';
import { getReceiveFormation, type Rotation, type PositionNo } from '../logic/receive';
import {
  loadSlots,
  persistSlots,
  setSlot,
  makeSlot,
  exportSlots,
  importSlots,
  type ReceiveSlots,
} from '../logic/receiveSlots';

// ============================================================
// useReceiveStore — 功能二「接發球站位」獨立 store
// （不與 useTacticsStore 共用，避免與功能一互相干擾）
// ============================================================

/** 目前六人最終座標（formation 套用 override 後）＝儲存槽用的 positions */
function currentPositions(
  rotation: Rotation,
  overrides: Record<number, Vec2>,
): Record<PositionNo, Vec2> {
  const base = getReceiveFormation(rotation);
  const out = {} as Record<PositionNo, Vec2>;
  for (const s of base) {
    const o = overrides[s.positionNo];
    out[s.positionNo] = o ? { ...o } : { ...s.pos };
  }
  return out;
}

interface ReceiveState {
  rotation: Rotation;                 // 目前輪轉 1..6
  labelMode: LabelMode;               // 號位 / 角色
  showLegalZones: boolean;            // 是否顯示合法站位範圍框
  cameraView: CameraView;             // 快速視角
  cameraViewNonce: number;            // 重按同視角鈕也觸發過渡
  overridePositions: Record<number, Vec2>; // 教練手動拖曳的各號位座標覆蓋
  slots: ReceiveSlots;                // 10 槽站位

  setRotation: (r: Rotation) => void;
  nextRotation: () => void;
  prevRotation: () => void;
  setLabelMode: (m: LabelMode) => void;
  toggleLegalZones: () => void;
  setShowLegalZones: (v: boolean) => void;
  setCameraView: (v: CameraView) => void;
  setOverridePosition: (positionNo: PositionNo, pos: Vec2) => void;
  clearOverrides: () => void;
  reset: () => void;

  // --- 10 槽站位 ---
  saveReceiveSlot: (index: number, name?: string) => void;
  clearReceiveSlot: (index: number) => void;
  renameReceiveSlot: (index: number, name: string) => void;
  loadReceiveSlot: (index: number) => void;
  exportSlotsJSON: () => string;
  importSlotsJSON: (json: string) => { ok: boolean; count: number; error?: string };
}

const wrap = (r: number): Rotation => (((r - 1 + 6) % 6) + 1) as Rotation;

export const useReceiveStore = create<ReceiveState>((set, get) => ({
  rotation: 1,
  labelMode: 'number',
  showLegalZones: false,
  cameraView: 'top',
  cameraViewNonce: 0,
  overridePositions: {},
  slots: loadSlots(),

  setRotation(r) {
    set({ rotation: r, overridePositions: {} });
  },

  nextRotation() {
    set(state => ({ rotation: wrap(state.rotation + 1), overridePositions: {} }));
  },

  prevRotation() {
    set(state => ({ rotation: wrap(state.rotation - 1), overridePositions: {} }));
  },

  setLabelMode(m) {
    set({ labelMode: m });
  },

  toggleLegalZones() {
    set(state => ({ showLegalZones: !state.showLegalZones }));
  },

  setShowLegalZones(v) {
    set({ showLegalZones: v });
  },

  setCameraView(v) {
    // nonce 遞增：重按同一顆視角鈕（使用者手動旋轉後）也能重新觸發過渡
    set(state => ({ cameraView: v, cameraViewNonce: state.cameraViewNonce + 1 }));
  },

  setOverridePosition(positionNo, pos) {
    set(state => ({
      overridePositions: { ...state.overridePositions, [positionNo]: pos },
    }));
  },

  clearOverrides() {
    set({ overridePositions: {} });
  },

  reset() {
    set(state => ({
      rotation: 1,
      labelMode: 'number',
      showLegalZones: false,
      cameraView: 'top',
      cameraViewNonce: state.cameraViewNonce + 1,
      overridePositions: {},
    }));
  },

  // ---------------------------------------------------------
  // 10 槽站位
  // ---------------------------------------------------------
  saveReceiveSlot(index, name) {
    const { rotation, overridePositions, slots } = get();
    const positions = currentPositions(rotation, overridePositions);
    const slot = makeSlot(index, rotation, positions, name);
    const next = setSlot(slots, index, slot);
    persistSlots(next);
    set({ slots: next });
  },

  clearReceiveSlot(index) {
    const next = setSlot(get().slots, index, null);
    persistSlots(next);
    set({ slots: next });
  },

  renameReceiveSlot(index, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const slots = get().slots;
    const cur = slots[index];
    if (!cur) return;
    const next = setSlot(slots, index, { ...cur, name: trimmed });
    persistSlots(next);
    set({ slots: next });
  },

  loadReceiveSlot(index) {
    const slot = get().slots[index];
    if (!slot) return;
    // 還原 rotation 與 positions → overridePositions（3D 回到儲存狀態）
    const overrides: Record<number, Vec2> = {};
    for (const [k, v] of Object.entries(slot.positions)) {
      overrides[Number(k)] = { ...v };
    }
    set(state => ({
      rotation: slot.rotation,
      overridePositions: overrides,
      cameraViewNonce: state.cameraViewNonce, // 不動視角
    }));
  },

  exportSlotsJSON() {
    return exportSlots(get().slots);
  },

  importSlotsJSON(json) {
    const res = importSlots(json);
    if (res.ok && res.slots) {
      set({ slots: res.slots });
    }
    return { ok: res.ok, count: res.count, error: res.error };
  },
}));
