import * as THREE from 'three';

// ============================================================
// 功能二共用 geometry / material（模組層級單例，避免每 frame 重建）
// ============================================================

// --- 球員幾何（仿功能一）---
export const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 14);
export const headGeometry = new THREE.SphereGeometry(0.24, 14, 12);
/** 腳下角色標記圈（接發員 / 自由球員） */
export const ringGeometry = new THREE.RingGeometry(0.42, 0.6, 32);

// --- 顏色 ---
export const COLOR_MY = '#1565C0';      // 我方球員深藍
export const COLOR_LIBERO = '#FDD835';  // 自由球員亮黃
export const COLOR_PASSER_RING = '#4FC3F7'; // 接發員腳下圈（亮青）
export const COLOR_SETTER = '#26A69A';  // 舉球員（青綠，突顯插上）

// --- 材質 ---
export const myPlayerMaterial = new THREE.MeshStandardMaterial({
  color: COLOR_MY,
  roughness: 0.6,
});
export const liberoMaterial = new THREE.MeshStandardMaterial({
  color: COLOR_LIBERO,
  roughness: 0.55,
});
export const setterMaterial = new THREE.MeshStandardMaterial({
  color: COLOR_SETTER,
  roughness: 0.6,
});

export const passerRingMaterial = new THREE.MeshBasicMaterial({
  color: COLOR_PASSER_RING,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: false,
});
export const liberoRingMaterial = new THREE.MeshBasicMaterial({
  color: COLOR_LIBERO,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// --- 合法範圍框材質 ---
export const legalZoneFillMaterial = new THREE.MeshBasicMaterial({
  color: '#90caf9',
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide,
  depthWrite: false,
});
export const legalZoneLineMaterial = new THREE.LineBasicMaterial({
  color: '#90caf9',
  transparent: true,
  opacity: 0.7,
});

// --- 插上路徑材質 ---
export const setterPathMaterial = new THREE.LineDashedMaterial({
  color: COLOR_SETTER,
  dashSize: 0.35,
  gapSize: 0.25,
  linewidth: 2,
  transparent: true,
  opacity: 0.95,
});
