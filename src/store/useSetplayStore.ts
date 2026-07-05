import { create } from 'zustand';
import type { CameraView, LabelMode } from '../types';
import {
  defaultPlay,
  findPreset,
  clonePlay,
  tempoDefaults,
  trajectoryFor,
  type SetPlay,
  type AttackerRole,
  type Tempo,
  type Trajectory,
} from '../logic/setplay';
import {
  loadSlots,
  persistSlots,
  setSlot,
  makeSlot,
  exportSlots,
  importSlots,
  type SetplaySlots,
} from '../logic/setplaySlots';

// ============================================================
// useSetplayStore — 功能三「舉球送球參數」獨立 store
//   （不與 useTacticsStore / useReceiveStore 共用）
//   current：當前可調配球；role：焦點攻擊手角色；trajectory：衍生軌跡。
// ============================================================

/** SetPlay 中可用滑桿調的欄位 */
export type PlayParam = 'peakAboveNet' | 'offNet' | 'contactZ' | 'speed';

interface SetplayState {
  current: SetPlay; // 當前可調配球
  role: AttackerRole; // 焦點攻擊手角色
  trajectory: Trajectory; // 衍生：由 current 計算
  playing: boolean; // 球動畫播放
  labelMode: LabelMode;
  cameraView: CameraView;
  cameraViewNonce: number;
  slots: SetplaySlots; // 10 槽戰術

  selectPreset: (code: string) => void;
  setTempo: (t: Tempo) => void;
  setParam: (param: PlayParam, value: number) => void;
  setRole: (r: AttackerRole) => void;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  setLabelMode: (m: LabelMode) => void;
  setCameraView: (v: CameraView) => void;
  reset: () => void;

  // --- 10 槽戰術 ---
  saveSlot: (index: number, name?: string) => void;
  loadSlot: (index: number) => void;
  clearSlot: (index: number) => void;
  renameSlot: (index: number, name: string) => void;
  exportSlotsJSON: () => string;
  importSlotsJSON: (json: string) => { ok: boolean; count: number; error?: string };
  /** 從 localStorage 重新載入 slots（全域備份匯入後呼叫） */
  reloadSlots: () => void;
}

function recompute(play: SetPlay): Trajectory {
  return trajectoryFor(play);
}

const initialPlay = defaultPlay();

export const useSetplayStore = create<SetplayState>((set, get) => ({
  current: initialPlay,
  role: initialPlay.role,
  trajectory: recompute(initialPlay),
  playing: false,
  labelMode: 'role',
  cameraView: 'coach',
  cameraViewNonce: 0,
  slots: loadSlots(),

  selectPreset(code) {
    const preset = findPreset(code);
    if (!preset) return;
    set({ current: preset, role: preset.role, trajectory: recompute(preset) });
  },

  setTempo(t) {
    const cur = get().current;
    const d = tempoDefaults(t);
    const next: SetPlay = {
      ...clonePlay(cur),
      tempo: t,
      peakAboveNet: d.peakAboveNet,
      speed: d.speed,
    };
    set({ current: next, trajectory: recompute(next) });
  },

  setParam(param, value) {
    const cur = clonePlay(get().current);
    switch (param) {
      case 'peakAboveNet':
        cur.peakAboveNet = value;
        break;
      case 'offNet':
        cur.offNet = value;
        break;
      case 'contactZ':
        cur.contact = { ...cur.contact, z: value };
        break;
      case 'speed':
        cur.speed = value;
        break;
    }
    set({ current: cur, trajectory: recompute(cur) });
  },

  setRole(r) {
    // 換焦點角色：更新 role 與 current.role（擊球高度依角色重算）。
    const cur = clonePlay(get().current);
    cur.role = r;
    set({ role: r, current: cur, trajectory: recompute(cur) });
  },

  togglePlay() {
    set(state => ({ playing: !state.playing }));
  },

  setPlaying(v) {
    set({ playing: v });
  },

  setLabelMode(m) {
    set({ labelMode: m });
  },

  setCameraView(v) {
    set(state => ({ cameraView: v, cameraViewNonce: state.cameraViewNonce + 1 }));
  },

  reset() {
    const p = defaultPlay();
    set(state => ({
      current: p,
      role: p.role,
      trajectory: recompute(p),
      playing: false,
      labelMode: 'role',
      cameraView: 'coach',
      cameraViewNonce: state.cameraViewNonce + 1,
    }));
  },

  // ---------------------------------------------------------
  // 10 槽戰術
  // ---------------------------------------------------------
  saveSlot(index, name) {
    const { role, current, slots } = get();
    const slot = makeSlot(index, role, current, name);
    const next = setSlot(slots, index, slot);
    persistSlots(next);
    set({ slots: next });
  },

  loadSlot(index) {
    const slot = get().slots[index];
    if (!slot) return;
    const play = clonePlay(slot.play);
    set({ current: play, role: slot.role, trajectory: recompute(play) });
  },

  clearSlot(index) {
    const next = setSlot(get().slots, index, null);
    persistSlots(next);
    set({ slots: next });
  },

  renameSlot(index, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const slots = get().slots;
    const cur = slots[index];
    if (!cur) return;
    const next = setSlot(slots, index, { ...cur, name: trimmed });
    persistSlots(next);
    set({ slots: next });
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

  reloadSlots() {
    set({ slots: loadSlots() });
  },
}));
