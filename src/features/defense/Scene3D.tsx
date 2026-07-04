import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Court } from './scene/Court';
import { Net } from './scene/Net';
import { GroundOverlays } from './scene/GroundOverlays';
import { MyPlayers } from './scene/MyPlayers';
import { Attackers } from './scene/Attackers';
import { CameraRig, INITIAL_CAMERA_POSITION } from './scene/CameraRig';
import type { ControlsRef } from './scene/utils';

// ============================================================
// Scene3D — 3D 戰術場景
//   場地 / 球網        → scene/Court.tsx, scene/Net.tsx
//   我方球員（可編輯） → scene/MyPlayers.tsx
//   對方攻擊手（拖曳） → scene/Attackers.tsx
//   地面圖形（扇形 / 責任區塊 / 攔網影子）→ scene/GroundOverlays.tsx
//   相機（四視角平滑過渡 + OrbitControls）→ scene/CameraRig.tsx
// 效能：dpr 上限 1.75、單一平行光、無陰影、geometry/material 共用
// ============================================================

export function Scene3D() {
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
      <Net />
      <GroundOverlays />
      <MyPlayers controlsRef={controlsRef} />
      <Attackers controlsRef={controlsRef} />
      <CameraRig controlsRef={controlsRef} />
    </Canvas>
  );
}
