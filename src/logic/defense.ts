import type { Vec2, DefenseOptions, DefenseResult, CustomScenario, PlayerState, ZonePolygon } from '../types';
import { DEFAULT_POSITIONS } from './court';

// ============================================================
// 防守計算純函式
// 無副作用。輸入攻擊點 + 選項 + 自訂情境，輸出防守結果。
//
// 規則摘要（stub 階段回傳合理固定值，完整邏輯待邏輯工程師實作）：
//
// 攔網規則：
//   對方4號位攻擊 → 我方2號位主攔 + 3號位補位雙人
//   對方2號位攻擊 → 我方4號位主攔 + 3號位補位
//   對方3號位快攻 → middleBlockMode: single=僅我方3號位 / double=2+3號位
//   後排攻擊(attackPos.x < -3) → 攔網人數減少或單人
//
// 扇形角度：
//   靠邊線攻擊點 → 約 60–75°
//   中間攻擊點   → 約 90°
//   fanAngleOverride 非 null 時使用覆蓋值
//
// 自訂情境內插：
//   若攻擊點與某自訂情境距離 ≤ 4m（同體系）→ 距離加權內插
//   距離 > 4m → 退回預設幾何計算
// ============================================================

/** 計算兩點距離 */
function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

/** 根據攻擊點自動計算扇形角度 */
function autoFanAngle(attackPos: Vec2): number {
  // z 軸：0=左邊線, 9=右邊線，4.5=中間
  const distFromCenter = Math.abs(attackPos.z - 4.5);
  // 中間攻擊 90°，邊線攻擊 60°，線性插值
  const t = Math.min(distFromCenter / 4.5, 1);
  return 90 - t * 30;
}

/** 根據攻擊點與防守體系決定哪些球員攔網 */
function resolveBlockers(
  attackPos: Vec2,
  opts: DefenseOptions,
): Set<number> {
  const blockers = new Set<number>();
  const isBackRowAttack = attackPos.x < -3;

  if (isBackRowAttack) {
    // 後排攻擊單人攔網：攻擊點偏右找2號位，偏左找4號位，中間找3號位
    if (attackPos.z > 6) blockers.add(2);
    else if (attackPos.z < 3) blockers.add(4);
    else blockers.add(3);
    return blockers;
  }

  // 前排攻擊
  if (attackPos.z > 6) {
    // 對方4號位方向攻擊
    blockers.add(2);
    blockers.add(3);
  } else if (attackPos.z < 3) {
    // 對方2號位方向攻擊
    blockers.add(4);
    blockers.add(3);
  } else {
    // 對方3號位中間快攻
    blockers.add(3);
    if (opts.middleBlockMode === 'double') blockers.add(2);
  }

  return blockers;
}

/** 根據攔網位置產生攔網影子多邊形（我方場地上） */
function buildBlockShadow(blockers: Set<number>, players: PlayerState[]): Vec2[] {
  if (blockers.size === 0) return [];
  const blockerPlayers = players.filter(p => blockers.has(p.id));
  if (blockerPlayers.length === 0) return [];

  // 簡單矩形影子：攔網球員正後方延伸 3m
  const minZ = Math.min(...blockerPlayers.map(p => p.pos.z)) - 0.5;
  const maxZ = Math.max(...blockerPlayers.map(p => p.pos.z)) + 0.5;
  return [
    { x: 0.1, z: minZ },
    { x: 3.0, z: minZ },
    { x: 3.0, z: maxZ },
    { x: 0.1, z: maxZ },
  ];
}

/** 根據防守體系與攻擊點計算六名球員防守站位 */
function buildDefensivePositions(
  attackPos: Vec2,
  opts: DefenseOptions,
  blockers: Set<number>,
): PlayerState[] {
  const roles: PlayerState['role'][] = ['S', 'OH1', 'MB1', 'OH2', 'MB2', 'OP'];

  // perimeter 體系：自由球員替換5號位；rotation 體系：自由球員站6號位
  const liberoId = opts.system === 'perimeter' ? 5 : 6;

  return [1, 2, 3, 4, 5, 6].map((id, idx) => {
    const base = { ...DEFAULT_POSITIONS[id] };
    const isBlocking = blockers.has(id);

    // 攔網球員靠近網子
    if (isBlocking) {
      base.x = 0.4;
    } else {
      // 非攔網後排球員向後退並往攻擊方向偏移
      if (id === 1 || id === 5 || id === 6) {
        // 偏移量：攻擊點 z 位置牽引後排站位
        const pull = (attackPos.z - 4.5) * 0.3;
        base.z = Math.max(0.5, Math.min(8.5, base.z + pull));
        base.x = Math.min(8.5, base.x + 1.0);
      }
    }

    return {
      id,
      role: id === liberoId ? 'L' : roles[idx],
      pos: base,
      isBlocking,
    };
  });
}

/** 產生每名球員的責任區塊（簡化版 Voronoi 近似） */
function buildZones(players: PlayerState[]): ZonePolygon[] {
  // stub：每名球員的責任區塊為以其站位為中心的 2m×2m 正方形
  return players.map(p => ({
    playerId: p.id,
    points: [
      { x: p.pos.x - 1.0, z: p.pos.z - 1.0 },
      { x: p.pos.x + 1.0, z: p.pos.z - 1.0 },
      { x: p.pos.x + 1.0, z: p.pos.z + 1.0 },
      { x: p.pos.x - 1.0, z: p.pos.z + 1.0 },
    ],
  }));
}

/**
 * 主函式：計算防守佔位
 * @param attackPos 攻擊手位置（對方半場，x ∈ [-9, 0]）
 * @param opts 防守選項
 * @param customScenarios 使用者自訂情境清單
 */
export function computeDefense(
  attackPos: Vec2,
  opts: DefenseOptions,
  customScenarios: CustomScenario[],
): DefenseResult {
  // 嘗試自訂情境加權內插
  const sameSystemScenarios = customScenarios.filter(
    s => s.system === opts.system,
  );
  const INTERPOLATION_THRESHOLD = 4; // 公尺

  if (sameSystemScenarios.length > 0) {
    const nearest = sameSystemScenarios.reduce((best, s) =>
      dist(s.attackPos, attackPos) < dist(best.attackPos, attackPos) ? s : best,
    );

    if (dist(nearest.attackPos, attackPos) <= INTERPOLATION_THRESHOLD) {
      // 使用自訂情境（完整加權內插邏輯待實作，此處直接用最近情境）
      const angleDeg = opts.fanAngleOverride ?? autoFanAngle(attackPos);
      return {
        players: nearest.players,
        zones: nearest.zones,
        blockShadow: buildBlockShadow(
          new Set(nearest.players.filter(p => p.isBlocking).map(p => p.id)),
          nearest.players,
        ),
        attackFan: {
          origin: attackPos,
          leftDir: { x: 1, z: -Math.tan((angleDeg / 2) * (Math.PI / 180)) },
          rightDir: { x: 1, z: Math.tan((angleDeg / 2) * (Math.PI / 180)) },
          angleDeg,
        },
      };
    }
  }

  // 預設幾何計算
  const blockers = resolveBlockers(attackPos, opts);
  const players = buildDefensivePositions(attackPos, opts, blockers);
  const zones = buildZones(players);
  const blockShadow = buildBlockShadow(blockers, players);
  const angleDeg = opts.fanAngleOverride ?? autoFanAngle(attackPos);

  return {
    players,
    zones,
    blockShadow,
    attackFan: {
      origin: attackPos,
      leftDir: { x: 1, z: -Math.tan((angleDeg / 2) * (Math.PI / 180)) },
      rightDir: { x: 1, z: Math.tan((angleDeg / 2) * (Math.PI / 180)) },
      angleDeg,
    },
  };
}
