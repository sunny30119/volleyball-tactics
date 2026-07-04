import * as THREE from 'three';
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTacticsStore } from '../../../store/useTacticsStore';
import { ROLE_LABELS } from '../../../logic/court';
import type { PlayerState, Vec2 } from '../../../types';
import {
  bodyGeometry,
  headGeometry,
  armGeometry,
  hitboxGeometry,
  hitboxMaterial,
  myPlayerMaterial,
  editRingGeometry,
  editRingMaterial,
} from './assets';
import { clamp, dampFactor, useGroundDrag } from './utils';
import type { ControlsRef } from './utils';
import { PlayerLabel } from './PlayerLabel';

// ============================================================
// MyPlayers — 我方六名球員
// - 位置來自 defenseResult（editMode 覆蓋座標優先）
// - useFrame 指數平滑移動（時間常數 0.15s），不瞬移
// - 攔網球員：雙臂上舉方塊表示攔網姿態
// - editMode 時可拖曳（限我方半場），寫入 editOverridePositions
// ============================================================

const SMOOTH_TAU = 0.15;
const DRAG_TAU = 0.04;
const tmpTarget = new THREE.Vector3();

interface MyPlayerUnitProps {
  player: PlayerState;
  displayPos: Vec2;
  label: string;
  editMode: boolean;
  controlsRef: ControlsRef;
}

function MyPlayerUnit({ player, displayPos, label, editMode, controlsRef }: MyPlayerUnitProps) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(displayPos);
  posRef.current = displayPos;

  const { onPointerDown, draggingRef } = useGroundDrag({
    controlsRef,
    onDrag: p => {
      useTacticsStore.getState().setEditOverridePosition(player.id, {
        x: clamp(p.x, 0.3, 8.7),
        z: clamp(p.z, 0.3, 8.7),
      });
    },
  });

  // 首次掛載直接放到目標點（之後全靠平滑移動）
  useLayoutEffect(() => {
    groupRef.current?.position.set(posRef.current.x, 0, posRef.current.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDt) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(rawDt, 0.1);
    const k = dampFactor(draggingRef.current ? DRAG_TAU : SMOOTH_TAU, dt);
    tmpTarget.set(posRef.current.x, 0, posRef.current.z);
    group.position.lerp(tmpTarget, k);
  });

  return (
    <group ref={groupRef} {...(editMode ? { onPointerDown } : {})}>
      {/* 身體 + 頭 */}
      <mesh geometry={bodyGeometry} material={myPlayerMaterial} position={[0, 0.6, 0]} />
      <mesh geometry={headGeometry} material={myPlayerMaterial} position={[0, 1.42, 0]} />

      {/* 攔網姿態：雙臂上舉 */}
      {player.isBlocking && (
        <>
          <mesh geometry={armGeometry} material={myPlayerMaterial} position={[0, 1.8, 0.17]} />
          <mesh geometry={armGeometry} material={myPlayerMaterial} position={[0, 1.8, -0.17]} />
        </>
      )}

      {/* 編輯模式提示圈 + 大判定範圍 */}
      {editMode && (
        <>
          <mesh
            geometry={editRingGeometry}
            material={editRingMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.06, 0]}
            raycast={() => null}
          />
          <mesh geometry={hitboxGeometry} material={hitboxMaterial} position={[0, 1.2, 0]} />
        </>
      )}

      <PlayerLabel text={label} y={player.isBlocking ? 2.55 : 2.15} />
    </group>
  );
}

export function MyPlayers({ controlsRef }: { controlsRef: ControlsRef }) {
  const players = useTacticsStore(s => s.defenseResult?.players ?? null);
  const labelMode = useTacticsStore(s => s.labelMode);
  const editMode = useTacticsStore(s => s.editMode);
  const overrides = useTacticsStore(s => s.editOverridePositions);

  if (!players) return null;

  return (
    <>
      {players.map(player => (
        <MyPlayerUnit
          key={player.id}
          player={player}
          displayPos={overrides[player.id] ?? player.pos}
          label={labelMode === 'number' ? String(player.id) : (ROLE_LABELS[player.role] ?? player.role)}
          editMode={editMode}
          controlsRef={controlsRef}
        />
      ))}
    </>
  );
}
