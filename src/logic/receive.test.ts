import { describe, it, expect } from 'vitest';
import {
  ROLE_BY_ROTATION,
  getLineup,
  getReceiveFormation,
  getLegalZones,
  getSetterPath,
  getSetterPosition,
  isFrontRow,
  type Rotation,
  type PositionNo,
} from './receive';
import type { Role } from '../types';

const ALL_ROTATIONS: Rotation[] = [1, 2, 3, 4, 5, 6];

// 教練指定的六輪轉角色表（真相來源，用於比對生成結果）
const EXPECTED: Record<Rotation, Record<PositionNo, Role>> = {
  1: { 1: 'S', 2: 'OH1', 3: 'MB1', 4: 'OP', 5: 'OH2', 6: 'MB2' },
  2: { 1: 'OH1', 2: 'MB1', 3: 'OP', 4: 'OH2', 5: 'MB2', 6: 'S' },
  3: { 1: 'MB1', 2: 'OP', 3: 'OH2', 4: 'MB2', 5: 'S', 6: 'OH1' },
  4: { 1: 'OP', 2: 'OH2', 3: 'MB2', 4: 'S', 5: 'OH1', 6: 'MB1' },
  5: { 1: 'OH2', 2: 'MB2', 3: 'S', 4: 'OH1', 5: 'MB1', 6: 'OP' },
  6: { 1: 'MB2', 2: 'S', 3: 'OH1', 4: 'MB1', 5: 'OP', 6: 'OH2' },
};

describe('ROLE_BY_ROTATION 六輪轉角色表', () => {
  it('生成表與教練指定完全一致', () => {
    for (const r of ALL_ROTATIONS) {
      for (const p of [1, 2, 3, 4, 5, 6] as PositionNo[]) {
        expect(ROLE_BY_ROTATION[r][p], `R${r} P${p}`).toBe(EXPECTED[r][p]);
      }
    }
  });

  it('每輪轉六角色皆恰好出現一次', () => {
    for (const r of ALL_ROTATIONS) {
      const roles = ([1, 2, 3, 4, 5, 6] as PositionNo[]).map(p => ROLE_BY_ROTATION[r][p]);
      expect(new Set(roles).size).toBe(6);
    }
  });
});

describe('getLineup 陣容與自由球員替換', () => {
  it('每輪恰 6 人上場', () => {
    for (const r of ALL_ROTATIONS) {
      const lineup = getLineup(r);
      expect(lineup).toHaveLength(6);
      expect(lineup.every(e => e.onCourt)).toBe(true);
    }
  });

  it('每輪恰含 1 名自由球員 L', () => {
    for (const r of ALL_ROTATIONS) {
      const ls = getLineup(r).filter(e => e.role === 'L');
      expect(ls, `R${r}`).toHaveLength(1);
    }
  });

  it('L 替換的是後排的攔中', () => {
    for (const r of ALL_ROTATIONS) {
      const l = getLineup(r).find(e => e.role === 'L')!;
      expect(l.isFrontRow, `R${r} L 應在後排`).toBe(false);
      expect(['MB1', 'MB2'], `R${r} L 應替換攔中`).toContain(l.baseRole);
    }
  });

  it('場上仍有一名前排攔中（另一名 MB 在前排未被替換）', () => {
    for (const r of ALL_ROTATIONS) {
      const mbs = getLineup(r).filter(e => e.role === 'MB1' || e.role === 'MB2');
      expect(mbs, `R${r}`).toHaveLength(1);
      expect(mbs[0].isFrontRow).toBe(true);
    }
  });

  it('每輪場上角色為 S/OH1/OH2/OP/一名MB/L', () => {
    for (const r of ALL_ROTATIONS) {
      const roles = getLineup(r).map(e => e.role).sort();
      const hasS = roles.includes('S');
      const hasOH1 = roles.includes('OH1');
      const hasOH2 = roles.includes('OH2');
      const hasOP = roles.includes('OP');
      const hasL = roles.includes('L');
      const mbCount = roles.filter(x => x === 'MB1' || x === 'MB2').length;
      expect(hasS && hasOH1 && hasOH2 && hasOP && hasL, `R${r}`).toBe(true);
      expect(mbCount, `R${r} 場上只剩一名 MB`).toBe(1);
    }
  });
});

describe('getReceiveFormation 接發站位', () => {
  it('每輪恰三名接發員（OH1/OH2/L）', () => {
    for (const r of ALL_ROTATIONS) {
      const passers = getReceiveFormation(r).filter(s => s.isPasser);
      expect(passers, `R${r}`).toHaveLength(3);
      const roles = passers.map(p => p.role).sort();
      expect(roles).toEqual(['L', 'OH1', 'OH2']);
    }
  });

  it('所有站位落在我方半場範圍內', () => {
    for (const r of ALL_ROTATIONS) {
      for (const s of getReceiveFormation(r)) {
        expect(s.pos.x, `R${r} P${s.positionNo} x`).toBeGreaterThanOrEqual(0.3);
        expect(s.pos.x).toBeLessThanOrEqual(8.7);
        expect(s.pos.z).toBeGreaterThanOrEqual(0.3);
        expect(s.pos.z).toBeLessThanOrEqual(8.7);
      }
    }
  });

  it('每個接發站位皆落在其合法範圍框內', () => {
    for (const r of ALL_ROTATIONS) {
      const formation = getReceiveFormation(r);
      const zones = getLegalZones(r);
      const zoneOf = new Map(zones.map(z => [z.positionNo, z]));
      for (const s of formation) {
        const z = zoneOf.get(s.positionNo)!;
        expect(s.pos.x, `R${r} P${s.positionNo} x 下界`).toBeGreaterThanOrEqual(z.min.x - 1e-9);
        expect(s.pos.x, `R${r} P${s.positionNo} x 上界`).toBeLessThanOrEqual(z.max.x + 1e-9);
        expect(s.pos.z, `R${r} P${s.positionNo} z 下界`).toBeGreaterThanOrEqual(z.min.z - 1e-9);
        expect(s.pos.z, `R${r} P${s.positionNo} z 上界`).toBeLessThanOrEqual(z.max.z + 1e-9);
      }
    }
  });
});

describe('重疊規則（前後排 + 左右）成立', () => {
  it('前後排 x 約束：x(P1)>x(P2)、x(P6)>x(P3)、x(P5)>x(P4)', () => {
    for (const r of ALL_ROTATIONS) {
      const f = getReceiveFormation(r);
      const x = (p: PositionNo) => f.find(s => s.positionNo === p)!.pos.x;
      expect(x(1), `R${r} P1>P2`).toBeGreaterThan(x(2));
      expect(x(6), `R${r} P6>P3`).toBeGreaterThan(x(3));
      expect(x(5), `R${r} P5>P4`).toBeGreaterThan(x(4));
    }
  });

  it('前排左右 z 約束：z(P4)<z(P3)<z(P2)', () => {
    for (const r of ALL_ROTATIONS) {
      const f = getReceiveFormation(r);
      const z = (p: PositionNo) => f.find(s => s.positionNo === p)!.pos.z;
      expect(z(4), `R${r} P4<P3`).toBeLessThan(z(3));
      expect(z(3), `R${r} P3<P2`).toBeLessThan(z(2));
    }
  });

  it('後排左右 z 約束：z(P5)<z(P6)<z(P1)', () => {
    for (const r of ALL_ROTATIONS) {
      const f = getReceiveFormation(r);
      const z = (p: PositionNo) => f.find(s => s.positionNo === p)!.pos.z;
      expect(z(5), `R${r} P5<P6`).toBeLessThan(z(6));
      expect(z(6), `R${r} P6<P1`).toBeLessThan(z(1));
    }
  });
});

describe('攻擊組織優先佈局（教練 2026-07 更新）', () => {
  it('舉球員 S 從不列入接發員', () => {
    for (const r of ALL_ROTATIONS) {
      const s = getReceiveFormation(r).find(x => x.role === 'S')!;
      expect(s.isPasser, `R${r} S 不接發`).toBe(false);
    }
  });

  it('前排攔中 MB 從不列入接發員，且貼網（x 極小）準備打快攻', () => {
    for (const r of ALL_ROTATIONS) {
      const mb = getReceiveFormation(r).find(
        x => x.role === 'MB1' || x.role === 'MB2',
      )!;
      expect(mb.isPasser, `R${r} 前排MB不接發`).toBe(false);
      expect(isFrontRow(mb.positionNo), `R${r} MB 在前排`).toBe(true);
      // 貼網：x 接近網前中央的 0.8（夾制後仍極小）
      expect(mb.pos.x, `R${r} MB 貼網`).toBeLessThanOrEqual(1.0);
    }
  });

  it('S 在前排時直接站網前偏右舉球定位（≈x1.0,z6.0）', () => {
    for (const r of ALL_ROTATIONS) {
      if (!isFrontRow(getSetterPosition(r))) continue;
      const s = getReceiveFormation(r).find(x => x.role === 'S')!;
      expect(Math.abs(s.pos.x - 1.0), `R${r} S 前排 x`).toBeLessThanOrEqual(0.3);
      expect(Math.abs(s.pos.z - 6.0), `R${r} S 前排 z`).toBeLessThanOrEqual(0.3);
      expect(s.pos.x, `R${r} S 貼網`).toBeLessThan(2);
    }
  });

  it('S 在後排時，其站位是合法框內最靠網前（x 貼合法框下界）', () => {
    for (const r of ALL_ROTATIONS) {
      const setterPos = getSetterPosition(r);
      if (isFrontRow(setterPos)) continue;
      const s = getReceiveFormation(r).find(x => x.role === 'S')!;
      const zone = getLegalZones(r).find(z => z.positionNo === setterPos)!;
      // 站位落在合法框內
      expect(s.pos.x).toBeGreaterThanOrEqual(zone.min.x - 1e-9);
      expect(s.pos.x).toBeLessThanOrEqual(zone.max.x + 1e-9);
      // x 已貼近合法框最靠網那側（下界），使插上跑動最短
      expect(s.pos.x - zone.min.x, `R${r} S 貼合法框下界`).toBeLessThanOrEqual(0.5);
      // 明顯比預設後排底線（7.0）靠前
      expect(s.pos.x, `R${r} S 已插前`).toBeLessThan(6.5);
    }
  });

  it('三名接發員（OH1/OH2/L）承擔全部接發並展開於後場', () => {
    for (const r of ALL_ROTATIONS) {
      const formation = getReceiveFormation(r);
      const passers = formation.filter(s => s.isPasser);
      expect(passers).toHaveLength(3);
      // 只有這三名接發員接發，S / MB / OP 皆讓開
      const nonPasserRoles = formation
        .filter(s => !s.isPasser)
        .map(s => s.role)
        .sort();
      expect(nonPasserRoles.some(x => x === 'MB1' || x === 'MB2')).toBe(true);
      expect(nonPasserRoles).toContain('S');
      expect(nonPasserRoles).toContain('OP');
      // 接發員展開涵蓋一定 z 寬度（左右分擔）
      const zs = passers.map(p => p.pos.z);
      const spread = Math.max(...zs) - Math.min(...zs);
      expect(spread, `R${r} 接發展開寬度`).toBeGreaterThanOrEqual(2);
    }
  });

  it('舉對 OP 從不接發，且 x 依前後排讓開（前排貼網／後排靠後）', () => {
    for (const r of ALL_ROTATIONS) {
      const op = getReceiveFormation(r).find(x => x.role === 'OP')!;
      expect(op.isPasser, `R${r} OP 不接發`).toBe(false);
      if (isFrontRow(op.positionNo)) {
        expect(op.pos.x, `R${r} OP 前排貼網`).toBeLessThanOrEqual(2);
      } else {
        expect(op.pos.x, `R${r} OP 後排靠後`).toBeGreaterThan(4.5);
      }
    }
  });
});

describe('getSetterPath 舉球員插上路徑', () => {
  it('S 在前排回傳 null、後排回傳路徑', () => {
    for (const r of ALL_ROTATIONS) {
      const setterFront = isFrontRow(getSetterPosition(r));
      const path = getSetterPath(r);
      if (setterFront) {
        expect(path, `R${r} 前排應無插上`).toBeNull();
      } else {
        expect(path, `R${r} 後排應有插上`).not.toBeNull();
        // 目標在網前右側（x 小、z 偏右）
        expect(path!.to.x).toBeLessThan(2);
        expect(path!.to.z).toBeGreaterThan(4.5);
      }
    }
  });
});
