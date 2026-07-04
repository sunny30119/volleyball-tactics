import * as THREE from 'three';
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTacticsStore } from '../../../store/useTacticsStore';
import type { Attacker } from '../../../types';
import {
  bodyGeometry,
  headGeometry,
  hitboxGeometry,
  hitboxMaterial,
  opponentMaterial,
  activeAttackerMaterial,
  activeRingGeometry,
  activeRingMaterial,
} from './assets';
import { clamp, dampFactor, useGroundDrag } from './utils';
import type { ControlsRef } from './utils';
import { PlayerLabel } from './PlayerLabel';

// ============================================================
// Attackers — 對方攻擊手（可拖曳，核心互動）
// - pointerdown 即切換 activeAttacker 並開始拖曳
// - 拖曳中每次 pointermove 即時 moveAttacker → store recompute
// - 位置限制對方半場 x ∈ [-8.7, -0.3]、z ∈ [0.3, 8.7]
// - 持球攻擊者：亮紅材質 + 腳下光圈（微脈動）
// ============================================================

const SMOOTH_TAU = 0.15;
const DRAG_TAU = 0.04;
const tmpTarget = new THREE.Vector3();

interface AttackerUnitProps {
  attacker: Attacker;
  controlsRef: ControlsRef;
}

function AttackerUnit({ attacker, controlsRef }: AttackerUnitProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const posRef = useRef(attacker.pos);
  posRef.current = attacker.pos;

  const { onPointerDown, draggingRef } = useGroundDrag({
    controlsRef,
    onStart: () => {
      const state = useTacticsStore.getState();
      // 點選（或開始拖曳）非持球攻擊手 → 切換 activeAttacker
      if (state.activeAttackerId !== attacker.id) {
        state.setActiveAttacker(attacker.id);
      }
    },
    onDrag: p => {
      // p 為世界座標。呈現層鏡像 worldZ=9−邏輯z，故存回 store 前反向：邏輯z=9−worldZ
      useTacticsStore.getState().moveAttacker(attacker.id, {
        x: clamp(p.x, -8.7, -0.3),
        z: clamp(9 - p.z, 0.3, 8.7),
      });
    },
  });

  // 世界 z = 9 − 邏輯z 鏡像
  useLayoutEffect(() => {
    groupRef.current?.position.set(posRef.current.x, 0, 9 - posRef.current.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock }, rawDt) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(rawDt, 0.1);
    // 拖曳中緊跟手指（tau 0.04s），放開後回到一般平滑（0.15s）
    const k = dampFactor(draggingRef.current ? DRAG_TAU : SMOOTH_TAU, dt);
    tmpTarget.set(posRef.current.x, 0, 9 - posRef.current.z);
    group.position.lerp(tmpTarget, k);

    // 持球光圈微脈動
    const ring = ringRef.current;
    if (ring) {
      const s = 1 + 0.08 * Math.sin(clock.elapsedTime * 3.5);
      ring.scale.set(s, s, 1);
    }
  });

  const material = attacker.isActive ? activeAttackerMaterial : opponentMaterial;

  return (
    <group ref={groupRef} onPointerDown={onPointerDown}>
      <mesh geometry={bodyGeometry} material={material} position={[0, 0.6, 0]} />
      <mesh geometry={headGeometry} material={material} position={[0, 1.42, 0]} />

      {/* 大判定範圍（平板手指友善） */}
      <mesh geometry={hitboxGeometry} material={hitboxMaterial} position={[0, 1.2, 0]} />

      {/* 持球攻擊者腳下光圈 */}
      {attacker.isActive && (
        <mesh
          ref={ringRef}
          geometry={activeRingGeometry}
          material={activeRingMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.07, 0]}
          raycast={() => null}
        />
      )}

      <PlayerLabel
        text={attacker.isActive ? '攻擊' : '攻'}
        y={2.15}
        color={attacker.isActive ? '#ff8a80' : '#ef9a9a'}
        fontSize={24}
      />
    </group>
  );
}

export function Attackers({ controlsRef }: { controlsRef: ControlsRef }) {
  const attackers = useTacticsStore(s => s.attackers);
  return (
    <>
      {attackers.map(attacker => (
        <AttackerUnit key={attacker.id} attacker={attacker} controlsRef={controlsRef} />
      ))}
    </>
  );
}
