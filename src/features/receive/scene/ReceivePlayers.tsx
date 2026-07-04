import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReceiveStore } from '../../../store/useReceiveStore';
import { getReceiveFormation, type ReceiveSpot, type PositionNo } from '../../../logic/receive';
import { ROLE_LABELS } from '../../../logic/court';
import { PlayerLabel } from '../../defense/scene/PlayerLabel';
import { useGroundDrag, clamp, type ControlsRef } from '../../defense/scene/utils';
import {
  bodyGeometry,
  headGeometry,
  ringGeometry,
  myPlayerMaterial,
  liberoMaterial,
  setterMaterial,
  passerRingMaterial,
  liberoRingMaterial,
} from './assets';

// ============================================================
// ReceivePlayers — 我方六名球員接發球站位
// - 位置來自 getReceiveFormation(rotation)（可套用 overridePositions）
// - 換輪轉時 useFrame 指數平滑移動（不瞬移）
// - 自由球員亮黃、舉球員青綠、其餘深藍
// - 接發員腳下亮青圈、自由球員腳下黃圈
// ============================================================

const SMOOTH_TAU = 0.18;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
const tmpTarget = new THREE.Vector3();

// 我方半場拖曳邊界（同合法框範圍）
const DRAG_MIN = 0.3;
const DRAG_MAX = 8.7;

function materialFor(spot: ReceiveSpot) {
  if (spot.role === 'L') return liberoMaterial;
  if (spot.role === 'S') return setterMaterial;
  return myPlayerMaterial;
}

interface UnitProps {
  spot: ReceiveSpot;
  label: string;
  controlsRef: ControlsRef;
}

function PlayerUnit({ spot, label, controlsRef }: UnitProps) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(spot.pos);
  posRef.current = spot.pos;

  const setOverridePosition = useReceiveStore(s => s.setOverridePosition);

  // 地面拖曳：寫入該號位的 override（限我方半場），拖曳中即時更新
  const { onPointerDown, draggingRef } = useGroundDrag({
    controlsRef,
    onDrag: (p) => {
      setOverridePosition(spot.positionNo as PositionNo, {
        x: clamp(p.x, DRAG_MIN, DRAG_MAX),
        z: clamp(p.z, DRAG_MIN, DRAG_MAX),
      });
    },
  });

  useFrame((_, rawDt) => {
    const group = groupRef.current;
    if (!group) return;
    // 拖曳中直接吸附到手指，不做平滑（避免落後感）；否則指數平滑
    if (draggingRef.current) {
      group.position.set(posRef.current.x, 0, posRef.current.z);
      return;
    }
    const dt = Math.min(rawDt, 0.1);
    const k = 1 - Math.exp(-dt / SMOOTH_TAU);
    tmpTarget.set(posRef.current.x, 0, posRef.current.z);
    group.position.lerp(tmpTarget, k);
  });

  const mat = materialFor(spot);
  const labelColor = spot.role === 'L' ? '#212121' : '#ffffff';

  return (
    <group ref={groupRef} position={[spot.pos.x, 0, spot.pos.z]}>
      {/* 身體 / 頭部本身即為拖曳把手 */}
      <mesh
        geometry={bodyGeometry}
        material={mat}
        position={[0, 0.6, 0]}
        onPointerDown={onPointerDown}
      />
      <mesh
        geometry={headGeometry}
        material={mat}
        position={[0, 1.42, 0]}
        onPointerDown={onPointerDown}
      />

      {/* 接發員腳下圈：自由球員黃、其餘接發員青 */}
      {spot.isPasser && (
        <mesh
          geometry={ringGeometry}
          material={spot.role === 'L' ? liberoRingMaterial : passerRingMaterial}
          rotation={FLAT}
          position={[0, 0.02, 0]}
        />
      )}

      <PlayerLabel text={label} y={2.15} color={labelColor} />
    </group>
  );
}

export function ReceivePlayers({ controlsRef }: { controlsRef: ControlsRef }) {
  const rotation = useReceiveStore(s => s.rotation);
  const labelMode = useReceiveStore(s => s.labelMode);
  const overrides = useReceiveStore(s => s.overridePositions);

  const formation = useMemo(() => {
    const base = getReceiveFormation(rotation);
    return base.map(s => {
      const o = overrides[s.positionNo];
      return o ? { ...s, pos: o } : s;
    });
  }, [rotation, overrides]);

  return (
    <>
      {formation.map(spot => (
        <PlayerUnit
          key={spot.positionNo}
          spot={spot}
          controlsRef={controlsRef}
          label={
            labelMode === 'number'
              ? String(spot.positionNo)
              : (ROLE_LABELS[spot.role] ?? spot.role)
          }
        />
      ))}
    </>
  );
}
