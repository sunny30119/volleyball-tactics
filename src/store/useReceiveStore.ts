import { create } from 'zustand';
import type { CameraView, LabelMode, Vec2 } from '../types';
import type { Rotation, PositionNo } from '../logic/receive';

// ============================================================
// useReceiveStore — 功能二「接發球站位」獨立 store
// （不與 useTacticsStore 共用，避免與功能一互相干擾）
// ============================================================

interface ReceiveState {
  rotation: Rotation;                 // 目前輪轉 1..6
  labelMode: LabelMode;               // 號位 / 角色
  showLegalZones: boolean;            // 是否顯示合法站位範圍框
  cameraView: CameraView;             // 快速視角
  cameraViewNonce: number;            // 重按同視角鈕也觸發過渡
  overridePositions: Record<number, Vec2>; // （可選）教練微調各號位座標

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
}

const wrap = (r: number): Rotation => (((r - 1 + 6) % 6) + 1) as Rotation;

export const useReceiveStore = create<ReceiveState>((set) => ({
  rotation: 1,
  labelMode: 'number',
  showLegalZones: false,
  cameraView: 'top',
  cameraViewNonce: 0,
  overridePositions: {},

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
}));
