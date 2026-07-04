import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useTacticsStore } from '../../../store/useTacticsStore';

// ============================================================
// Net — 球網：高度依 store.netHeight（2.24 / 2.30 / 2.43）
// 網面 1m 高半透明 + 格線 + 上緣白帶 + 兩側網柱
// 網高改變頻率低，格線 geometry 用 useMemo 依 netHeight 重建
// ============================================================

const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 10);
const postMaterial = new THREE.MeshStandardMaterial({ color: '#78909c', roughness: 0.5 });
const netPlaneGeometry = new THREE.PlaneGeometry(9, 1);
const netPlaneMaterial = new THREE.MeshBasicMaterial({
  color: '#cfd8dc',
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const netGridMaterial = new THREE.LineBasicMaterial({
  color: '#eceff1',
  transparent: true,
  opacity: 0.55,
});
const topBandGeometry = new THREE.BoxGeometry(0.03, 0.07, 9);
const topBandMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });

export function Net() {
  const netHeight = useTacticsStore(s => s.netHeight);

  // 網面格線（x=0 平面上的 LineSegments）
  const gridGeometry = useMemo(() => {
    const yTop = netHeight;
    const yBottom = netHeight - 1;
    const vertices: number[] = [];
    // 直線（沿高度）每 0.45m
    for (let z = 0; z <= 9 + 1e-6; z += 0.45) {
      vertices.push(0, yBottom, z, 0, yTop, z);
    }
    // 橫線每 0.2m
    for (let y = yBottom; y <= yTop + 1e-6; y += 0.2) {
      vertices.push(0, y, 0, 0, y, 9);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, [netHeight]);

  useEffect(() => {
    return () => {
      gridGeometry.dispose();
    };
  }, [gridGeometry]);

  const postHeight = netHeight + 0.1;

  return (
    <group>
      {/* 網面（半透明） */}
      <mesh
        geometry={netPlaneGeometry}
        material={netPlaneMaterial}
        rotation={[0, Math.PI / 2, 0]}
        position={[0, netHeight - 0.5, 4.5]}
      />

      {/* 網面格線 */}
      <lineSegments geometry={gridGeometry} material={netGridMaterial} />

      {/* 網上緣白帶 */}
      <mesh
        geometry={topBandGeometry}
        material={topBandMaterial}
        position={[0, netHeight - 0.035, 4.5]}
      />

      {/* 兩側網柱（場外 0.5m） */}
      <mesh
        geometry={postGeometry}
        material={postMaterial}
        scale={[1, postHeight, 1]}
        position={[0, postHeight / 2, -0.5]}
      />
      <mesh
        geometry={postGeometry}
        material={postMaterial}
        scale={[1, postHeight, 1]}
        position={[0, postHeight / 2, 9.5]}
      />
    </group>
  );
}
