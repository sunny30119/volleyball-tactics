import type {
  Vec2,
  DefenseOptions,
  DefenseResult,
  CustomScenario,
  PlayerState,
  ZonePolygon,
} from '../types';
import {
  dist,
  lerpVec,
  normalize,
  rotateVec,
  clampToCourt,
  convexHull,
  pointInPolygon,
  sampleCourtGrid,
} from './geometry';

// ============================================================
// 防守計算純函式 — 完整實作
// 座標系統：我方半場 x∈[0,9]，z∈[0,9]，網 x=0，底線 x=9
// 對方半場 x∈[-9,0]
// ============================================================

// ----- 標準防守站位（代表性攻擊點） -------------------------
// 以下定義 5 個代表性攻擊點下的六人標準站位：
// oppPos4  = 對方 4 號位攻擊（z=7.5，近網）
// oppPos3  = 對方 3 號位快攻（z=4.5，近網）
// oppPos2  = 對方 2 號位攻擊（z=1.5，近網）
// oppPos1B = 對方 1 號位後排（z=7.5，後排）
// oppPos6B = 對方 6 號位後排（z=4.5，後排）
//
// 每個站位 [id1,id2,id3,id4,id5,id6] 索引對應球員 1–6 號位

type SixPos = [Vec2, Vec2, Vec2, Vec2, Vec2, Vec2];

/** 邊線防守（perimeter）代表性站位表 */
const PERIMETER_PRESETS: Record<string, SixPos> = {
  // 對方 4 號位攻擊：我方 2、3 攔網；右側拉開
  // 非攔網分工：4 守左前短球/吊球（貼 3m 線、偏左邊線）；5 前壓但 z 拉到中偏左守斜線深區；
  //             1 守右後直線；6 守中後。四人彼此 z 錯開避免重疊。
  opp4: [
    { x: 7.5, z: 7.5 }, // 1 右後—靠右邊線
    { x: 0.4, z: 7.5 }, // 2 攔網（主）對齊攻擊點 z
    { x: 0.4, z: 6.0 }, // 3 攔網（補）稍偏中
    { x: 3.0, z: 1.3 }, // 4 左前吊球區—貼 3m 線、偏左邊線
    { x: 7.5, z: 3.4 }, // 5 左後斜線深區—z 拉到中偏左（前壓後與 4 明顯分開）
    { x: 7.5, z: 5.5 }, // 6 中後底線（偏右，讓開 5 號）
  ],
  // 對方 3 號位快攻（single）：我方 3 號位攔網
  // 非攔網 1/2/4/5/6 分守：4 左前吊球（貼 3m 線偏左）、5 左後前壓（z 拉到中偏左）、
  // 2 右前吊球、1 右後、6 中後。彼此 z 錯開。
  opp3s: [
    { x: 7.5, z: 7.5 }, // 1 右後
    { x: 3.5, z: 6.5 }, // 2 右前吊球區
    { x: 0.4, z: 4.5 }, // 3 攔網
    { x: 3.0, z: 1.5 }, // 4 左前吊球區—貼 3m 線偏左
    { x: 7.5, z: 3.2 }, // 5 左後前壓—z 拉到中偏左（與 4 分開）
    { x: 7.5, z: 5.5 }, // 6 中後（偏右，讓開 5 號）
  ],
  // 對方 3 號位快攻（double）：我方 2、3 號位攔網
  opp3d: [
    { x: 7.5, z: 7.5 }, // 1 右後
    { x: 0.4, z: 5.5 }, // 2 攔網（補）
    { x: 0.4, z: 4.5 }, // 3 攔網（主）
    { x: 3.0, z: 1.5 }, // 4 左前吊球區—貼 3m 線偏左
    { x: 7.5, z: 3.2 }, // 5 左後前壓—z 拉到中偏左（與 4 分開）
    { x: 7.5, z: 5.8 }, // 6 中後（偏右，讓開 5 號）
  ],
  // 對方 2 號位攻擊：我方 4、3 攔網；左側拉開（對稱於 opp4）
  // 非攔網分工：2 守右前短球/吊球（z 偏右，與 opp3d 攔網 z=5.5 過渡連續）；
  //             1 前壓但 z 拉到中偏右守斜線深區（與 2 明顯分開）；
  //             5 守左後直線；6 守中後（偏左，讓開 1 號）。四人彼此 z 錯開避免重疊。
  opp2: [
    { x: 7.5, z: 7.5 }, // 1 右後斜線深區—靠右邊線（與 2 號 z 錯開）
    { x: 3.0, z: 5.5 }, // 2 右前吊球區—貼 3m 線、z 偏右（過渡連續）
    { x: 0.4, z: 3.0 }, // 3 攔網（補）
    { x: 0.4, z: 1.5 }, // 4 攔網（主）
    { x: 7.5, z: 1.5 }, // 5 左後直線
    { x: 7.5, z: 3.5 }, // 6 中後（偏左，讓開 1 號）
  ],
  // 後排 1 號位方向（右後）：blocker=2（單攔）。非攔網 1/3/4/5/6 展開全場。
  back1: [
    { x: 4.0, z: 8.0 }, // 1 右後前壓—靠右邊線
    { x: 0.4, z: 7.0 }, // 2 單攔
    { x: 3.0, z: 5.2 }, // 3 中前補位
    { x: 2.6, z: 1.5 }, // 4 左前吊球（貼 3m 線偏左）
    { x: 7.5, z: 3.5 }, // 5 左後前壓（z 中偏左）
    { x: 7.5, z: 6.2 }, // 6 中後（偏右）
  ],
  // 後排 6 號位方向（中後）：blocker=3（單攔中間）。非攔網 1/2/4/5/6 展開全場。
  back6: [
    { x: 7.5, z: 7.6 }, // 1 右後—靠右邊線
    { x: 3.0, z: 6.4 }, // 2 右前吊球
    { x: 0.4, z: 4.5 }, // 3 單攔（中間）
    { x: 2.6, z: 1.5 }, // 4 左前吊球（貼 3m 線偏左）
    { x: 7.5, z: 3.4 }, // 5 左後前壓（z 中偏左）
    { x: 4.0, z: 5.3 }, // 6 中後（偏右，讓開 5 號）
  ],
  // 後排 5 號位方向（左後）：blocker=4（單攔）。
  // 為避免與 back6 內插時球員擠向中央，各球員 z 採 back6 的「向左小幅平移」而非鏡像
  // （每個 id 的 z 次序與 back6 一致：1 最右、4 最左），確保內插不塌陷。
  back5: [
    { x: 4.0, z: 6.5 }, // 1 右後前壓（略左移）
    { x: 0.4, z: 2.0 }, // 2 單攔（左前攻擊 blocker 由 resolveBlockers 定為 4，此 z 供內插用）
    { x: 3.0, z: 4.6 }, // 3 中前補位
    { x: 2.6, z: 1.2 }, // 4 左前吊球（貼 3m 線偏左）
    { x: 7.5, z: 2.6 }, // 5 左後前壓（z 中偏左）
    { x: 7.5, z: 3.8 }, // 6 中後
  ],
};

/** 輪轉防守（rotation）代表性站位表 */
const ROTATION_PRESETS: Record<string, SixPos> = {
  // 輪轉防守：6 號前壓接吊球置於「中前偏一側」，與 4/5 的左區、1 的右區 z 明顯錯開。
  opp4: [
    { x: 4.0, z: 7.5 }, // 1 同側後排守直線（前壓 x≤4 但攔網不夾，此為非攔網）
    { x: 0.4, z: 7.5 }, // 2 攔網（主）
    { x: 0.4, z: 6.0 }, // 3 攔網（補）
    { x: 3.0, z: 1.5 }, // 4 退防—左前吊球（貼 3m 線偏左）
    { x: 6.0, z: 3.3 }, // 5 斜線守對角（z 拉到中偏左）
    { x: 3.0, z: 4.6 }, // 6 前壓接吊球（中前，x 明顯淺於前壓的 1/5，讓開 4/5）
  ],
  opp3s: [
    { x: 7.0, z: 7.5 }, // 1 右後
    { x: 3.5, z: 6.3 }, // 2 退防—右前吊球
    { x: 0.4, z: 4.5 }, // 3 攔網
    { x: 2.8, z: 1.5 }, // 4 退防—左前吊球（貼 3m 線偏左）
    { x: 7.0, z: 3.0 }, // 5 左後前壓（z 拉到中偏左）
    { x: 3.0, z: 4.6 }, // 6 前壓接吊球（中前，x 明顯淺於前壓的 1/5）
  ],
  opp3d: [
    { x: 7.0, z: 7.5 }, // 1 右後
    { x: 0.4, z: 5.5 }, // 2 攔網
    { x: 0.4, z: 4.5 }, // 3 攔網
    { x: 2.8, z: 1.5 }, // 4 退防—左前吊球（貼 3m 線偏左）
    { x: 7.0, z: 3.0 }, // 5 左後前壓（z 拉到中偏左）
    { x: 3.0, z: 4.6 }, // 6 前壓接吊球（中前，x 明顯淺於前壓的 1/5）
  ],
  opp2: [
    { x: 7.0, z: 7.5 }, // 1 斜線守對角（右後）
    { x: 2.8, z: 7.5 }, // 2 退防—右前吊球（貼 3m 線偏右，對稱 opp4 的 4 號）
    { x: 0.4, z: 3.0 }, // 3 攔網
    { x: 0.4, z: 1.5 }, // 4 攔網（主）
    { x: 6.0, z: 3.4 }, // 5 同側後排守直線（z 拉到中偏左）
    { x: 3.0, z: 4.6 }, // 6 前壓接吊球（中前，x 明顯淺於前壓的 1/5）
  ],
  back1: [
    { x: 4.0, z: 7.5 }, // 1 前壓直線（右後）
    { x: 0.4, z: 7.0 }, // 2 單攔
    { x: 3.0, z: 5.3 }, // 3 中前補位
    { x: 3.0, z: 1.5 }, // 4 左前吊球（貼 3m 線偏左）
    { x: 7.5, z: 3.2 }, // 5 左後前壓（z 拉到中偏左）
    { x: 3.2, z: 5.0 }, // 6 前壓（中前，x 明顯淺於後排）
  ],
  back6: [
    { x: 7.5, z: 7.0 }, // 1 右後
    { x: 3.0, z: 6.5 }, // 2 右前吊球
    { x: 0.4, z: 4.5 }, // 3 單攔
    { x: 3.0, z: 1.5 }, // 4 左前吊球（貼 3m 線偏左）
    { x: 7.5, z: 3.0 }, // 5 左後前壓（z 拉到中偏左）
    { x: 3.2, z: 5.0 }, // 6 前壓（中前，x 明顯淺於後排）
  ],
  // 後排 5 號位方向（左後）：blocker=4（單攔）。各 id z 為 back6 向左小幅平移（不鏡像），避免內插塌陷。
  back5: [
    { x: 4.0, z: 6.5 }, // 1 右後前壓（略左移）
    { x: 0.4, z: 2.0 }, // 2 單攔（左前攻擊 blocker 由 resolveBlockers 定為 4，此 z 供內插用）
    { x: 3.0, z: 4.6 }, // 3 中前補位
    { x: 2.6, z: 1.2 }, // 4 左前吊球（貼 3m 線偏左）
    { x: 7.5, z: 2.6 }, // 5 左後前壓（z 中偏左）
    { x: 3.2, z: 4.0 }, // 6 前壓（中前，x 明顯淺於後排）
  ],
};

// ----- 自動扇形角度 -----------------------------------------

/** 根據攻擊點自動計算扇形角度（60–90°） */
function autoFanAngle(attackPos: Vec2): number {
  const distFromCenter = Math.abs(attackPos.z - 4.5);
  const t = Math.min(distFromCenter / 4.5, 1);
  return 90 - t * 30;
}

/**
 * 計算攻擊扇形的軸線方向（攻擊點朝我方場地，靠邊線時偏向斜線）。
 * 回傳單位向量。
 */
function fanAxisDir(attackPos: Vec2): Vec2 {
  // 基本方向：從對方場地指向我方（x 增加方向）
  // 偏移量：攻擊點 z 偏離中心時，軸線稍微朝場中央偏
  const zBias = (4.5 - attackPos.z) * 0.15; // 靠右 z>4.5 時向左偏，靠左反之
  return normalize({ x: 1, z: zBias });
}

// ----- 攔網配置 ---------------------------------------------

/** 根據攻擊點決定哪些球員攔網，並計算攔網手在網前的 z 位置 */
function resolveBlockers(
  attackPos: Vec2,
  opts: DefenseOptions,
): { blockers: Set<number>; blockerZPositions: Map<number, number> } {
  const blockers = new Set<number>();
  const blockerZPositions = new Map<number, number>();

  const isBackRow = attackPos.x < -3;
  const az = attackPos.z; // 攻擊點 z

  if (isBackRow) {
    // 後排攻擊：深度漸變（-3 ~ -9 → 雙人 ~ 單人）
    const depth = Math.abs(attackPos.x); // 3~9
    const doubleThresh = 3.5; // x < -3.5 以下漸漸只留單攔
    const useDouble = depth <= doubleThresh;

    if (az > 6) {
      blockers.add(2);
      if (useDouble) blockers.add(3);
      blockerZPositions.set(2, Math.min(8.4, az));
      if (useDouble) blockerZPositions.set(3, Math.min(8.4, az - 0.9));
    } else if (az < 3) {
      blockers.add(4);
      if (useDouble) blockers.add(3);
      blockerZPositions.set(4, Math.max(0.6, az));
      if (useDouble) blockerZPositions.set(3, Math.max(0.6, az + 0.9));
    } else {
      blockers.add(3);
      blockerZPositions.set(3, az);
    }
    return { blockers, blockerZPositions };
  }

  // 前排攻擊：按 z 連續平滑過渡
  if (az > 6) {
    // 對方 4 號位區域
    blockers.add(2); blockers.add(3);
    const centerZ = Math.min(8.4, az);
    blockerZPositions.set(2, centerZ);
    blockerZPositions.set(3, Math.max(0.6, centerZ - 0.9));
  } else if (az < 3) {
    // 對方 2 號位區域
    blockers.add(4); blockers.add(3);
    const centerZ = Math.max(0.6, az);
    blockerZPositions.set(4, centerZ);
    blockerZPositions.set(3, Math.min(8.4, centerZ + 0.9));
  } else {
    // 對方 3 號位中間快攻
    // 3 號位攔網，z 跟隨攻擊點
    blockers.add(3);
    blockerZPositions.set(3, Math.max(0.6, Math.min(8.4, az)));
    if (opts.middleBlockMode === 'double') {
      // 補位攔手固定為 2 號位（靠右側，排球常規）
      // 讓 2 號位連續地跟隨 3 號位右側 0.9m，避免切換攔網手造成跳躍
      blockers.add(2);
      blockerZPositions.set(2, Math.min(8.4, az + 0.9));
    }
  }
  return { blockers, blockerZPositions };
}

// ----- 攔網影子 ---------------------------------------------

/**
 * 計算攔網影子多邊形。
 * 從攻擊點出發，攔網手身體兩端向我方場地底線延伸，取凸包後裁剪到場地內。
 */
function buildBlockShadow(
  attackPos: Vec2,
  blockers: Set<number>,
  players: PlayerState[],
): Vec2[] {
  if (blockers.size === 0) return [];
  const bps = players.filter(p => blockers.has(p.id));
  if (bps.length === 0) return [];

  const halfWidth = bps.length === 1 ? 0.5 : 0.9; // 單人 1.0m, 雙人 1.8m
  const minZ = Math.min(...bps.map(p => p.pos.z)) - halfWidth;
  const maxZ = Math.max(...bps.map(p => p.pos.z)) + halfWidth;

  // 從攻擊點向兩端延伸到底線（x=9）
  const origin = attackPos;

  function extendToBaseline(targetZ: number): Vec2 {
    // 從 origin 指向 (0.4, targetZ)，沿直線延伸到 x=9
    const dx = 0.4 - origin.x; // 負值（從對方到網前）
    const dz = targetZ - origin.z;
    // 參數方程：x(t) = origin.x + dx*t, z(t) = origin.z + dz*t
    // 到 x=9: t = (9 - origin.x) / dx
    if (Math.abs(dx) < 1e-9) return { x: 9, z: origin.z + dz * 99 };
    const t = (9 - origin.x) / dx;
    const z = origin.z + dz * t;
    return { x: 9, z: Math.max(0, Math.min(9, z)) };
  }

  const farLeft = extendToBaseline(minZ);
  const farRight = extendToBaseline(maxZ);

  // 四邊形：攻擊點 → 左端 → 底線左 → 底線右 → 右端
  const poly: Vec2[] = [
    origin,
    { x: 0.4, z: minZ },
    farLeft,
    farRight,
    { x: 0.4, z: maxZ },
  ];

  // 裁剪到場地 z 範圍
  return poly.map(p => ({ x: p.x, z: Math.max(0.1, Math.min(8.9, p.z)) }));
}

// ----- 代表性站位內插 ----------------------------------------

/**
 * 根據攻擊點 z 在前排 opp4/opp3/opp2 之間內插，
 * 後排在 back1/back6/back5 之間內插。
 * 返回 SixPos（6 個球員的站位陣列，索引 0=id1 … 5=id6）
 */
function interpolatePresets(
  attackPos: Vec2,
  opts: DefenseOptions,
  _blockers: Set<number>,
  blockerZPositions: Map<number, number>,
): SixPos {
  const table = opts.system === 'perimeter' ? PERIMETER_PRESETS : ROTATION_PRESETS;
  const az = attackPos.z;
  const isBackRow = attackPos.x < -3;

  let sixPos: SixPos;

  if (!isBackRow) {
    // 前排：在 opp4(z=7.5) / opp3(z=4.5) / opp2(z=1.5) 之間插值
    const opp3Key = opts.middleBlockMode === 'double' ? 'opp3d' : 'opp3s';
    if (az >= 6) {
      // opp3 -> opp4
      const t = Math.min((az - 6) / (7.5 - 6), 1);
      sixPos = interpolateSixPos(table[opp3Key], table['opp4'], t);
    } else if (az >= 3) {
      // opp3 -> opp4 (3~6 之間，用 opp2->opp3 反方向，夾值防止外插)
      const t = Math.max(0, Math.min(1, (az - 3) / (6 - 3)));
      sixPos = interpolateSixPos(table['opp2'], table[opp3Key], t);
    } else {
      // opp2 zone (z < 3)
      const t = Math.max(0, Math.min(1, az / 3));
      sixPos = interpolateSixPos(table['opp2'], table[opp3Key], t);
    }
  } else {
    // 後排：在 back1(z=7.5) / back6(z=4.5) / 對稱左側 之間
    if (az >= 4.5) {
      const t = Math.min((az - 4.5) / 3, 1);
      sixPos = interpolateSixPos(table['back6'], table['back1'], t);
    } else {
      const t = Math.min((4.5 - az) / 3, 1);
      // 左側：用專門設計的 back5（左後攻擊）而非鏡像 back1，避免內插時球員擠向中央
      sixPos = interpolateSixPos(table['back6'], table['back5'], t);
    }
  }

  // 套用攔網手精確 z 位置
  for (const [id, bz] of blockerZPositions) {
    const idx = id - 1;
    sixPos[idx] = { x: 0.4, z: bz };
  }

  return sixPos;
}

function interpolateSixPos(a: SixPos, b: SixPos, t: number): SixPos {
  return a.map((p, i) => lerpVec(p, b[i], t)) as SixPos;
}

// ----- 建立球員物件 -----------------------------------------

// 教練指定陣型：1=舉球、2=主攻、3=攔中、4=舉對（輔舉）、5=主攻、6=攔中（後排由自由球員替換）
const DEFAULT_ROLES: PlayerState['role'][] = ['S', 'OH1', 'MB1', 'OP', 'OH2', 'MB2'];

function buildPlayers(
  sixPos: SixPos,
  blockers: Set<number>,
  liberoId: number,
): PlayerState[] {
  return [1, 2, 3, 4, 5, 6].map((id, idx) => {
    const clamped = blockers.has(id)
      ? { x: 0.4, z: Math.max(0.3, Math.min(8.7, sixPos[idx].z)) }
      : clampToCourt(sixPos[idx]);
    return {
      id,
      role: id === liberoId ? 'L' : DEFAULT_ROLES[idx],
      pos: clamped,
      isBlocking: blockers.has(id),
    };
  });
}

// ----- 防守點偏出影子修正 ------------------------------------

/**
 * 若防守球員落在攔網影子多邊形內，沿扇形方向外移至影子外。
 */
function shiftOutOfShadow(
  players: PlayerState[],
  shadow: Vec2[],
  axisDir: Vec2,
): PlayerState[] {
  if (shadow.length < 3) return players;
  return players.map(p => {
    if (p.isBlocking) return p;
    if (!pointInPolygon(p.pos, shadow)) return p;
    // 嘗試沿垂直扇形軸方向移出（左右各試一次）
    const perp: Vec2 = { x: -axisDir.z, z: axisDir.x };
    for (const sign of [1, -1]) {
      let pos = p.pos;
      for (let step = 0.5; step <= 3.0; step += 0.5) {
        pos = clampToCourt({
          x: p.pos.x + axisDir.x * step * 0.3,
          z: p.pos.z + perp.z * sign * step,
        });
        if (!pointInPolygon(pos, shadow)) {
          return { ...p, pos };
        }
      }
    }
    return p;
  });
}

// ----- 非攔網球員最小間距分離 --------------------------------

/**
 * 保證任兩名「非攔網」我方球員間距 ≥ MIN_SEP。
 *
 * 為避免迭代式鬆弛法在多人擠成一線時來回震盪（造成攻擊點連續移動時佔位跳動），
 * 採「確定性、順序穩定」的單向推法：
 *  - 非攔網球員固定依 (z, 然後 id) 排序。
 *  - 由 z 小到大掃描，只把「後一名」沿 +z 推到與前一名至少 MIN_SEP。
 *  - 只動 z（不動 x → 1/5 前壓 x≤4 不受影響），最後夾回場地。
 * 因為排序與推向都固定，攻擊點微幅變動時結果連續、無震盪。
 */
const MIN_SEP = 2.1; // 目標間距（測試斷言用 2.0，留少量餘裕以降低邊界推擠、維持連續）

function separateDefenders(players: PlayerState[]): PlayerState[] {
  const out = players.map(p => ({ ...p, pos: { ...p.pos } }));
  const nb = out.filter(p => !p.isBlocking);
  if (nb.length < 2) return out;

  // 依 (z, id) 穩定排序後，以「原 z 質心」為中心累積展開，保序、置中。
  // 每 frame 都套用相同的確定性展開（在排序次序穩定時對輸入連續），
  // 使佈局良好處幾乎不動、過近處平滑拉開。
  // 相鄰 z 間距 = max(由 dx 換算的需求, 地板 FLOOR)；地板確保被大 dx 鄰居隔開的
  // 兩名同 x 球員（相隔一名）也拉開：2×FLOOR ≥ MIN_SEP。
  nb.sort((a, b) => (a.pos.z - b.pos.z) || (a.id - b.id));

  const FLOOR = MIN_SEP * 0.6;
  const gaps: number[] = [];
  for (let i = 1; i < nb.length; i++) {
    const dx = nb[i].pos.x - nb[i - 1].pos.x;
    const needZ = Math.sqrt(Math.max(0, MIN_SEP * MIN_SEP - dx * dx));
    gaps.push(Math.max(needZ, FLOOR) + 0.02);
  }
  const totalGap = gaps.reduce((a, b) => a + b, 0);

  const zs = nb.map(p => p.pos.z);
  const centroid = zs.reduce((a, b) => a + b, 0) / nb.length;

  const cum: number[] = [0];
  for (let i = 0; i < gaps.length; i++) cum.push(cum[i] + gaps[i]);
  const cumMean = cum.reduce((a, b) => a + b, 0) / cum.length;

  const LO = 0.3, HI = 8.7;
  let base: number;
  if (totalGap >= HI - LO) {
    base = LO;
  } else {
    base = centroid - cumMean;
    if (base < LO) base = LO;
    if (base + totalGap > HI) base = HI - totalGap;
  }

  for (let i = 0; i < nb.length; i++) {
    nb[i].pos = clampToCourt({ x: nb[i].pos.x, z: base + cum[i] });
  }
  return out;
}

// ----- Voronoi 式責任區塊 ------------------------------------

/**
 * 建立六名球員的責任區塊多邊形（Voronoi 近似）。
 * 非攔網球員分割我方場地，攔網手分配網前小區域。
 */
function buildZones(
  players: PlayerState[],
  shadow: Vec2[],
): ZonePolygon[] {
  const gridPts = sampleCourtGrid(0.5);
  const defenders = players.filter(p => !p.isBlocking);
  const blockers = players.filter(p => p.isBlocking);

  // 網格點分配
  const buckets = new Map<number, Vec2[]>();
  players.forEach(p => buckets.set(p.id, []));

  for (const pt of gridPts) {
    // 影子內的點不分配給防守球員（留給攔網手）
    const inShadow = shadow.length >= 3 && pointInPolygon(pt, shadow);
    if (inShadow) {
      // 分配給最近的攔網手（若有）
      if (blockers.length > 0) {
        const closest = minByDist(blockers, pt);
        buckets.get(closest.id)!.push(pt);
      }
      continue;
    }
    if (defenders.length === 0) continue;
    const closest = minByDist(defenders, pt);
    buckets.get(closest.id)!.push(pt);
  }

  // 攔網手額外補充網前條帶
  for (const bp of blockers) {
    const netPts: Vec2[] = [];
    for (let z = 0.5; z <= 8.5; z += 0.5) {
      netPts.push({ x: 0.3, z });
      netPts.push({ x: 1.5, z });
    }
    const own = buckets.get(bp.id)!;
    buckets.set(bp.id, [...own, ...netPts]);
  }

  return players.map(p => {
    const pts = buckets.get(p.id) ?? [];
    if (pts.length < 3) {
      // 回退：以球員為中心的小正方形
      const c = p.pos;
      return {
        playerId: p.id,
        points: [
          { x: c.x - 0.8, z: c.z - 0.8 },
          { x: c.x + 0.8, z: c.z - 0.8 },
          { x: c.x + 0.8, z: c.z + 0.8 },
          { x: c.x - 0.8, z: c.z + 0.8 },
        ],
      };
    }
    return { playerId: p.id, points: convexHull(pts) };
  });
}

function minByDist(ps: PlayerState[], pt: Vec2): PlayerState {
  return ps.reduce((best, p) =>
    dist(p.pos, pt) < dist(best.pos, pt) ? p : best,
  );
}

// ----- 自訂情境 IDW 內插 ------------------------------------

/**
 * 多情境反距離加權（IDW）內插球員站位。
 * 回傳混合後的 PlayerState[]。
 */
function idwBlendPlayers(
  scenarios: CustomScenario[],
  attackPos: Vec2,
): PlayerState[] {
  const EPSILON = 1e-6;
  const weights = scenarios.map(s => {
    const d = dist(s.attackPos, attackPos);
    return d < EPSILON ? 1 / EPSILON : 1 / d;
  });
  const sumW = weights.reduce((a, b) => a + b, 0);
  const norm = weights.map(w => w / sumW);

  // 以第一個情境的角色/isBlocking 為模板
  const template = scenarios[0].players;
  return template.map(tp => {
    const blended = scenarios.reduce<Vec2>(
      (acc, s, i) => {
        const sp = s.players.find(p => p.id === tp.id);
        if (!sp) return acc;
        return { x: acc.x + sp.pos.x * norm[i], z: acc.z + sp.pos.z * norm[i] };
      },
      { x: 0, z: 0 },
    );
    return { ...tp, pos: blended };
  });
}

// ----- 攻擊扇形 ---------------------------------------------

function buildAttackFan(
  attackPos: Vec2,
  angleDeg: number,
): DefenseResult['attackFan'] {
  const axis = fanAxisDir(attackPos);
  const half = angleDeg / 2;
  return {
    origin: attackPos,
    leftDir: normalize(rotateVec(axis, -half)),
    rightDir: normalize(rotateVec(axis, half)),
    angleDeg,
  };
}

// ----- 情境快照輔助 ------------------------------------------

/**
 * 依指定球員佔位重算責任區塊與攔網影子。
 * 用途：
 * - 教練手動拖曳球員後，store.recompute 需用覆蓋後的佔位即時重算 zones
 * - 「儲存為情境」時 zones 需與最終佔位一致
 */
export function computeManualOverlays(
  attackPos: Vec2,
  players: PlayerState[],
): { zones: ZonePolygon[]; blockShadow: Vec2[] } {
  const blockers = new Set(players.filter(p => p.isBlocking).map(p => p.id));
  const shadow = buildBlockShadow(attackPos, blockers, players);
  return { zones: buildZones(players, shadow), blockShadow: shadow };
}

/** 為「儲存為情境」計算指定球員佔位下的責任區塊 */
export function computeScenarioZones(
  attackPos: Vec2,
  players: PlayerState[],
): ZonePolygon[] {
  return computeManualOverlays(attackPos, players).zones;
}

// ============================================================
// 主函式
// ============================================================

/**
 * 計算防守佔位（純函式，無副作用）
 * @param attackPos 攻擊手位置（對方半場 x∈[-9, 0]）
 * @param opts 防守選項
 * @param customScenarios 使用者自訂情境
 */
export function computeDefense(
  attackPos: Vec2,
  opts: DefenseOptions,
  customScenarios: CustomScenario[],
): DefenseResult {
  const angleDeg = opts.fanAngleOverride ?? autoFanAngle(attackPos);
  const attackFan = buildAttackFan(attackPos, angleDeg);
  const axisDir = fanAxisDir(attackPos);

  // --- 自訂情境查詢 ---
  const BLEND_RADIUS = 4; // 公尺
  const sameSystem = customScenarios.filter(s => s.system === opts.system);
  const nearScenarios = sameSystem.filter(
    s => dist(s.attackPos, attackPos) <= BLEND_RADIUS,
  );

  if (nearScenarios.length > 0) {
    // IDW 內插球員位置
    const blendedPlayers = idwBlendPlayers(nearScenarios, attackPos);
    // 若攻擊點正好等於某情境點，使用完全自訂值（距離趨近 0 時 IDW 權重極大）
    const shadow = buildBlockShadow(
      attackPos,
      new Set(blendedPlayers.filter(p => p.isBlocking).map(p => p.id)),
      blendedPlayers,
    );
    // 使用最近情境的 zones 或重算
    const nearest = nearScenarios.reduce((b, s) =>
      dist(s.attackPos, attackPos) < dist(b.attackPos, attackPos) ? s : b,
    );
    const nearDist = dist(nearest.attackPos, attackPos);
    // 距離很近時直接用自訂 zones，遠一點重算
    const zones = nearDist < 0.5
      ? nearest.zones
      : buildZones(blendedPlayers, shadow);

    return { players: blendedPlayers, zones, blockShadow: shadow, attackFan };
  }

  // --- 預設幾何計算 ---
  const { blockers, blockerZPositions } = resolveBlockers(attackPos, opts);
  // 教練指定：自由球員替換後排攔中（6 號位）
  const liberoId = 6;
  const sixPos = interpolatePresets(attackPos, opts, blockers, blockerZPositions);
  // 教練指定（2026-07-04）：1、5 號位有身高優勢，防守佔位前移到離網約 4m
  // （＝攻擊線後 1m）；非攔網時 x 直接夾到不深於 4.0（連續、不跳動），z 不變
  for (const idx of [0, 4]) {
    const id = idx + 1;
    if (!blockers.has(id)) {
      const p = sixPos[idx];
      sixPos[idx] = { x: Math.min(p.x, 4.0), z: p.z };
    }
  }
  const rawPlayers = buildPlayers(sixPos, blockers, liberoId);
  const shadow = buildBlockShadow(attackPos, blockers, rawPlayers);
  // shiftOutOfShadow 可能沿扇形軸把球員推深，最後再夾一次確保 1、5 號位 x ≤ 4.0
  const shifted = shiftOutOfShadow(rawPlayers, shadow, axisDir).map(p =>
    (p.id === 1 || p.id === 5) && !p.isBlocking && p.pos.x > 4.0
      ? { ...p, pos: { x: 4.0, z: p.pos.z } }
      : p,
  );
  // 分離重疊：保證任兩名非攔網球員間距 ≥ MIN_SEP（沿 z 推開，不動 x → 1/5 前壓 x≤4 仍成立）
  const players = separateDefenders(shifted);
  const zones = buildZones(players, shadow);

  return { players, zones, blockShadow: shadow, attackFan };
}
