import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Court } from '../defense/scene/Court';
import { ReceiveNet } from '../receive/scene/ReceiveNet';
import { SetplayTrajectory } from './scene/SetplayTrajectory';
import { SetplayCameraRig, INITIAL_CAMERA_POSITION } from './scene/SetplayCameraRig';
import type { ControlsRef } from './scene/SetplayCameraRig';

// ============================================================
// SetplayScene3D — 功能三 3D 舉球送球場景
//   場地             → 重用 defense/scene/Court
//   球網（固定 2.30）→ 重用 receive/scene/ReceiveNet
//   舉球員/攻擊手/軌跡/球 → SetplayTrajectory
//   相機（四視角）   → SetplayCameraRig（讀 useSetplayStore）
// ============================================================

export function SetplayScene3D() {
  const controlsRef: ControlsRef = useRef(null);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: INITIAL_CAMERA_POSITION, fov: 50, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows={false}
      style={{ width: '100%', height: '100%', background: '#0a1628', touchAction: 'none' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 14, 5]} intensity={1.6} />

      <Court />
      <ReceiveNet />
      <SetplayTrajectory />
      <SetplayCameraRig controlsRef={controlsRef} />
    </Canvas>
  );
}
