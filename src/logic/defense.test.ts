import { describe, it, expect } from 'vitest';
import { computeDefense } from './defense';
import type { Vec2, DefenseOptions, CustomScenario } from '../types';

const BASE_OPTS: DefenseOptions = {
  system: 'perimeter',
  middleBlockMode: 'double',
  fanAngleOverride: null,
  netHeight: 2.43,
};

const NO_SCENARIOS: CustomScenario[] = [];

// ── 工具 ──────────────────────────────────────────────────────

function allInCourt(players: ReturnType<typeof computeDefense>['players']): boolean {
  return players.every(p => {
    if (p.isBlocking) {
      // 攔網手在網前，x 可小至 0.3
      return p.pos.x >= 0.3 && p.pos.x <= 8.7 && p.pos.z >= 0.3 && p.pos.z <= 8.7;
    }
    return p.pos.x >= 0.3 && p.pos.x <= 8.7 && p.pos.z >= 0.3 && p.pos.z <= 8.7;
  });
}

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

// ── 測試 ──────────────────────────────────────────────────────

describe('computeDefense — 攔網配置', () => {
  it('對方 4 號位攻擊：我方 2、3 號位 isBlocking=true', () => {
    const result = computeDefense({ x: -1, z: 7.5 }, BASE_OPTS, NO_SCENARIOS);
    const p2 = result.players.find(p => p.id === 2)!;
    const p3 = result.players.find(p => p.id === 3)!;
    expect(p2.isBlocking).toBe(true);
    expect(p3.isBlocking).toBe(true);
  });

  it('對方 4 號位攻擊：六人都在場地內', () => {
    const result = computeDefense({ x: -1, z: 7.5 }, BASE_OPTS, NO_SCENARIOS);
    expect(allInCourt(result.players)).toBe(true);
  });

  it('對方 4 號位攻擊：zones 有 6 塊', () => {
    const result = computeDefense({ x: -1, z: 7.5 }, BASE_OPTS, NO_SCENARIOS);
    expect(result.zones).toHaveLength(6);
  });

  it('對方 3 號位快攻 + middleBlockMode=single：只有一人 isBlocking', () => {
    const opts: DefenseOptions = { ...BASE_OPTS, middleBlockMode: 'single' };
    const result = computeDefense({ x: -0.5, z: 4.5 }, opts, NO_SCENARIOS);
    const blockers = result.players.filter(p => p.isBlocking);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].id).toBe(3);
  });

  it('對方 2 號位攻擊：我方 4、3 號位 isBlocking=true', () => {
    const result = computeDefense({ x: -1, z: 1.5 }, BASE_OPTS, NO_SCENARIOS);
    const p4 = result.players.find(p => p.id === 4)!;
    const p3 = result.players.find(p => p.id === 3)!;
    expect(p4.isBlocking).toBe(true);
    expect(p3.isBlocking).toBe(true);
  });

  it('後排 6 號位攻擊（x=-6, z=4.5）：只有 1 位攔網手', () => {
    const result = computeDefense({ x: -6, z: 4.5 }, BASE_OPTS, NO_SCENARIOS);
    const blockers = result.players.filter(p => p.isBlocking);
    expect(blockers).toHaveLength(1);
  });
});

describe('computeDefense — 1、5 號位前壓（教練 2026-07-04：離網約 4m）', () => {
  it('任意前排攻擊點下，非攔網的 1、5 號位 pos.x ≤ 4.0（兩套體系）', () => {
    for (const system of ['perimeter', 'rotation'] as const) {
      const opts: DefenseOptions = { ...BASE_OPTS, system };
      for (let z = 0.5; z <= 8.5; z += 0.25) {
        const result = computeDefense({ x: -1, z }, opts, NO_SCENARIOS);
        for (const id of [1, 5]) {
          const p = result.players.find(pp => pp.id === id)!;
          if (!p.isBlocking) {
            expect(p.pos.x, `system=${system} z=${z} 球員${id}`).toBeLessThanOrEqual(4.0);
          }
        }
      }
    }
  });

  it('後排攻擊點下，非攔網的 1、5 號位 pos.x ≤ 4.0', () => {
    for (let z = 0.5; z <= 8.5; z += 0.5) {
      const result = computeDefense({ x: -6, z }, BASE_OPTS, NO_SCENARIOS);
      for (const id of [1, 5]) {
        const p = result.players.find(pp => pp.id === id)!;
        if (!p.isBlocking) {
          expect(p.pos.x, `z=${z} 球員${id}`).toBeLessThanOrEqual(4.0);
        }
      }
    }
  });
});

describe('computeDefense — 非攔網球員不重疊（教練 2026-07-05：4/5 及對稱側分開）', () => {
  it('掃描多攻擊點，任兩名非攔網我方球員距離 ≥ 2.0m（兩體系、單雙攔）', () => {
    for (const system of ['perimeter', 'rotation'] as const) {
      for (const middleBlockMode of ['single', 'double'] as const) {
        const opts: DefenseOptions = { ...BASE_OPTS, system, middleBlockMode };
        for (const x of [-1, -2, -3, -4, -6, -8]) {
          for (let z = 0.3; z <= 8.7; z += 0.25) {
            const result = computeDefense({ x, z }, opts, NO_SCENARIOS);
            const nb = result.players.filter(p => !p.isBlocking);
            for (let i = 0; i < nb.length; i++) {
              for (let j = i + 1; j < nb.length; j++) {
                const d = dist(nb[i].pos, nb[j].pos);
                expect(
                  d,
                  `${system}/${middleBlockMode} atk(${x},${z.toFixed(2)}) ${nb[i].id}-${nb[j].id}`,
                ).toBeGreaterThanOrEqual(2.0);
              }
            }
          }
        }
      }
    }
  });

  it('教練實測點：opp4 攻擊手 {x:-2,z:7} 下 4 與 5 明顯分開（≥ 2.0m）', () => {
    const result = computeDefense({ x: -2, z: 7 }, BASE_OPTS, NO_SCENARIOS);
    const p4 = result.players.find(p => p.id === 4)!;
    const p5 = result.players.find(p => p.id === 5)!;
    expect(p4.isBlocking).toBe(false);
    expect(p5.isBlocking).toBe(false);
    expect(dist(p4.pos, p5.pos)).toBeGreaterThanOrEqual(2.0);
  });

  it('對稱側：opp2 攻擊手 {x:-2,z:2} 下 1 與 2 分開（≥ 2.0m）', () => {
    const result = computeDefense({ x: -2, z: 2 }, BASE_OPTS, NO_SCENARIOS);
    const p1 = result.players.find(p => p.id === 1)!;
    const p2 = result.players.find(p => p.id === 2)!;
    if (!p1.isBlocking && !p2.isBlocking) {
      expect(dist(p1.pos, p2.pos)).toBeGreaterThanOrEqual(2.0);
    }
  });

  it('分離後 1、5 號位前壓仍成立（x ≤ 4.0）', () => {
    for (const system of ['perimeter', 'rotation'] as const) {
      const opts: DefenseOptions = { ...BASE_OPTS, system };
      for (let z = 0.5; z <= 8.5; z += 0.25) {
        const result = computeDefense({ x: -1, z }, opts, NO_SCENARIOS);
        for (const id of [1, 5]) {
          const p = result.players.find(pp => pp.id === id)!;
          if (!p.isBlocking) {
            expect(p.pos.x, `${system} z=${z} 球員${id}`).toBeLessThanOrEqual(4.0);
          }
        }
      }
    }
  });
});

describe('computeDefense — 攻擊扇形', () => {
  it('後排 6 號位攻擊（中間）扇形角度 >= 對方 4 號位邊線攻擊扇形角度', () => {
    const backCenter = computeDefense({ x: -6, z: 4.5 }, BASE_OPTS, NO_SCENARIOS);
    const frontWide = computeDefense({ x: -1, z: 7.5 }, BASE_OPTS, NO_SCENARIOS);
    expect(backCenter.attackFan.angleDeg).toBeGreaterThanOrEqual(frontWide.attackFan.angleDeg);
  });

  it('扇形 leftDir 和 rightDir 都是單位向量（長度接近 1）', () => {
    const result = computeDefense({ x: -2, z: 4.5 }, BASE_OPTS, NO_SCENARIOS);
    const lenL = Math.sqrt(result.attackFan.leftDir.x ** 2 + result.attackFan.leftDir.z ** 2);
    const lenR = Math.sqrt(result.attackFan.rightDir.x ** 2 + result.attackFan.rightDir.z ** 2);
    expect(lenL).toBeCloseTo(1, 3);
    expect(lenR).toBeCloseTo(1, 3);
  });

  it('fanAngleOverride 有效：回傳指定角度', () => {
    const opts: DefenseOptions = { ...BASE_OPTS, fanAngleOverride: 45 };
    const result = computeDefense({ x: -3, z: 4.5 }, opts, NO_SCENARIOS);
    expect(result.attackFan.angleDeg).toBe(45);
  });
});

describe('computeDefense — 連續性', () => {
  it('攻擊點連續移動 20 步，任一球員相鄰兩步位移 < 1.5m', () => {
    const steps = 20;
    const results = Array.from({ length: steps }, (_, i) => {
      const t = i / (steps - 1);
      // 從對方 4 號位（-1, 7.5）到對方 2 號位（-1, 1.5）水平掃描
      const z = 7.5 - t * 6;
      return computeDefense({ x: -1, z }, BASE_OPTS, NO_SCENARIOS);
    });

    for (let i = 1; i < results.length; i++) {
      for (const p of results[i].players) {
        const prev = results[i - 1].players.find(pp => pp.id === p.id)!;
        const d = dist(p.pos, prev.pos);
        expect(d).toBeLessThan(1.5);
      }
    }
  });
});

describe('computeDefense — 自訂情境內插', () => {
  it('attackPos 等於情境點時，球員位置等於情境值', () => {
    const customPos: Vec2 = { x: -2, z: 5 };
    const customPlayers = [1, 2, 3, 4, 5, 6].map((id, idx) => ({
      id,
      role: 'S' as const,
      pos: { x: 1 + idx, z: 1 + idx } as Vec2,
      isBlocking: id === 2 || id === 3,
    }));

    const scenario: CustomScenario = {
      id: 'test-1',
      name: '測試情境',
      attackPos: customPos,
      system: 'perimeter',
      players: customPlayers,
      zones: [],
      createdAt: Date.now(),
    };

    const result = computeDefense(customPos, BASE_OPTS, [scenario]);
    for (const p of result.players) {
      const expected = customPlayers.find(cp => cp.id === p.id)!;
      expect(p.pos.x).toBeCloseTo(expected.pos.x, 1);
      expect(p.pos.z).toBeCloseTo(expected.pos.z, 1);
    }
  });

  it('不同體系的情境不影響計算結果', () => {
    const customPos: Vec2 = { x: -1, z: 4.5 };
    const scenario: CustomScenario = {
      id: 'test-2',
      name: '輪轉情境',
      attackPos: customPos,
      system: 'rotation', // 不同體系
      players: [1, 2, 3, 4, 5, 6].map(id => ({
        id,
        role: 'S' as const,
        pos: { x: 9, z: 9 } as Vec2, // 極端值，不應被用到
        isBlocking: false,
      })),
      zones: [],
      createdAt: Date.now(),
    };

    // system=perimeter 時不應用 rotation 情境
    const result = computeDefense(customPos, BASE_OPTS, [scenario]);
    const anyAtCorner = result.players.some(p => p.pos.x > 8.5 && p.pos.z > 8.5);
    expect(anyAtCorner).toBe(false);
  });
});

describe('computeDefense — 攔網影子', () => {
  it('前排攻擊時 blockShadow 不為空', () => {
    const result = computeDefense({ x: -1, z: 7.5 }, BASE_OPTS, NO_SCENARIOS);
    expect(result.blockShadow.length).toBeGreaterThan(0);
  });

  it('perimeter 體系：自由球員在 6 號位（role=L），5 號位為主攻', () => {
    const result = computeDefense({ x: -3, z: 4.5 }, BASE_OPTS, NO_SCENARIOS);
    const p6 = result.players.find(p => p.id === 6)!;
    const p5 = result.players.find(p => p.id === 5)!;
    expect(p6.role).toBe('L');
    expect(p5.role).toBe('OH2');
  });

  it('rotation 體系：自由球員在 6 號位（role=L）', () => {
    const opts: DefenseOptions = { ...BASE_OPTS, system: 'rotation' };
    const result = computeDefense({ x: -3, z: 4.5 }, opts, NO_SCENARIOS);
    const p6 = result.players.find(p => p.id === 6)!;
    expect(p6.role).toBe('L');
  });
});
