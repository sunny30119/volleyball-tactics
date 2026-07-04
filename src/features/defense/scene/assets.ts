import * as THREE from 'three';
import { COLORS, ZONE_COLORS } from '../../../logic/court';

// ============================================================
// 共用 geometry / material（模組層級單例，避免每 frame / 每次
// re-render 重新建立，全場景重複使用以降低平板負擔）
// ============================================================

// --- 球員幾何 ---
export const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 14);
export const headGeometry = new THREE.SphereGeometry(0.24, 14, 12);
export const armGeometry = new THREE.BoxGeometry(0.14, 0.85, 0.14);
/** 透明拖曳判定圓柱（半徑 0.7m，給平板手指用的大判定範圍） */
export const hitboxGeometry = new THREE.CylinderGeometry(0.7, 0.7, 2.4, 10);
/** 持球攻擊者腳下光圈 */
export const activeRingGeometry = new THREE.RingGeometry(0.4, 0.58, 32);
/** 編輯模式我方球員腳下提示圈 */
export const editRingGeometry = new THREE.RingGeometry(0.42, 0.52, 32);

// --- 球員材質 ---
export const myPlayerMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.MY_PLAYER,
  roughness: 0.6,
});
export const opponentMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.OPP_PLAYER,
  roughness: 0.6,
});
export const activeAttackerMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.ACTIVE_ATTACKER,
  emissive: new THREE.Color('#8a0022'),
  emissiveIntensity: 0.55,
  roughness: 0.45,
});
/** 完全不畫像素、只供 raycast 命中的隱形材質 */
export const hitboxMaterial = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
});
export const activeRingMaterial = new THREE.MeshBasicMaterial({
  color: COLORS.ACTIVE_ATTACKER,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: false,
});
export const editRingMaterial = new THREE.MeshBasicMaterial({
  color: '#90caf9',
  transparent: true,
  opacity: 0.8,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// --- 地面圖形材質 ---
export const fanMaterial = new THREE.MeshBasicMaterial({
  color: '#f44336',
  transparent: true,
  opacity: 0.15,
  side: THREE.DoubleSide,
  depthWrite: false,
});
export const blockShadowMaterial = new THREE.MeshBasicMaterial({
  color: '#2b2b2b',
  transparent: true,
  opacity: 0.45,
  side: THREE.DoubleSide,
  depthWrite: false,
});
export const zoneMaterials = ZONE_COLORS.map(
  c =>
    new THREE.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
);
