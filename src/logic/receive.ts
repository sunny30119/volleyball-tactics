import type { Role, Vec2 } from '../types';

// ============================================================
// receive.ts — 接發球站位（六輪轉）核心純函式
//
// 座標系統（同功能一）：
//   網子 x=0，我方底線 x=9（x 大＝較後）
//   z=0 左邊線，z=9 右邊線
//
// 號位對應場地位置（固定不變，球員在號位間輪轉）：
//   P1 右後、P2 右前、P3 中前、P4 左前、P5 左後、P6 中後
//   前排＝P2,P3,P4；後排＝P1,P5,P6
//
// 角色：S 舉球、OH1/OH2 主攻、MB1/MB2 攔中、OP 輔舉、L 自由球員
// ============================================================

export type PositionNo = 1 | 2 | 3 | 4 | 5 | 6;
export type Rotation = 1 | 2 | 3 | 4 | 5 | 6;

/** 前排號位 */
export const FRONT_ROW: PositionNo[] = [2, 3, 4];
/** 後排號位 */
export const BACK_ROW: PositionNo[] = [1, 5, 6];

export function isFrontRow(positionNo: PositionNo): boolean {
  return positionNo === 2 || positionNo === 3 || positionNo === 4;
}

// ------------------------------------------------------------
// 六輪轉角色表
// R1 為基準（教練指定）。標準順時針輪轉規則：
//   下一輪＝每個角色所在號位 P → P-1（P1→P6）。
// 亦即輪轉 r 時，號位 p 的角色 = R1 中號位 ((p-1 + (r-1)) mod 6)+1 的角色。
// ------------------------------------------------------------

/** R1 基準：每個號位的角色（教練指定） */
const R1: Record<PositionNo, Role> = {
  1: 'S',
  2: 'OH1',
  3: 'MB1',
  4: 'OP',
  5: 'OH2',
  6: 'MB2',
};

/** 由 R1 依順時針輪轉規則生成完整六輪轉角色表 */
function buildRoleTable(): Record<Rotation, Record<PositionNo, Role>> {
  const table = {} as Record<Rotation, Record<PositionNo, Role>>;
  for (let r = 1 as Rotation; r <= 6; r++) {
    const roundMap = {} as Record<PositionNo, Role>;
    for (let p = 1 as PositionNo; p <= 6; p++) {
      // 輪轉 r 的號位 p ← R1 中號位 shift 後的角色
      const src = (((p - 1 + (r - 1)) % 6) + 1) as PositionNo;
      roundMap[p] = R1[src];
    }
    table[r] = roundMap;
    // ts loop counters
    if (r === 6) break;
  }
  return table;
}

/** 六輪轉角色表：ROLE_BY_ROTATION[rotation][positionNo] = Role */
export const ROLE_BY_ROTATION: Record<Rotation, Record<PositionNo, Role>> = buildRoleTable();

// ------------------------------------------------------------
// 陣容（含自由球員替換）
// ------------------------------------------------------------

export interface LineupEntry {
  positionNo: PositionNo;
  role: Role;         // 場上實際角色（後排攔中已被 L 取代）
  baseRole: Role;     // 該號位在此輪轉的原始角色（未替換前）
  isFrontRow: boolean;
  onCourt: boolean;   // 一律 true（六人皆上場，只是攔中換成 L）
}

/**
 * 取得該輪轉六人陣容。
 * 自由球員 L 固定替換「當前在後排的那名攔中」。
 * （MB1、MB2 中恰有一個在後排，換成 L）
 */
export function getLineup(rotation: Rotation): LineupEntry[] {
  const roleMap = ROLE_BY_ROTATION[rotation];

  // 找出後排（P1/P5/P6）中的攔中號位
  const backMbPos = BACK_ROW.find(
    p => roleMap[p] === 'MB1' || roleMap[p] === 'MB2',
  );

  const entries: LineupEntry[] = [];
  for (let p = 1 as PositionNo; p <= 6; p++) {
    const baseRole = roleMap[p];
    const role: Role = p === backMbPos ? 'L' : baseRole;
    entries.push({
      positionNo: p,
      role,
      baseRole,
      isFrontRow: isFrontRow(p),
      onCourt: true,
    });
    if (p === 6) break;
  }
  return entries;
}

/** 該輪轉舉球員 S 所在號位 */
export function getSetterPosition(rotation: Rotation): PositionNo {
  const roleMap = ROLE_BY_ROTATION[rotation];
  for (let p = 1 as PositionNo; p <= 6; p++) {
    if (roleMap[p] === 'S') return p;
    if (p === 6) break;
  }
  return 1;
}

/** 舉球員在前排時所在號位是否為前排 */
export function isSetterFront(rotation: Rotation): boolean {
  return isFrontRow(getSetterPosition(rotation));
}

// ------------------------------------------------------------
// 接發球站位座標
//
// 設計原則（教練 2026-07 更新）：以「舉球員與前排攔中手能最快到達
// 其攻擊組織站位」為第一原則重新佈局：
//
//  - 舉球員 S：目標最短距離插上到「網前偏右的舉球定位」(≈x1.0,z6.0)。
//     · S 在前排 → 直接站舉球定位（網前偏右，靠 2 號位），不接發、不擋路線。
//     · S 在後排 → 站「符合重疊規則的合法站位中，最靠近網前舉球定位那一點」
//       （靠右、盡量靠前的合法位置），使插上跑動最短；插上路徑 from 用此站位。
//  - 前排攔中（前排那名 MB）：站網前中央附近 (≈x0.8,z4.5)，貼網不接發，
//    方便立刻助跑打中間快攻。
//  - 三名接發員（OH1、OH2、L）：承擔全部接發，佈成後場接發弧線；
//    S 與前排 MB 讓開後，接發員把左/中/右涵蓋完整（中間偏後那名接主要區）。
//  - 舉對 OP：站右側（前排→網前右準備右側/舉對攻擊；後排→後排右準備後排攻擊），
//    不接發、不擋接發員。
//
// 所有站位仍須符合重疊規則（見 getLegalZones）：
//   前後排：x(P1)>x(P2)、x(P6)>x(P3)、x(P5)>x(P4)
//   前排左右：z(P4)<z(P3)<z(P2)
//   後排左右：z(P5)<z(P6)<z(P1)
//
// 為同時滿足「角色功能位置」與「依號位的重疊規則」，作法是：
//   1. 先給每個號位一個天然合序的基準 z（左→右遞增，前後排各自成序）。
//   2. x 依角色功能決定（網前 / 後場 / 插上起點）。
//   3. 最後對每一排的 z 做嚴格遞增夾制（保持 z 次序），
//      對每組前後排 pair 做 x 夾制（保證前排 x < 後排 x），
//      確保任何角色安排下重疊規則都成立、且每點落在自身合法框內。
// ------------------------------------------------------------

export interface ReceiveSpot {
  positionNo: PositionNo;
  role: Role;         // 場上實際角色（L 已替換）
  pos: Vec2;
  isPasser: boolean;  // 是否為三名接發員之一
}

/** 我方半場站位邊界（發球瞬間合法範圍） */
const COURT_MIN = 0.3;
const COURT_MAX = 8.7;

/** 網前偏右的舉球定位（右前 2 號位附近，插上目標） */
const SETTER_TARGET: Vec2 = { x: 1.0, z: 6.0 };
/** 前排攔中網前中央站位 */
const MB_NET_CENTER: Vec2 = { x: 0.8, z: 4.5 };

// 每個號位的基準 z（左→右遞增，前後排各自成序）：
const BASE_Z: Record<PositionNo, number> = {
  4: 2.3, 3: 4.5, 2: 6.7, // 前排 左→右
  5: 2.3, 6: 4.5, 1: 6.7, // 後排 左→右
};

/** 前後排 pair：前排號位 → 對應後排號位（x 約束用） */
const FRONT_TO_BACK: Record<PositionNo, PositionNo> = { 2: 1, 3: 6, 4: 5, 1: 2, 6: 3, 5: 4 };

const isPasserRole = (role: Role) =>
  role === 'OH1' || role === 'OH2' || role === 'L';

/**
 * 舉球員在後排時的合法接發站位（插上起點）。
 * 取「盡量靠前」的後排合法點，使插上到網前舉球定位跑動最短。
 * x 用 4.6（後排中能合法貼前的位置：仍須 > 前排 x，夾制階段保證），
 * z 沿用該後排號位基準 z（維持後排 z 次序 P5<P6<P1）。
 */
function setterBackStandPos(positionNo: PositionNo): Vec2 {
  return { x: 4.6, z: BASE_Z[positionNo] };
}

/**
 * 取得該輪轉六人接發球站位座標（原始，尚未夾制）。
 */
/**
 * 三名接發員固定的「接發三角」槽位（左 / 中 / 右）。
 * 橫向平均分布覆蓋後場寬度：左 z≈2.2、中 z≈4.5、右 z≈6.8；
 * 深度交錯（中間那名略深）→ 三點不共線、兩兩橫向間距 ≥ 約 2.3m。
 * x 皆在後場（接發起始位置），足以讓前排 MB/S 讓開網前。
 */
const PASSER_SLOTS: { x: number; z: number }[] = [
  { x: 6.3, z: 2.1 }, // 左
  { x: 7.3, z: 5.0 }, // 中（略深）
  { x: 6.3, z: 7.3 }, // 右
];

function rawFormation(rotation: Rotation): ReceiveSpot[] {
  const lineup = getLineup(rotation);
  const setterPos = getSetterPosition(rotation);
  const setterFront = isFrontRow(setterPos);

  // 三名接發員（OH1/OH2/L）：依其號位的基準 z 由小到大排序，
  // 分別配到左/中/右三角槽位，使「接發佈局座標」始終左中右分散、不共線，
  // 且相對 z 次序與號位一致（維持重疊規則）。
  const passerPositions = lineup
    .filter(e => isPasserRole(e.role))
    .map(e => e.positionNo)
    .sort((a, b) => BASE_Z[a] - BASE_Z[b]);
  const passerSlotByPos = new Map<PositionNo, { x: number; z: number }>();
  passerPositions.forEach((p, i) => passerSlotByPos.set(p, PASSER_SLOTS[i]));

  return lineup.map(entry => {
    const { positionNo, role } = entry;
    const front = isFrontRow(positionNo);
    const z = BASE_Z[positionNo];
    let pos: Vec2;

    if (isPasserRole(role)) {
      // 接發員：z 用固定接發三角槽位（左/中/右），始終橫向分散、不共線。
      // x：後排接發員站深接主要區；前排號位的接發員站中前場，讓身後的後排舉球員能貼前插上。
      const slot = passerSlotByPos.get(positionNo)!;
      pos = { x: front ? 4.2 : slot.x, z: slot.z };
    } else if (role === 'S') {
      // 舉球員：前排直接站舉球定位；後排站最靠網前的合法接發起點。
      pos = setterFront ? { ...SETTER_TARGET } : setterBackStandPos(positionNo);
    } else if (role === 'MB1' || role === 'MB2') {
      // 前排攔中：網前中央（貼網打快攻）。z 用號位基準確保與其他前排合序。
      pos = { x: MB_NET_CENTER.x, z };
    } else if (role === 'OP') {
      // 舉對：右側。前排靠網、後排靠後。
      pos = { x: front ? 1.2 : 6.9, z };
    } else {
      pos = { x: front ? 1.3 : 6.6, z };
    }

    return { positionNo, role, pos, isPasser: isPasserRole(role) };
  });
}

/**
 * 對原始佈局做重疊規則夾制：
 *  - 每一排 z 嚴格遞增（左→右保序）。
 *  - 每組前後排 pair 保證前排 x 明顯小於後排 x（前排靠網）。
 * 夾制量微小，不破壞角色功能位置的意圖。
 */
export function getReceiveFormation(rotation: Rotation): ReceiveSpot[] {
  const spots = rawFormation(rotation);
  const byPos = new Map<PositionNo, ReceiveSpot>();
  spots.forEach(s => byPos.set(s.positionNo, s));

  const GAP_Z = 0.6;   // 同排相鄰 z 最小差
  const GAP_X = 0.8;   // 前後排 x 最小差

  // --- z 嚴格遞增（前排 P4<P3<P2、後排 P5<P6<P1）---
  const enforceZ = (order: PositionNo[]) => {
    for (let i = 1; i < order.length; i++) {
      const prev = byPos.get(order[i - 1])!;
      const cur = byPos.get(order[i])!;
      if (cur.pos.z < prev.pos.z + GAP_Z) {
        cur.pos = { ...cur.pos, z: prev.pos.z + GAP_Z };
      }
    }
  };
  enforceZ([4, 3, 2]);
  enforceZ([5, 6, 1]);

  // --- 前後排 x 約束：後排 x 至少比前排 x 多 GAP_X ---
  for (const frontP of FRONT_ROW) {
    const backP = FRONT_TO_BACK[frontP];
    const f = byPos.get(frontP)!;
    const b = byPos.get(backP)!;
    if (b.pos.x < f.pos.x + GAP_X) {
      b.pos = { ...b.pos, x: f.pos.x + GAP_X };
    }
  }

  // --- 後排舉球員貼前：把 S 拉到「其前排搭檔之後 GAP_X」的最靠網合法點，
  //     使插上到網前舉球定位跑動最短（尤其前排搭檔是貼網 MB 時能大幅前壓）---
  const setterPos = getSetterPosition(rotation);
  if (!isFrontRow(setterPos)) {
    const s = byPos.get(setterPos)!;
    // setterPos 是後排號位，用反查找其前排搭檔
    const frontOfSetter = (Object.keys(FRONT_TO_BACK) as unknown as PositionNo[])
      .map(k => Number(k) as PositionNo)
      .find(fp => FRONT_TO_BACK[fp] === setterPos)!;
    const f = byPos.get(frontOfSetter)!;
    const forwardX = f.pos.x + GAP_X;
    if (forwardX < s.pos.x) {
      s.pos = { ...s.pos, x: forwardX };
    }
  }

  // --- 夾回我方半場 ---
  for (const s of spots) {
    s.pos = {
      x: Math.min(Math.max(s.pos.x, COURT_MIN), COURT_MAX),
      z: Math.min(Math.max(s.pos.z, COURT_MIN), COURT_MAX),
    };
  }

  return spots;
}

// ------------------------------------------------------------
// 合法站位範圍框（發球瞬間重疊規則）
// ------------------------------------------------------------

export interface LegalZone {
  positionNo: PositionNo;
  min: Vec2;
  max: Vec2;
}

/**
 * 每名球員發球瞬間的合法站位矩形。
 * 以該輪轉接發站位當參考點，用相鄰球員位置夾出可行矩形：
 *   前後排：後排 x 必須 > 對應前排 x（P1>P2、P6>P3、P5>P4）
 *   左右（前排）：z(P4)<z(P3)<z(P2)
 *   左右（後排）：z(P5)<z(P6)<z(P1)
 */
export function getLegalZones(rotation: Rotation): LegalZone[] {
  const formation = getReceiveFormation(rotation);
  const posOf = new Map<PositionNo, Vec2>();
  formation.forEach(s => posOf.set(s.positionNo, s.pos));

  const midX = (a: PositionNo, b: PositionNo) =>
    (posOf.get(a)!.x + posOf.get(b)!.x) / 2;
  const midZ = (a: PositionNo, b: PositionNo) =>
    (posOf.get(a)!.z + posOf.get(b)!.z) / 2;

  const zones: LegalZone[] = [];

  // --- 前排 x 上界：前排球員必須比其對應後排球員更靠網（x 較小）---
  // 對應對：P2↔P1、P3↔P6、P4↔P5
  const frontBackPair: Record<PositionNo, PositionNo> = {
    2: 1, 3: 6, 4: 5, 1: 2, 6: 3, 5: 4,
  };

  // --- 前排 z 排序：P4 < P3 < P2 ---
  // P4 z 上界 = mid(P4,P3)；P3 z 下界 = mid(P4,P3)，z 上界 = mid(P3,P2)；P2 z 下界 = mid(P3,P2)
  // --- 後排 z 排序：P5 < P6 < P1 ---

  for (const p of [1, 2, 3, 4, 5, 6] as PositionNo[]) {
    let minX = COURT_MIN;
    let maxX = COURT_MAX;
    let minZ = COURT_MIN;
    let maxZ = COURT_MAX;

    const front = isFrontRow(p);
    const pairX = midX(p, frontBackPair[p]); // 前後排分界 x

    if (front) {
      // 前排：x 上界為與後排搭檔的中點（不可比後排更後）
      maxX = pairX;
    } else {
      // 後排：x 下界為與前排搭檔的中點（不可比前排更前）
      minX = pairX;
    }

    // 左右 z 界
    if (front) {
      if (p === 4) {
        maxZ = midZ(4, 3);
      } else if (p === 3) {
        minZ = midZ(4, 3);
        maxZ = midZ(3, 2);
      } else if (p === 2) {
        minZ = midZ(3, 2);
      }
    } else {
      if (p === 5) {
        maxZ = midZ(5, 6);
      } else if (p === 6) {
        minZ = midZ(5, 6);
        maxZ = midZ(6, 1);
      } else if (p === 1) {
        minZ = midZ(6, 1);
      }
    }

    zones.push({ positionNo: p, min: { x: minX, z: minZ }, max: { x: maxX, z: maxZ } });
  }

  return zones;
}

// ------------------------------------------------------------
// 舉球員插上路徑
// ------------------------------------------------------------

export interface SetterPath {
  from: Vec2;
  to: Vec2;
}

/**
 * 舉球員插上路徑：
 *   S 在後排 → 從其實際接發站位（夾制後）插上到網前舉球定位（右前）。
 *   S 在前排 → null（前排站定舉球定位，無需插上）。
 */
export function getSetterPath(rotation: Rotation): SetterPath | null {
  const setterPos = getSetterPosition(rotation);
  if (isFrontRow(setterPos)) return null;
  // from 用夾制後的實際站位，讓箭頭起點與球員一致
  const spot = getReceiveFormation(rotation).find(s => s.positionNo === setterPos)!;
  return {
    from: { ...spot.pos },
    to: { ...SETTER_TARGET },
  };
}
