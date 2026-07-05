import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSetplayStore } from '../../../store/useSetplayStore';
import { DEFAULT_ORIGIN, roleLabel } from '../../../logic/setplay';
import type { AttackerRole } from '../../../logic/setplay';
import { PlayerLabel } from '../../defense/scene/PlayerLabel';

// ============================================================
// SetplayTrajectory — 舉球員標記、攻擊手標記、軌跡線、球動畫
//   所有邏輯座標 z → 世界 worldZ = 9 − z（呈現層水平鏡像，同其他分頁）。
// ============================================================

const MIRROR = (z: number) => 9 - z;

/** 各攻擊手角色顏色 */
const ROLE_COLOR: Record<AttackerRole, string> = {
  OH: '#FF7043', // 主攻 橙紅
  MB: '#66BB6A', // 攔中 綠
  OP: '#AB47BC', // 輔舉 紫
  BACK: '#FFA726', // 後排 橙
};

const SETTER_COLOR = '#42A5F5';

// 共用幾何 / 材質
const markerGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.8, 16);
const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
const ballGeo = new THREE.SphereGeometry(0.13, 20, 20);
const ballMat = new THREE.MeshStandardMaterial({
  color: '#ffee58',
  emissive: '#f9a825',
  emissiveIntensity: 0.35,
  roughness: 0.4,
});
const contactRingGeo = new THREE.RingGeometry(0.32, 0.42, 28);
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

function PersonMarker({
  x,
  z,
  color,
  label,
  showLabel,
}: {
  x: number;
  z: number;
  color: string;
  label: string;
  showLabel: boolean;
}) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
    [color],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const wz = MIRROR(z);
  return (
    <group position={[x, 0, wz]}>
      <mesh geometry={markerGeo} material={mat} position={[0, 0.9, 0]} />
      <mesh geometry={headGeo} material={mat} position={[0, 1.95, 0]} />
      {showLabel && <PlayerLabel text={label} y={2.5} color={color} fontSize={26} />}
    </group>
  );
}

export function SetplayTrajectory() {
  const trajectory = useSetplayStore(s => s.trajectory);
  const current = useSetplayStore(s => s.current);
  const role = useSetplayStore(s => s.role);
  const playing = useSetplayStore(s => s.playing);
  const labelMode = useSetplayStore(s => s.labelMode);

  const ballRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0); // 動畫進度 0..1

  // 軌跡線 geometry（世界座標，含鏡像）
  const lineGeometry = useMemo(() => {
    const pts = trajectory.points3D.map(p => new THREE.Vector3(p.x, p.y, MIRROR(p.z)));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [trajectory]);

  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  const lineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#FDD835', transparent: true, opacity: 0.95 }),
    [],
  );
  useEffect(() => () => lineMaterial.dispose(), [lineMaterial]);

  // 軌跡改變時，把球重設到起點
  useEffect(() => {
    tRef.current = 0;
  }, [trajectory]);

  useFrame((_, rawDt) => {
    const ball = ballRef.current;
    if (!ball) return;
    const pts = trajectory.points3D;
    if (pts.length === 0) return;

    if (playing) {
      const dt = Math.min(rawDt, 0.1);
      const ft = Math.max(trajectory.flightTime, 0.2);
      // 一次飛行 + 短暫停頓後循環
      tRef.current += dt / (ft + 0.5);
      if (tRef.current > 1) tRef.current = 0;
    }

    // 依 tRef 取樣（線性內插相鄰兩點）
    const t = Math.min(tRef.current, 1);
    const fi = t * (pts.length - 1);
    const i0 = Math.floor(fi);
    const i1 = Math.min(i0 + 1, pts.length - 1);
    const frac = fi - i0;
    const a = pts[i0];
    const b = pts[i1];
    ball.position.set(
      a.x + (b.x - a.x) * frac,
      a.y + (b.y - a.y) * frac,
      MIRROR(a.z) + (MIRROR(b.z) - MIRROR(a.z)) * frac,
    );
  });

  const origin = DEFAULT_ORIGIN;
  const contactX = current.role === 'BACK' ? current.contact.x : current.offNet;
  const contactZ = current.contact.z;
  const showLabel = labelMode === 'role';

  return (
    <group>
      {/* 軌跡線 */}
      <primitive object={new THREE.Line(lineGeometry, lineMaterial)} />

      {/* 舉球員（藍，設球點） */}
      <PersonMarker
        x={origin.x}
        z={origin.z}
        color={SETTER_COLOR}
        label="舉球"
        showLabel={showLabel}
      />

      {/* 攻擊手（依角色上色，擊球點） */}
      <PersonMarker
        x={contactX}
        z={contactZ}
        color={ROLE_COLOR[role]}
        label={roleLabel(role)}
        showLabel={showLabel}
      />

      {/* 擊球落點地面圈 */}
      <mesh
        geometry={contactRingGeo}
        rotation={FLAT}
        position={[contactX, 0.02, MIRROR(contactZ)]}
      >
        <meshBasicMaterial color={ROLE_COLOR[role]} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* 飛行的球 */}
      <mesh ref={ballRef} geometry={ballGeo} material={ballMat} />
    </group>
  );
}
