import type { Vec2 } from '../types';

// ============================================================
// 幾何工具函式
// ============================================================

/** 向量長度 */
export function vecLen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

/** 歸一化向量（零向量回傳 {x:1,z:0}） */
export function normalize(v: Vec2): Vec2 {
  const len = vecLen(v);
  if (len < 1e-9) return { x: 1, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

/** 旋轉 2D 向量（角度單位：度數） */
export function rotateVec(v: Vec2, angleDeg: number): Vec2 {
  const r = angleDeg * (Math.PI / 180);
  return {
    x: v.x * Math.cos(r) - v.z * Math.sin(r),
    z: v.x * Math.sin(r) + v.z * Math.cos(r),
  };
}

/** 兩點距離 */
export function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

/** 兩點線性內插 */
export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/** 將點夾在場地邊界內 [minX, maxX] x [minZ, maxZ] */
export function clampToCourt(
  p: Vec2,
  minX = 0.3,
  maxX = 8.7,
  minZ = 0.3,
  maxZ = 8.7,
): Vec2 {
  return {
    x: Math.max(minX, Math.min(maxX, p.x)),
    z: Math.max(minZ, Math.min(maxZ, p.z)),
  };
}

/**
 * 凸包（Graham Scan）
 * 輸入至少 1 個點，回傳凸包頂點（逆時針順序）。
 * 少於 3 點時回傳原點集（去重後）。
 */
export function convexHull(points: Vec2[]): Vec2[] {
  const unique = dedup(points);
  if (unique.length <= 2) return unique;

  // 找最低點（z 最小，x 次之）
  unique.sort((a, b) => (a.z !== b.z ? a.z - b.z : a.x - b.x));
  const pivot = unique[0];

  // 按極角排序
  const sorted = unique.slice(1).sort((a, b) => {
    const angA = Math.atan2(a.z - pivot.z, a.x - pivot.x);
    const angB = Math.atan2(b.z - pivot.z, b.x - pivot.x);
    if (Math.abs(angA - angB) < 1e-9) {
      return dist(pivot, a) - dist(pivot, b);
    }
    return angA - angB;
  });

  const hull: Vec2[] = [pivot, sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    while (hull.length >= 2) {
      const cross = crossProduct(hull[hull.length - 2], hull[hull.length - 1], sorted[i]);
      if (cross <= 0) hull.pop();
      else break;
    }
    hull.push(sorted[i]);
  }
  return hull;
}

/** 向量叉積（2D，z 分量），正值表示逆時針轉 */
function crossProduct(o: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
}

/** 去除重複點（容差 1e-6） */
function dedup(points: Vec2[]): Vec2[] {
  const result: Vec2[] = [];
  for (const p of points) {
    if (!result.some(r => Math.abs(r.x - p.x) < 1e-6 && Math.abs(r.z - p.z) < 1e-6)) {
      result.push(p);
    }
  }
  return result;
}

/**
 * 判斷點是否在凸多邊形內（射線法，也適用於一般多邊形）
 */
export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    const intersect =
      zi > p.z !== zj > p.z &&
      p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 生成我方半場的網格採樣點（每 step 公尺一個）
 * x ∈ [xMin, xMax]，z ∈ [zMin, zMax]
 */
export function sampleCourtGrid(
  step = 0.5,
  xMin = 0.5,
  xMax = 8.5,
  zMin = 0.5,
  zMax = 8.5,
): Vec2[] {
  const pts: Vec2[] = [];
  for (let x = xMin; x <= xMax + 1e-9; x += step) {
    for (let z = zMin; z <= zMax + 1e-9; z += step) {
      pts.push({ x, z });
    }
  }
  return pts;
}
