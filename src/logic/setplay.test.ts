import { describe, it, expect } from 'vitest';
import {
  computeTrajectory,
  trajectoryFor,
  tempoDefaults,
  tempoLabel,
  roleLabel,
  DEFAULT_PLAYS,
  DEFAULT_ORIGIN,
  NET_HEIGHT,
  TEMPO_ORDER,
  typicalContactHeight,
  clonePlay,
  findPreset,
  type Tempo,
} from './setplay';

describe('computeTrajectory 幾何', () => {
  const contact = { x: 0.5, z: 2.0 };
  const traj = computeTrajectory(DEFAULT_ORIGIN, contact, 2.7, 1.5, NET_HEIGHT, 8);

  it('軌跡通過起點', () => {
    const p0 = traj.points3D[0];
    expect(p0.x).toBeCloseTo(DEFAULT_ORIGIN.x, 5);
    expect(p0.z).toBeCloseTo(DEFAULT_ORIGIN.z, 5);
    expect(p0.y).toBeCloseTo(DEFAULT_ORIGIN.y, 5);
  });

  it('軌跡通過擊球點（終點地面 xz 與擊球高度）', () => {
    const pN = traj.points3D[traj.points3D.length - 1];
    expect(pN.x).toBeCloseTo(contact.x, 5);
    expect(pN.z).toBeCloseTo(contact.z, 5);
    expect(pN.y).toBeCloseTo(2.7, 5);
  });

  it('頂點高度 ≈ netHeight + peakAboveNet', () => {
    expect(traj.peakHeight).toBeCloseTo(NET_HEIGHT + 1.5, 5);
    const maxH = Math.max(...traj.points2D.map(p => p.h));
    expect(maxH).toBeCloseTo(NET_HEIGHT + 1.5, 2);
  });

  it('球在網面高度 > 網高（過網）', () => {
    expect(traj.overNetClearance).toBeGreaterThan(0);
  });

  it('points2D 的 d 從 0 遞增到水平距離', () => {
    expect(traj.points2D[0].d).toBeCloseTo(0, 5);
    const last = traj.points2D[traj.points2D.length - 1];
    expect(last.d).toBeCloseTo(traj.horizontalDistance, 5);
    // 單調遞增
    for (let i = 1; i < traj.points2D.length; i++) {
      expect(traj.points2D[i].d).toBeGreaterThanOrEqual(traj.points2D[i - 1].d);
    }
  });

  it('flightTime 隨 speed 變快而變短', () => {
    const slow = computeTrajectory(DEFAULT_ORIGIN, contact, 2.7, 1.5, NET_HEIGHT, 5);
    const fast = computeTrajectory(DEFAULT_ORIGIN, contact, 2.7, 1.5, NET_HEIGHT, 12);
    expect(fast.flightTime).toBeLessThan(slow.flightTime);
  });
});

describe('節奏單調性 neg < t1 < t2 < t3', () => {
  it('峰值遞增', () => {
    const peaks = TEMPO_ORDER.map(t => tempoDefaults(t).peakAboveNet);
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i]).toBeGreaterThan(peaks[i - 1]);
    }
  });

  it('速度遞減（滯空遞增）', () => {
    const speeds = TEMPO_ORDER.map(t => tempoDefaults(t).speed);
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i]).toBeLessThan(speeds[i - 1]);
    }
  });

  it('同幾何下滯空時間隨節奏 neg→t3 遞增', () => {
    const contact = { x: 0.5, z: 4.5 };
    let prev = -Infinity;
    for (const t of TEMPO_ORDER) {
      const d = tempoDefaults(t);
      const traj = computeTrajectory(DEFAULT_ORIGIN, contact, 2.7, d.peakAboveNet, NET_HEIGHT, d.speed);
      expect(traj.flightTime).toBeGreaterThan(prev);
      prev = traj.flightTime;
    }
  });
});

describe('預設球種庫', () => {
  it('每筆 contact 在我方場內（x∈[0,9]、z∈[0,9]）', () => {
    for (const p of DEFAULT_PLAYS) {
      expect(p.contact.x).toBeGreaterThanOrEqual(0);
      expect(p.contact.x).toBeLessThanOrEqual(9);
      expect(p.contact.z).toBeGreaterThanOrEqual(0);
      expect(p.contact.z).toBeLessThanOrEqual(9);
    }
  });

  it('每筆預設球都能過網（clearance > 0）', () => {
    for (const p of DEFAULT_PLAYS) {
      const traj = trajectoryFor(p);
      expect(traj.overNetClearance).toBeGreaterThan(0);
    }
  });

  it('高球峰值明顯高於 A 快峰值', () => {
    const high = findPreset('高球4')!;
    const aq = findPreset('A快')!;
    expect(trajectoryFor(high).peakHeight).toBeGreaterThan(trajectoryFor(aq).peakHeight);
  });

  it('後排 pipe 從 3m 線後起（contact.x > 3）', () => {
    const pipe = findPreset('pipe')!;
    expect(pipe.contact.x).toBeGreaterThan(3);
  });

  it('程式碼代號唯一', () => {
    const codes = DEFAULT_PLAYS.map(p => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('標籤與工具函式', () => {
  it('tempoLabel 繁中', () => {
    expect(tempoLabel('neg')).toBe('負節奏');
    expect(tempoLabel('t1')).toBe('第一節奏');
    expect(tempoLabel('t3')).toBe('第三節奏');
  });

  it('roleLabel 繁中', () => {
    expect(roleLabel('OH')).toBe('主攻');
    expect(roleLabel('MB')).toBe('攔中');
    expect(roleLabel('BACK')).toBe('後排攻擊');
  });

  it('typicalContactHeight 為合理範圍（2.4–2.9m）', () => {
    const roles = ['OH', 'MB', 'OP', 'BACK'] as const;
    const tempos: Tempo[] = ['neg', 't1', 't2', 't3'];
    for (const r of roles) {
      for (const t of tempos) {
        const h = typicalContactHeight(r, t);
        expect(h).toBeGreaterThan(2.4);
        expect(h).toBeLessThan(2.9);
      }
    }
  });

  it('clonePlay 深拷貝 contact', () => {
    const p = DEFAULT_PLAYS[0];
    const c = clonePlay(p);
    c.contact.z = 99;
    expect(p.contact.z).not.toBe(99);
  });
});
