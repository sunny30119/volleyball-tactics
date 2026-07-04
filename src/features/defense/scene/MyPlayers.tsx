import * as THREE from 'three';
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTacticsStore } from '../../../store/useTacticsStore';
import { ROLE_LABELS } from '../../../logic/court';
import type { PlayerState } from '../../../types';
import {
  bodyGeometry,
  headGeometry,
  armGeometry,
  hitboxGeometry,
  hitboxMaterial,
  myPlayerMaterial,
} from './assets';
import { clamp, dampFactor, useGroundDrag } from './utils';
import type { ControlsRef } from './utils';
import { PlayerLabel } from './PlayerLabel';

// ============================================================
// MyPlayers — 我方六名球員
// - 位置來自 defenseResult（recompute 已套用手動覆蓋座標）
// - useFrame 指數平滑移動（時間常數 0.15s），不瞬移
// - 攔網球員：雙臂上舉方塊表示攔網姿態
// - 隨時可拖曳（限我方半場），寫入 editOverridePositions
//   → store 即時重算 zones，責任區塊跟著變形
// ============================================================

const SMOOTH_TAU = 0.15;
const DRAG_TAU = 0.04;
const tmpTarget = new THREE.Vector3();

interface MyPlayerUnitProps {
  player: PlayerState;
  label: string;
  controlsRef: ControlsRef;
}

function MyPlayerUnit({ player, label, controlsRef }: MyPlayerUnitProps) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(player.pos);
  posRef.current = player.pos;

  const { onPointerDown, draggingRef } = useGroundDrag({
    controlsRef,
    onDrag: p => {
      // p 為世界座標。呈現層鏡像 worldZ=9−邏輯z，故存回 store 前反向：邏輯z=9−worldZ
      useTacticsStore.getState().setEditOverridePosition(player.id, {
        x: clamp(p.x, 0.3, 8.7),
        z: clamp(9 - p.z, 0.3, 8.7),
      });
    },
  });

  // 首次掛載直接放到目標點（之後全靠平滑移動）
  // 首次掛載直接放到目標點（世界 z = 9 − 邏輯z 鏡像）
  useLayoutEffect(() => {
    groupRef.current?.position.set(posRef.current.x, 0, 9 - posRef.current.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDt) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(rawDt, 0.1);
    const k = dampFactor(draggingRef.current ? DRAG_TAU : SMOOTH_TAU, dt);
    tmpTarget.set(posRef.current.x, 0, 9 - posRef.current.z);
    group.position.lerp(tmpTarget, k);
  });

  return (
    <group ref={groupRef} onPointerDown={onPointerDown}>
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

      {/* 大判定範圍（平板手指友善） */}
      <mesh geometry={hitboxGeometry} material={hitboxMaterial} position={[0, 1.2, 0]} />

      <PlayerLabel text={label} y={player.isBlocking ? 2.55 : 2.15} />
    </group>
  );
}

export function MyPlayers({ controlsRef }: { controlsRef: ControlsRef }) {
  const players = useTacticsStore(s => s.defenseResult?.players ?? null);
  const labelMode = useTacticsStore(s => s.labelMode);

  if (!players) return null;

  return (
    <>
      {players.map(player => (
        <MyPlayerUnit
          key={player.id}
          player={player}
          label={labelMode === 'number' ? String(player.id) : (ROLE_LABELS[player.role] ?? player.role)}
          controlsRef={controlsRef}
        />
      ))}
    </>
  );
}
