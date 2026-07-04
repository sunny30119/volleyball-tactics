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
// 設計（教練確認）：
//  - 3 人接發：OH1、OH2、L 三人成後場接發弧線。
//    分左/中/右分擔，中間偏後那名接主要區。
//  - 前排攔中（前排那名 MB）站網前攻擊準備位。
//  - 舉對 OP：前排→網前右；後排→後排右（準備後排攻擊）。
//  - 舉球員 S：前排→網前偏右舉球位；後排→合法接發站位（插上路徑另給）。
//
// 所有站位須符合重疊規則（見 getLegalZones）：
//   前後排：x(P1)>x(P2)、x(P6)>x(P3)、x(P5)>x(P4)
//   前排左右：z(P4)<z(P3)<z(P2)
//   後排左右：z(P5)<z(P6)<z(P1)
// ------------------------------------------------------------

export interface ReceiveSpot {
  positionNo: PositionNo;
  role: Role;         // 場上實際角色（L 已替換）
  pos: Vec2;
  isPasser: boolean;  // 是否為三名接發員之一
}

// 接發站位設計原則：
//   重疊規則約束的是「號位」（固定場地槽位），不是角色。
//   因此我方六人先各自有一個「依號位」的基準站位，天然滿足：
//     前後排：x(P1)>x(P2)、x(P6)>x(P3)、x(P5)>x(P4)
//     前排：z(P4)<z(P3)<z(P2)；後排：z(P5)<z(P6)<z(P1)
//   再依角色微調 x（前排網前準備、後排接發弧線/準備位），
//   但保持每一排的 z 相對次序不變，確保不違反重疊規則。
//
// 每個號位的基準 z（左→右遞增，前後排各自成序）：
const BASE_Z: Record<PositionNo, number> = {
  4: 2.3, 3: 4.5, 2: 6.7, // 前排 左→右
  5: 2.3, 6: 4.5, 1: 6.7, // 後排 左→右
};

/**
 * 取得該輪轉六人接發球站位座標。
 * z 由號位決定（滿足左右重疊規則），x 由角色功能決定
 * （前排靠網、後排靠後），並確保前後排 x 約束成立。
 */
export function getReceiveFormation(rotation: Rotation): ReceiveSpot[] {
  const lineup = getLineup(rotation);
  const setterPos = getSetterPosition(rotation);
  const setterFront = isFrontRow(setterPos);

  const isPasserRole = (role: Role) =>
    role === 'OH1' || role === 'OH2' || role === 'L';

  const result: ReceiveSpot[] = lineup.map(entry => {
    const { positionNo, role } = entry;
    const front = isFrontRow(positionNo);
    const z = BASE_Z[positionNo];
    let x: number;

    if (isPasserRole(role)) {
      // 接發員：站接發弧線。前排接發員稍前（x≈5.4），後排接發員靠後（x≈6.6）。
      x = front ? 5.4 : 6.6;
    } else if (role === 'S') {
      if (setterFront) {
        x = 1.1; // 前排舉球位（靠網）
      } else {
        // 後排舉球員：合法接發站位（插上起點），x 靠後
        x = 6.8;
      }
    } else if (role === 'MB1' || role === 'MB2') {
      // 前排攔中（後排攔中已換 L）：網前攻擊準備位
      x = 1.3;
    } else if (role === 'OP') {
      // 舉對：前排靠網、後排靠後（準備後排攻擊）
      x = front ? 1.3 : 6.8;
    } else {
      x = front ? 1.3 : 6.6;
    }

    const pos: Vec2 =
      role === 'S' && !setterFront
        ? setterBackStandPos(positionNo) // 後排舉球員用專屬插上起點座標
        : { x, z };

    return { positionNo, role, pos, isPasser: isPasserRole(role) };
  });

  return result;
}

/**
 * 舉球員後排合法接發站位（插上起點）。
 * x 靠後（7.0），z 沿用該後排號位的基準 z，確保後排 z 次序 P5<P6<P1 不被破壞。
 */
function setterBackStandPos(positionNo: PositionNo): Vec2 {
  return { x: 7.0, z: BASE_Z[positionNo] };
}

// ------------------------------------------------------------
// 合法站位範圍框（發球瞬間重疊規則）
// ------------------------------------------------------------

export interface LegalZone {
  positionNo: PositionNo;
  min: Vec2;
  max: Vec2;
}

const COURT_MIN = 0.3;
const COURT_MAX = 8.7;

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

/** 網前 2-3 號位之間的插上目標（右前，舉球位） */
const SETTER_TARGET: Vec2 = { x: 1.0, z: 6.0 };

/**
 * 舉球員插上路徑：
 *   S 在後排 → 從其合法接發站位插上到網前 2-3 號位間（右前）。
 *   S 在前排 → null（前排站定舉球位，無需插上）。
 */
export function getSetterPath(rotation: Rotation): SetterPath | null {
  const setterPos = getSetterPosition(rotation);
  if (isFrontRow(setterPos)) return null;
  return {
    from: setterBackStandPos(setterPos),
    to: { ...SETTER_TARGET },
  };
}
