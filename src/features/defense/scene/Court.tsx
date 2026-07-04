import * as THREE from 'three';

// ============================================================
// Court — 場地：地板（我方 / 對方 / 場外緩衝）+ 白色線條
// 座標：網子在 x=0，我方 x ∈ [0,9]，對方 x ∈ [-9,0]，z ∈ [0,9]
// 線條用薄 plane（寬 5cm）貼地 y=0.006，避免與地板 z-fighting
// ============================================================

const LINE_Y = 0.006;
const LINE_WIDTH = 0.05;

// 地板 / 線條材質與幾何（模組層級共用）
const myFloorMaterial = new THREE.MeshBasicMaterial({ color: '#3b4a63' }); // 我方偏藍灰
const oppFloorMaterial = new THREE.MeshBasicMaterial({ color: '#5a4343' }); // 對方偏紅灰
const bufferFloorMaterial = new THREE.MeshBasicMaterial({ color: '#10151d' }); // 場外深色緩衝
const lineMaterial = new THREE.MeshBasicMaterial({ color: '#f5f5f5' });

const halfFloorGeometry = new THREE.PlaneGeometry(9, 9);
const bufferFloorGeometry = new THREE.PlaneGeometry(22, 13); // 四周留 2m 緩衝
/** 沿 x 方向的線（邊線）：局部 x → 世界 x */
const lineAlongXGeometry = new THREE.PlaneGeometry(18 + LINE_WIDTH, LINE_WIDTH);
/** 沿 z 方向的線（底線 / 中線 / 攻擊線）：局部 y → 世界 z */
const lineAlongZGeometry = new THREE.PlaneGeometry(LINE_WIDTH, 9 + LINE_WIDTH);

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** x 座標上所有沿 z 方向的線：底線 ±9、中線 0、攻擊線 ±3 */
const LINES_ALONG_Z = [-9, -3, 0, 3, 9];
/** z 座標上的兩條邊線 */
const LINES_ALONG_X = [0, 9];

export function Court() {
  return (
    <group>
      {/* 場外緩衝地板（稍低避免 z-fighting） */}
      <mesh
        geometry={bufferFloorGeometry}
        material={bufferFloorMaterial}
        rotation={FLAT}
        position={[0, -0.01, 4.5]}
      />

      {/* 我方半場（藍灰） */}
      <mesh
        geometry={halfFloorGeometry}
        material={myFloorMaterial}
        rotation={FLAT}
        position={[4.5, 0, 4.5]}
      />

      {/* 對方半場（紅灰） */}
      <mesh
        geometry={halfFloorGeometry}
        material={oppFloorMaterial}
        rotation={FLAT}
        position={[-4.5, 0, 4.5]}
      />

      {/* 邊線（沿 x，全長 18m） */}
      {LINES_ALONG_X.map(z => (
        <mesh
          key={`side-${z}`}
          geometry={lineAlongXGeometry}
          material={lineMaterial}
          rotation={FLAT}
          position={[0, LINE_Y, z]}
        />
      ))}

      {/* 底線 / 中線 / 3m 攻擊線（沿 z，寬 9m） */}
      {LINES_ALONG_Z.map(x => (
        <mesh
          key={`cross-${x}`}
          geometry={lineAlongZGeometry}
          material={lineMaterial}
          rotation={FLAT}
          position={[x, LINE_Y, 4.5]}
        />
      ))}
    </group>
  );
}
