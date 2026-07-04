import * as THREE from 'three';
import { useMemo } from 'react';

// ============================================================
// ReceiveNet — 固定網高 2.30m 的球網（功能二不需切換網高）
// 仿功能一 Net 寫法，但不依賴 useTacticsStore（本功能獨立 store）
// ============================================================

const NET_HEIGHT = 2.3;

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

export function ReceiveNet() {
  const gridGeometry = useMemo(() => {
    const yTop = NET_HEIGHT;
    const yBottom = NET_HEIGHT - 1;
    const vertices: number[] = [];
    for (let z = 0; z <= 9 + 1e-6; z += 0.45) {
      vertices.push(0, yBottom, z, 0, yTop, z);
    }
    for (let y = yBottom; y <= yTop + 1e-6; y += 0.2) {
      vertices.push(0, y, 0, 0, y, 9);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  const postHeight = NET_HEIGHT + 0.1;

  return (
    <group>
      <mesh
        geometry={netPlaneGeometry}
        material={netPlaneMaterial}
        rotation={[0, Math.PI / 2, 0]}
        position={[0, NET_HEIGHT - 0.5, 4.5]}
      />
      <lineSegments geometry={gridGeometry} material={netGridMaterial} />
      <mesh geometry={topBandGeometry} material={topBandMaterial} position={[0, NET_HEIGHT - 0.035, 4.5]} />
      <mesh geometry={postGeometry} material={postMaterial} scale={[1, postHeight, 1]} position={[0, postHeight / 2, -0.5]} />
      <mesh geometry={postGeometry} material={postMaterial} scale={[1, postHeight, 1]} position={[0, postHeight / 2, 9.5]} />
    </group>
  );
}
